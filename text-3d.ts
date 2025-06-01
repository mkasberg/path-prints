import Module from 'manifold-3d';
import opentype from 'opentype.js';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();
const { Manifold, CrossSection } = wasm;

// Default font URL - using a reliable open-source font
const DEFAULT_FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/static/Roboto-Regular.ttf';

interface TextOptions {
  fontSize?: number;
  thickness?: number;
  fontUrl?: string;
}

// Helper function to load a font
async function loadFont(fontUrl: string = DEFAULT_FONT_URL): Promise<opentype.Font> {
  try {
    return await opentype.load(fontUrl);
  } catch (error) {
    console.error('Error loading font:', error);
    throw new Error(`Failed to load font from ${fontUrl}`);
  }
}

// Helper function to flatten a bezier curve into line segments
function flattenCurve(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  flatness: number = 0.1,
  points: [number, number][] = []
): [number, number][] {
  // Calculate the maximum distance between the curve and its control points
  const ux = 3 * x1 - 2 * x0 - x3;
  const uy = 3 * y1 - 2 * y0 - y3;
  const vx = 3 * x2 - 2 * x3 - x0;
  const vy = 3 * y2 - 2 * y3 - y0;
  
  const maxDistance = Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy);
  
  if (maxDistance <= flatness) {
    points.push([x3, y3]);
    return points;
  }
  
  // Split the curve at t=0.5
  const x01 = (x0 + x1) / 2;
  const y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2;
  const y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2;
  const y23 = (y2 + y3) / 2;
  
  const x012 = (x01 + x12) / 2;
  const y012 = (y01 + y12) / 2;
  const x123 = (x12 + x23) / 2;
  const y123 = (y12 + y23) / 2;
  
  const x0123 = (x012 + x123) / 2;
  const y0123 = (y012 + y123) / 2;
  
  // Recursively flatten both halves
  flattenCurve(x0, y0, x01, y01, x012, y012, x0123, y0123, flatness, points);
  flattenCurve(x0123, y0123, x123, y123, x23, y23, x3, y3, flatness, points);
  
  return points;
}

// Helper function to convert a path to points
function pathToPoints(path: opentype.Path): [number, number][] {
  const points: [number, number][] = [];
  let currentX = 0;
  let currentY = 0;

  path.commands.forEach(cmd => {
    switch (cmd.type) {
      case 'M': // moveTo
        currentX = cmd.x;
        currentY = cmd.y;
        points.push([currentX, currentY]);
        break;
      case 'L': // lineTo
        currentX = cmd.x;
        currentY = cmd.y;
        points.push([currentX, currentY]);
        break;
      case 'C': // cubic bezier curve
        const curvePoints = flattenCurve(
          currentX, currentY,
          cmd.x1, cmd.y1,
          cmd.x2, cmd.y2,
          cmd.x, cmd.y
        );
        points.push(...curvePoints);
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'Q': // quadratic bezier curve
        // Convert quadratic to cubic bezier
        const x1 = currentX + 2/3 * (cmd.x1 - currentX);
        const y1 = currentY + 2/3 * (cmd.y1 - currentY);
        const x2 = cmd.x + 2/3 * (cmd.x1 - cmd.x);
        const y2 = cmd.y + 2/3 * (cmd.y1 - cmd.y);
        const quadCurvePoints = flattenCurve(
          currentX, currentY,
          x1, y1,
          x2, y2,
          cmd.x, cmd.y
        );
        points.push(...quadCurvePoints);
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'Z': // closePath
        if (points.length > 0) {
          points.push(points[0]); // Close the path by returning to the start
        }
        break;
    }
  });

  return points;
}

export async function create3DText(
  text: string,
  options: TextOptions = {}
): Promise<Manifold> {
  const {
    fontSize = 72,
    thickness = 10,
    fontUrl = DEFAULT_FONT_URL
  } = options;

  // Load the font
  const font = await loadFont(fontUrl);
  
  // Create paths for the text
  const paths = font.getPaths(text, 0, 0, fontSize);
  
  // Convert each path to a Manifold and store them
  const letterManifolds: Manifold[] = [];
  let currentX = 0;

  for (const path of paths) {
    // Convert the path to points
    const points = pathToPoints(path);
    
    if (points.length < 3) continue; // Skip paths with insufficient points
    
    try {
      // Create a CrossSection from the points
      const crossSection = new CrossSection(points);
      
      // Extrude the cross section to create a 3D shape
      const letterManifold = crossSection
        .extrude(thickness)
        .rotate([0, 180, 0]) // Flip to correct orientation
        .translate([currentX, 0, 0]);
      
      letterManifolds.push(letterManifold);
      
      // Update X position for the next character
      currentX += path.getBoundingBox().x2 - path.getBoundingBox().x1 + fontSize * 0.1; // Add some spacing
    } catch (error) {
      console.error('Error creating manifold for path:', error);
    }
  }
  
  // Union all letter manifolds together
  if (letterManifolds.length === 0) {
    throw new Error('No valid letters to render');
  }
  
  const textManifold = Manifold.union(letterManifolds);
  
  // Center the text horizontally
  const bounds = textManifold.boundingBox();
  const centerX = -(bounds.max[0] - bounds.min[0]) / 2;
  
  return textManifold.translate([centerX, 0, 0]);
}