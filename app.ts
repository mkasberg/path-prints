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
const inputs = Array.from(controls?.querySelectorAll<HTMLInputElement>("input") ?? []);


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
  console.log(params);
  return params as BracketParams;
}


function displayValues(params: BracketParams) {
  for(const input of inputs) {
    const label = input.nextElementSibling as HTMLDivElement;
    const unit = input.getAttribute("data-unit") ?? 'mm';
    if(label && label.classList.contains('value-display')) {
      label.textContent = `${input.value}${unit}`;
    }
  }
  // Also pop the color on the root so we can use in css
  document.documentElement.style.setProperty('--color', params.color);
}

function handleInput(e: Event) {
  const data = new FormData(controls);
  const params = parseFormData(data);
  displayValues(params);
  updateBracket(params);
}

controls.addEventListener("input", handleInput);
handleInput(); // initial update


const exportButton = document.getElementById("export-button") as HTMLButtonElement;
exportButton.addEventListener("click", async  () => {
  const params = getParams();
  const model = createBracket(params);
  const blob = await exportTo3MF(model);
  const url = URL.createObjectURL(blob);
  // download the blob
  const a = document.createElement("a");
  a.href = url;
  a.download = "bracket.3mf";
  a.click();
});
