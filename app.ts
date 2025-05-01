import { exportTo3MF } from './export';
import { setupPreview } from "./preview";
import { createBracket, defaultParams } from "./psu-bracket";

interface BracketParams {
  width: number;
  depth: number;
  height: number;
  bracketThickness: number;
  ribbingCount: number;
  ribbingThickness: number;
  holeDiameter: number;
  earWidth: number;
  hasBottom: boolean;
}

// Initialize the preview
const canvas = document.getElementById("preview") as HTMLCanvasElement;
const updateBracket = setupPreview(canvas);

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
  return params as BracketParams;
}


function displayValues(params: BracketParams) {
  for(const input of inputs) {
    const label = input.nextElementSibling as HTMLDivElement;
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
  const params = parseFormData(data);
  displayValues(params);
  updateBracket(params);
}

function updateUrl() {
  const data = new FormData(controls);
  const url = new URLSearchParams(data);
  history.pushState({}, '', `?${url.toString()}`);
}


controls.addEventListener("input", handleInput);
controls.addEventListener("change", updateUrl);

// On page load, check if there is a url param and parse it
function restoreState() {

  const url = new URLSearchParams(window.location.search);
  const params = {
    defaultParams,
    ...parseFormData(url)
  }
  // Merge in any defaults
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


restoreState();


const exportButton = document.getElementById("export-button") as HTMLButtonElement;
exportButton.addEventListener("click", async  () => {
  const params = parseFormData(new FormData(controls));
  const model = createBracket(params);
  const dimensions = `${params.width}x${params.depth}x${params.height}`;
  const blob = await exportTo3MF(model, dimensions);
  const url = URL.createObjectURL(blob);
  // download the blob
  const a = document.createElement("a");
  a.href = url;
  a.download = `bracket-${dimensions}.3mf`;
  a.click();
});
