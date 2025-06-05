import Module from 'manifold-3d';

// Single promise that will be reused for all initialization requests
let initPromise: Promise<{ Manifold: any; CrossSection: any }> | null = null;

export async function getManifoldInstance() {
  if (!initPromise) {
    console.log('🔧 Initializing new Manifold WASM instance');
    // Create the promise only once
    initPromise = (async () => {
      try {
        console.log('📦 Loading WASM module...');
        const wasm = await Module();
        console.log('🚀 Setting up WASM module...');
        wasm.setup();
        console.log('✅ WASM module initialized successfully');
        return {
          Manifold: wasm.Manifold,
          CrossSection: wasm.CrossSection
        };
      } catch (error) {
        console.error('❌ Failed to initialize WASM module:', error);
        // If initialization fails, clear the promise so it can be retried
        initPromise = null;
        throw error;
      }
    })();
  } else {
    console.log('♻️ Reusing existing Manifold instance');
  }
  return initPromise;
}