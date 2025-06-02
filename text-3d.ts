import { Manifold } from './manifold-instance';

interface TextOptions {
  fontSize?: number;
  thickness?: number;
}

export async function create3DText(
  text: string,
  options: TextOptions = {}
): Promise<Manifold> {
  const {
    fontSize = 72,
    thickness = 10
  } = options;

  // Create a simple cube as a placeholder
  return Manifold.cube([20, 5, thickness]);
}