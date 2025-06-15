import { getManifoldInstance } from './manifold-instance';
import opentype from 'opentype.js';
import RobotoRegular from '@fontsource/roboto/files/roboto-latin-900-normal.woff';

let fontPromise: Promise<opentype.Font> | null = null;

async function loadFont(): Promise<opentype.Font> {
  if (!fontPromise) {
    fontPromise = fetch(RobotoRegular)
      .then(response => response.arrayBuffer())
      .then(buffer => opentype.parse(buffer));
  }
  return fontPromise;
}

interface TextOptions {
  fontSize?: number;
  thickness?: number;
}

interface Point {
  x: number;
  y: number;
}

function interpolateQuadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

function interpolateCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
  };
}

function extractContours(commands: opentype.PathCommand[]): Array<Array<[number, number]>> {
  const contours: Array<Array<[number, number]>> = [];
  let currentContour: Array<[number, number]> = [];
  let currentX = 0;
  let currentY = 0;
  const STEPS = 10;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        if (currentContour.length > 0) {
          contours.push([...currentContour]);
          currentContour = [];
        }
        currentContour.push([cmd.x, -cmd.y]);
        currentX = cmd.x;
        currentY = cmd.y;
        break;

      case 'L':
        currentContour.push([cmd.x, -cmd.y]);
        currentX = cmd.x;
        currentY = cmd.y;
        break;

      case 'Q': {
        const p0 = { x: currentX, y: currentY };
        const p1 = { x: cmd.x1, y: cmd.y1 };
        const p2 = { x: cmd.x, y: cmd.y };

        for (let i = 1; i <= STEPS; i++) {
          const t = i / STEPS;
          const pt = interpolateQuadratic(p0, p1, p2, t);
          currentContour.push([pt.x, -pt.y]);
        }
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }

      case 'C': {
        const p0 = { x: currentX, y: currentY };
        const p1 = { x: cmd.x1, y: cmd.y1 };
        const p2 = { x: cmd.x2, y: cmd.y2 };
        const p3 = { x: cmd.x, y: cmd.y };

        for (let i = 1; i <= STEPS; i++) {
          const t = i / STEPS;
          const pt = interpolateCubic(p0, p1, p2, p3, t);
          currentContour.push([pt.x, -pt.y]);
        }
        currentX = cmd.x;
        currentY = cmd.y;
        break;
      }

      case 'Z':
        if (currentContour.length > 0) {
          currentContour.push(currentContour[0]);
          contours.push([...currentContour]);
          currentContour = [];
        }
        break;
    }
  }

  if (currentContour.length > 0) {
    contours.push(currentContour);
  }

  return contours;
}

export async function create3DText(
  text: string,
  options: TextOptions = {}
): Promise<any> {
  const {
    fontSize = 72,
    thickness = 10
  } = options;
  
  const { Manifold, CrossSection } = await getManifoldInstance();
  const font = await loadFont();
  const path = font.getPath(text, 0, 0, fontSize);
  
  const contours = extractContours(path.commands);
  
  if (contours.length === 0) {
    if (text.length > 0) {
      console.warn('No valid contours found in text');
    }
    return null;
  }

  const manifolds: any[] = [];
  
  for (let i = 0; i < contours.length; i++) {
    const contour = contours[i];
    if (contour.length >= 3) {
      // Reverse the contour points to change winding order
      const reversedContour = [...contour].reverse();
      
      const crossSection = new CrossSection(reversedContour);
      const extruded = crossSection.extrude(thickness);
      
      if (!extruded.isEmpty()) {
        manifolds.push(extruded);
      }
    }
  }

  if (manifolds.length === 0) {
    console.warn('No valid manifolds created');
    return null;
  }

  return Manifold.union(manifolds);
}
