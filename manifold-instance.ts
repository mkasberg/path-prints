import Module from 'manifold-3d';

let manifoldInstance: { Manifold: any; CrossSection: any } | null = null;

export async function getManifoldInstance() {
  if (!manifoldInstance) {
    const wasm = await Module();
    wasm.setup();
    manifoldInstance = {
      Manifold: wasm.Manifold,
      CrossSection: wasm.CrossSection
    };
  }
  return manifoldInstance;
}