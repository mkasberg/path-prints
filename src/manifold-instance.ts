import Module from 'manifold-3d';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();

export const { Manifold, CrossSection } = wasm;