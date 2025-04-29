import Module from 'manifold-3d';
import { exportTo3MF } from './export';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();
const { Manifold, CrossSection } = wasm;

// PSU dimensions
const PSU_DEPTH = 20;
const PSU_WIDTH = 35;
const BRACKET_THICKNESS = 1;
const MOUNTING_HOLE_DIAMETER = 3.5;
const MOUNTING_HOLE_OFFSET = 5;

// Create the mounting ears
const earWidth = 10;
const earHeight = BRACKET_THICKNESS;
const earDepth = PSU_DEPTH + BRACKET_THICKNESS * 2;

const leftEar = Manifold.cube(earWidth, earDepth, earHeight)
  .translate(-earWidth, 0, 0);

const rightEar = Manifold.cube(earWidth, earDepth, earHeight)
  .translate(PSU_WIDTH + BRACKET_THICKNESS * 2, 0, 0);

// Create mounting holes
const hole = Manifold.cylinder(
  BRACKET_THICKNESS,
  MOUNTING_HOLE_DIAMETER / 2,
  0,  // No rounding
  0   // No segments
);


type BracketParams = {
  width: number;
  depth: number;
  height: number;
  holeDiameter: number;
  earWidth: number;
  bracketThickness: number;
  ribbingThickness: number;
  ribbingCount: number;
  hasBottom: boolean;
}

// Function to create the bracket with given parameters
export function createBracket(params: BracketParams) {
  // Create the main bracket body
  const BRACKET_THICKNESS = params.bracketThickness;
  const HEIGHT_WITH_THICKNESS = params.height + BRACKET_THICKNESS;
  const WIDTH_WITH_THICKNESS = params.width + BRACKET_THICKNESS * 2;
  const HOLE_DIAMETER = Math.min(params.holeDiameter, (params.earWidth / 2) - 1, (params.depth / 2) - 1);

  const mainBody = Manifold.cube(
    [params.width + BRACKET_THICKNESS * 2,
    params.height + BRACKET_THICKNESS * 2,
    params.depth]
  );

  const cutOut = Manifold.cube([params.width, params.height + BRACKET_THICKNESS, params.depth]).translate([0, BRACKET_THICKNESS, params.hasBottom ? -BRACKET_THICKNESS : 0]).translate([BRACKET_THICKNESS, 0, 0])

  const shell = Manifold.difference(mainBody, cutOut);

  // Create mounting ears
  const ear = Manifold.cube([params.earWidth, BRACKET_THICKNESS, params.depth]);

  const ribbingSpacing = calculateSpacing({
    availableWidth: params.depth,
    itemWidth: params.ribbingThickness,
    itemCount: params.ribbingCount,
  });

  // Create contour for the ribbing
  const RIBBING_WIDTH = params.earWidth * 0.5; // 80% of the ear width
  const RIBBING_HEIGHT = HEIGHT_WITH_THICKNESS * 0.8; // 80% of the height
  const contour = new CrossSection([
    [0, RIBBING_HEIGHT],
    [RIBBING_WIDTH, RIBBING_HEIGHT],
    [RIBBING_WIDTH, 0],
  ], 'Negative');
  const singleRib = contour.extrude(params.ribbingThickness);
  const ribbings = ribbingSpacing.map(spacing => singleRib.translate([RIBBING_WIDTH, -RIBBING_HEIGHT, spacing]));

  // Put the ears together
  const hole = Manifold.cylinder(BRACKET_THICKNESS + RIBBING_HEIGHT, HOLE_DIAMETER, HOLE_DIAMETER, 100).rotate([0, 90, 90]).translate([params.earWidth / 2, -RIBBING_HEIGHT + BRACKET_THICKNESS, params.depth / 2]);
  let earItem = Manifold.union([ear, ...params.ribbingCount > 0 ? ribbings : []]);
  if (HOLE_DIAMETER) earItem = earItem.subtract(hole);
  const leftEar = earItem.translate([-params.earWidth, HEIGHT_WITH_THICKNESS, 0]);
  const rightEar = leftEar.mirror([1, 0, 0]).translate([params.width + params.bracketThickness * 2, 0, 0]);
  return Manifold.union([shell, leftEar, rightEar]);
}


function calculateSpacing({
  availableWidth,
  itemWidth,
  itemCount,
}: {
  availableWidth: number;
  itemWidth: number;
  itemCount: number;
}) {
  if (itemCount <= 1) return [0];

  // Calculate the total space needed for all items
  const totalItemWidth = itemWidth * itemCount;

  // Calculate the total space between items, accounting for insets
  const totalSpacing = availableWidth - totalItemWidth - (itemWidth * 2); // Subtract space for insets

  // Calculate the space between each item
  const spacingBetweenItems = totalSpacing / (itemCount - 1);

  // Calculate the starting position of each item
  const positions = [];
  for (let i = 0; i < itemCount; i++) {
    // First item starts at itemWidth (inset by one thickness)
    // Each subsequent item is spaced by (itemWidth + spacingBetweenItems)
    const startPosition = itemWidth + i * (itemWidth + spacingBetweenItems);
    positions.push(startPosition);
  }

  return positions;
}
