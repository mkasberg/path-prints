import { Manifold } from './manifold-instance';

interface TextOptions {
  fontSize?: number;
  thickness?: number;
  x?: number;
  y?: number;
  z?: number;
}

export async function create3DText(
  text: string,
  options: TextOptions = {}
): Promise<Manifold> {
  const {
    fontSize = 72,
    thickness = 10,
    x = 0,
    y = 0,
    z = 0
  } = options;

  // Instead of generating text, create a simple cube as a placeholder
  const width = text.length * fontSize * 0.6; // Approximate width based on text length
  const height = fontSize;
  
  return Manifold.cube([width, height, thickness])
    .translate([x, y, z]);
}