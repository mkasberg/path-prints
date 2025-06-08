import { exportTo3MF } from './export';
import { setupPreview } from "./preview";
import { createGpxMiniature, defaultParams, GpxMiniatureParams } from "./gpx-miniature";

const MAX_GPX_POINTS = 200;

// Initialize the preview
const canvas = document.getElementById("preview") as HTMLCanvasElement;
const updateMiniature = setupPreview(canvas);

const controls = document.querySelector<HTMLFormElement>("#controls");

// Get all range inputs
const inputs = Array.from(controls?.querySelectorAll<HTMLInputElement>("input") ?? []).filter(input => !input.classList.contains('value-display'));
// todo - I have a tip somewhere on an easy way to split this into two arrays
const displayInputs = Array.from(controls?.querySelectorAll<HTMLInputElement>("input") ?? []).filter(input => input.classList.contains('value-display'));


function parseFormData(data: FormData) {
  const params: Record<string, any> = {};
  for(const [key, value] of data.entries()) {
    // First see if it's a checkbox
    if(value === "on") {
      params[key] = true;
    } else {
      const maybeNumber = parseFloat(value);
      params[key] = isNaN(maybeNumber) ? value : maybeNumber;
    }
  }
  return params as GpxMiniatureParams;
}


function displayValues(params: GpxMiniatureParams) {
  for(const input of inputs) {
    const label = input.nextElementSibling as HTMLInputElement;
    const unit = input.getAttribute("data-unit") ?? 'mm';
    if(label && label.classList.contains('value-display')) {
      label.value = `${input.value}`;
    }
  }
  // Also pop the color on the root so we can use in css
  document.documentElement.style.setProperty('--color', params.color);
}

function handleInput(e: Event) {
  // If someone types into a valueDisplay, update the input
  if(e.target.classList.contains('value-display')) {
    const input = e.target.previousElementSibling as HTMLInputElement;
    input.value = e.target.value;
  }
  const data = new FormData(controls);
  const params = {
    ...defaultParams,
    ...parseFormData(data)
  };
  displayValues(params);
  updateMiniature(params);
}

function updateUrl() {
  const data = new FormData(controls);
  const url = new URLSearchParams(data);
  history.pushState({}, '', `?${url.toString()}`);
}

// Enable form handling
controls.addEventListener("input", handleInput);
controls.addEventListener("change", updateUrl);

// On page load, check if there is a url param and parse it
function restoreState() {
  const url = new URLSearchParams(window.location.search);
  const params = {
    ...defaultParams,
    ...parseFormData(url)
  };
  // Restore any params from the URL
  for(const [key, value] of Object.entries(params)) {
    const input = document.getElementById(key) as HTMLInputElement;
    if(input) {
      input.value = value.toString();
    }
  }
  // Update display values and miniature directly instead of triggering an input event
  displayValues(params);
  updateMiniature(params);
}

// Enable URL state restoration
restoreState();

// GPX file handling
const gpxFileInput = document.getElementById('gpxFile') as HTMLInputElement;
const importGpxButton = document.getElementById('importGpxButton') as HTMLButtonElement;

importGpxButton.addEventListener('click', () => {
  gpxFileInput.click();
});

gpxFileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');

  // Get all track points using local-name()
  const trackPoints = xmlDoc.evaluate(
    '//*[local-name()="trkpt"]',
    xmlDoc,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  const latLngValues: [number, number][] = [];
  const elevationValues: number[] = [];

  // Extract lat/lon and elevation data
  for (let i = 0; i < trackPoints.snapshotLength; i++) {
    const trkpt = trackPoints.snapshotItem(i) as Element;
    const lat = parseFloat(trkpt.getAttribute('lat'));
    const lon = parseFloat(trkpt.getAttribute('lon'));
    const ele = parseFloat(trkpt.querySelector('ele')?.textContent || '0');

    if (!isNaN(lat) && !isNaN(lon) && !isNaN(ele)) {
      latLngValues.push([lat, lon]);
      elevationValues.push(ele);
    }
  }

  // Trim arrays if they exceed MAX_GPX_POINTS
  if (latLngValues.length > MAX_GPX_POINTS) {
    // TODO we might be able to use a better algorithm here than the LLM came up with
    const step = Math.floor(latLngValues.length / MAX_GPX_POINTS);
    const trimmedLatLng = latLngValues.filter((_, i) => i % step === 0).slice(0, MAX_GPX_POINTS);
    const trimmedElevation = elevationValues.filter((_, i) => i % step === 0).slice(0, MAX_GPX_POINTS);

    // Update the params with trimmed data
    const data = new FormData(controls);
    const params = {
      ...defaultParams,
      ...parseFormData(data),
      latLngValues: trimmedLatLng,
      elevationValues: trimmedElevation
    };

    updateMiniature(params);
  } else {
    // Update the params with the original data
    const data = new FormData(controls);
    const params = {
      ...defaultParams,
      ...parseFormData(data),
      latLngValues,
      elevationValues
    };

    updateMiniature(params);
  }
});

const exportButton = document.getElementById("export-button") as HTMLButtonElement;
exportButton.addEventListener("click", async  () => {
  const params = {
    ...defaultParams,
    ...parseFormData(new FormData(controls))
  };
  const model = await createGpxMiniature(params);
  const dimensions = `${params.width}x${params.plateDepth}x${params.thickness}`;
  const blob = await exportTo3MF(model, dimensions);
  const url = URL.createObjectURL(blob);
  // download the blob
  const a = document.createElement("a");
  a.href = url;
  a.download = `gpx-miniature-${dimensions}.3mf`;
  a.click();
});
