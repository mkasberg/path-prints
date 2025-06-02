import { Manifold, CrossSection } from './manifold-instance';
import opentype from 'opentype.js';
import RobotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff';

let fontPromise: Promise<opentype.Font> | null = null;

async function loadFont(): Promise<opentype.Font> {
  if (!fontPromise) {
    fontPromise = fetch(RobotoRegular)
      .then(response => response.arrayBuffer())
      .then(buffer => opentype.parse(buffer));
  }
  return fontPromise;
}

export async function create3DText(
  text: string,
  options: TextOptions = {}
): Promise<Manifold> {
  const {
    fontSize = 72,
    thickness = 10
  } = options;

  const font = await loadFont();
  const path = font.getPath(text, 0, 0, fontSize);
  const commands = path.commands;

  // Convert font path to CrossSection points
  const points: [number, number][] = [];
  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M': // Move
      case 'L': // Line
        points.push([cmd.x, -cmd.y]); // Flip Y coordinate
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'Q': // Quadratic curve
        // Approximate with line segments
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = (1-t)*(1-t)*currentX + 2*(1-t)*t*cmd.x1 + t*t*cmd.x;
          const y = (1-t)*(1-t)*currentY + 2*(1-t)*t*cmd.y1 + t*t*cmd.y;
          points.push([x, -y]); // Flip Y coordinate
        }
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'C': // Cubic curve
        // Approximate with line segments
        const cubicSteps = 10;
        for (let i = 1; i <= cubicSteps; i++) {
          const t = i / cubicSteps;
          const mt = 1-t;
          const x = mt*mt*mt*currentX + 3*mt*mt*t*cmd.x1 + 3*mt*t*t*cmd.x2 + t*t*t*cmd.x;
          const y = mt*mt*mt*currentY + 3*mt*mt*t*cmd.y1 + 3*mt*t*t*cmd.y2 + t*t*t*cmd.y;
          points.push([x, -y]); // Flip Y coordinate
        }
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      case 'Z': // Close path
        if (points.length > 0) {
          points.push(points[0]); // Close the loop
        }
        break;
    }
  }

  if (points.length < 3) {
    // Return a small cube if we couldn't create text
    return Manifold.cube([1, 1, thickness]);
  }

  // Create text cross section and extrude
  const crossSection = new CrossSection(points);
  return crossSection.extrude(thickness);
}