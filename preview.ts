import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BufferAttribute, BufferGeometry, Mesh as ThreeMesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer, GridHelper, AxesHelper } from 'three';
import { createGpxMiniature, defaultParams } from './gpx-miniature.js';

interface GpxMiniatureParams {
  title: string;
  fontSize: number;
  outBack: number;
  mapRotation: number;
  elevationValues: number[];
  latLngValues: [number, number][];
  width: number;
  plateDepth: number;
  thickness: number;
  textThickness: number;
  margin: number;
  maxPolylineHeight: number;
}

export function setupPreview(canvas: HTMLCanvasElement, onParamsChange?: (params: GpxMiniatureParams) => void) {
  // Set up Three.js scene
  const scene = new Scene();
  scene.background = new THREE.Color(0x1a1a1a);

  // Create camera with a better initial position
  const camera = new PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(100, 100, 150);
  camera.lookAt(0, 0, 0);

  // Set up Three.js renderer with better quality settings
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Add grid helper with better visibility
  const gridHelper = new GridHelper(800, 50, 0x444444, 0x444444);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // Add axis helper
  const axesHelper = new AxesHelper(50);
  scene.add(axesHelper);

  // Edge-emphasizing lighting setup
  // Main light from top-right
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(100, 100, 0);
  mainLight.castShadow = false;
  scene.add(mainLight);

  // Edge light from top-left
  const edgeLight = new THREE.DirectionalLight(0xffffff, 0.8);
  edgeLight.position.set(-100, 100, 0);
  scene.add(edgeLight);

  // Back light for depth
  const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
  backLight.position.set(0, 0, -100);
  scene.add(backLight);

  // Ambient light for overall scene illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Create material with edge emphasis
  const material = new MeshStandardMaterial({
    color: 0xff0090,
    roughness: 0.2,
    metalness: 0.0,
    flatShading: true
  });

  let miniatureMesh: ThreeMesh | null = null;

  // Function to center and fit the object
  function centerAndFitObject() {
    if (!miniatureMesh) return;

    const box = new THREE.Box3().setFromObject(miniatureMesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Calculate the distance needed to fit the object
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 0.9;

    camera.position.set(camera.position.x, camera.position.y, camera.position.z);
    camera.lookAt(center);

    // Reset controls target
    controls.target.copy(center);
    controls.update();
  }

  // Function to update the miniature
  async function updateMiniature(params: GpxMiniatureParams) {
    try {
      // Remove old mesh if it exists
      if (miniatureMesh) {
        scene.remove(miniatureMesh);
        miniatureMesh.geometry.dispose();
      }

      // Create new miniature
      const miniature = await createGpxMiniature(params);

      // Convert to Three.js geometry
      const mesh = miniature.getMesh();
      console.log('Mesh data:', {
        numVertices: mesh.numVert,
        numTriangles: mesh.numTri,
        vertPropertiesLength: mesh.vertProperties.length,
        triVertsLength: mesh.triVerts.length
      });

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(mesh.vertProperties, 3));
      geometry.setIndex(new BufferAttribute(mesh.triVerts, 1));
      geometry.computeVertexNormals();

      // Create new mesh with shadows
      miniatureMesh = new ThreeMesh(geometry, material);
      miniatureMesh.castShadow = true;
      miniatureMesh.receiveShadow = true;
      
      // Rotate the mesh to align with Three.js coordinate system
      miniatureMesh.rotation.x = -Math.PI / 2;
      
      // Translate the mesh to the positive Z quadrant
      miniatureMesh.position.z = params.width + params.plateDepth;
      
      scene.add(miniatureMesh);

      // Center and fit the object
      centerAndFitObject();
    } catch (error) {
      console.error('Error updating miniature:', error);
    }
  }

  // Add orbit controls with better settings
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 10;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 2;
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.5;

  // Handle window resize
  window.addEventListener('resize', () => {
    canvas.removeAttribute('style');
    canvas.width = 0;
    canvas.height = 0;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    centerAndFitObject();
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // Return function to update the miniature
  return updateMiniature;
}