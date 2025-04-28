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
  holeOffset: number;
  earWidth: number;
}

// Initialize the preview
const canvas = document.getElementById("preview") as HTMLCanvasElement;
const updateBracket = setupPreview(canvas);

// Get all range inputs
const inputs = {
  width: document.getElementById("width") as HTMLInputElement,
  depth: document.getElementById("depth") as HTMLInputElement,
  height: document.getElementById("height") as HTMLInputElement,
  "bracket-thickness": document.getElementById("bracket-thickness") as HTMLInputElement,
  "ribbing-count": document.getElementById("ribbing-count") as HTMLInputElement,
  "ribbing-thickness": document.getElementById("ribbing-thickness") as HTMLInputElement,
  "hole-diameter": document.getElementById("hole-diameter") as HTMLInputElement,
  "ear-width": document.getElementById("ear-width") as HTMLInputElement,
};

// Get all value displays
const displays = {
  width: document.getElementById("width-value") as HTMLDivElement,
  depth: document.getElementById("depth-value") as HTMLDivElement,
  height: document.getElementById("height-value") as HTMLDivElement,
  "bracket-thickness": document.getElementById("bracket-thickness-value") as HTMLDivElement,
  "ribbing-count": document.getElementById("ribbing-count-value") as HTMLDivElement,
  "ribbing-thickness": document.getElementById("ribbing-thickness-value") as HTMLDivElement,
  "hole-diameter": document.getElementById("hole-diameter-value") as HTMLDivElement,
  "ear-width": document.getElementById("ear-width-value") as HTMLDivElement,
};


function getParams(): BracketParams {
  const params: BracketParams = {
    width: parseFloat(inputs.width.value),
    depth: parseFloat(inputs.depth.value),
    height: parseFloat(inputs.height.value),
    bracketThickness: parseFloat(inputs["bracket-thickness"].value),
    ribbingCount: parseInt(inputs["ribbing-count"].value),
    ribbingThickness: parseFloat(inputs["ribbing-thickness"].value),
    holeDiameter: parseFloat(inputs["hole-diameter"].value),
    holeOffset: 5, // Default value from psu-bracket.ts
    earWidth: parseFloat(inputs["ear-width"].value),
  };
  return params;
}

// Function to update the bracket
function update(): void {
  const params = getParams();
  updateBracket(params);
}

// Add event listeners to all inputs
Object.entries(inputs).forEach(([key, input]) => {
  input.addEventListener("input", () => {
    displays[key].textContent = `${input.value}mm`;
    update();
  });
  displays[key].textContent = `${input.value}mm`;
});

// Initial update
update();

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
