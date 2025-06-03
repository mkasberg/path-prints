import { exportTo3MF } from './export';
import { setupPreview } from "./preview";
import { createGpxMiniature, defaultParams } from "./gpx-miniature";

interface GpxMiniatureParams {
  title: string;
  fontSize: number;
  outBack: number;
  mapRotation: number;
  elevationValues: number[];
  latLngValues: [number, number][];
  width: number;
  plateDepth: number;
  thickness: number;
  textThickness: number;
  margin: number;
  maxPolylineHeight: number;
  color: string;
}

// Initialize the preview
const canvas = document.getElementById("preview") as HTMLCanvasElement;
const updateMiniature = setupPreview(canvas);
// Render initial preview with default params
updateMiniature(defaultParams);

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
  // trigger an input event to update the values
  const event = new Event('input', { bubbles: true });
  controls.dispatchEvent(event);
}

// Enable URL state restoration
restoreState();

const exportButton = document.getElementById("export-button") as HTMLButtonElement;
exportButton.addEventListener("click", async  () => {
  const params = {
    ...defaultParams,
    ...parseFormData(new FormData(controls))
  };
  const model = createGpxMiniature(params);
  const dimensions = `${params.width}x${params.plateDepth}x${params.thickness}`;
  const blob = await exportTo3MF(model, dimensions);
  const url = URL.createObjectURL(blob);
  // download the blob
  const a = document.createElement("a");
  a.href = url;
  a.download = `gpx-miniature-${dimensions}.3mf`;
  a.click();
});