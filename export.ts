import { strToU8, Zippable, zipSync } from 'fflate';
import { fileForContentTypes, FileForRelThumbnail, to3dmodel } from '@jscadui/3mf-export';
import { Manifold, Mesh } from './built/manifold';

interface Mesh3MF {
  id: string;
  vertices: Float32Array;
  indices: Uint32Array;
  name?: string;
}

interface Child3MF {
  objectID: string;
  transform?: number[];
}

interface Component3MF {
  id: string;
  children: Array<Child3MF>;
  name?: string;
}

interface Header {
  unit?: 'micron' | 'millimeter' | 'centimeter' | 'inch' | 'foot' | 'meter';
  title?: string;
  author?: string;
  description?: string;
  application?: string;
  creationDate?: string;
  license?: string;
  modificationDate?: string;
}

interface To3MF {
  meshes: Array<Mesh3MF>;
  components: Array<Component3MF>;
  items: Array<Child3MF>;
  precision: number;
  header: Header;
}

export async function exportTo3MF(manifold: Manifold): Promise<Blob> {
  const to3mf: To3MF = {
    meshes: [],
    components: [],
    items: [],
    precision: 7,
    header: {
      unit: 'millimeter',
      title: 'ManifoldCAD.org model',
      description: 'ManifoldCAD.org model',
      application: 'ManifoldCAD.org',
    }
  };

  // Get the mesh from the manifold
  const mesh = manifold.getMesh();

  console.log({ mesh });

  // Convert vertices to Float32Array
  const vertices = mesh.numProp === 3 ?
    mesh.vertProperties :
    new Float32Array(mesh.numVert * 3);

  if (mesh.numProp > 3) {
    for (let i = 0; i < mesh.numVert; ++i) {
      for (let j = 0; j < 3; ++j) {
        vertices[i * 3 + j] = mesh.vertProperties[i * mesh.numProp + j];
      }
    }
  }

  // Add the mesh to the 3MF with a unique ID
  const meshId = '1';
  to3mf.meshes.push({
    vertices,
    indices: mesh.triVerts,
    id: meshId
  });

  // Add the item directly without creating a component
  to3mf.items.push({ objectID: meshId });

  console.log(to3mf);

  // Create the 3MF file
  const fileForRelThumbnail = new FileForRelThumbnail();
  fileForRelThumbnail.add3dModel('3D/3dmodel.model');

  const model = to3dmodel(to3mf as any);
  console.log(model);
  const files: Zippable = {};
  files['3D/3dmodel.model'] = strToU8(model);
  files[fileForContentTypes.name] = strToU8(fileForContentTypes.content);
  files[fileForRelThumbnail.name] = strToU8(fileForRelThumbnail.content);

  console.log(files);

  const zipFile = zipSync(files);
  return new Blob(
    [zipFile],
    { type: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' }
  );
}
