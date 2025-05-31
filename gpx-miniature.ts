import Module from 'manifold-3d';

// Load Manifold WASM library
const wasm = await Module();
wasm.setup();
const { Manifold, CrossSection } = wasm;

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

function halfAngleDifference(a2: number, a1: number): number {
  if (Math.abs(a2 - a1) < 180) return (a2 - a1) / 2;
  if (Math.abs(a2 - a1 - 360) < 180) return (a2 - a1 - 360) / 2;
  return (a2 - a1 + 360) / 2;
}

function createMapPolyline(params: GpxMiniatureParams, scaledPoints: { x: number, y: number }[], elevation: number[]): Manifold {
  const maxIdx = Math.round((params.outBack / 100) * scaledPoints.length - 1);
  const elevationMin = Math.min(...elevation);
  const elevationDiff = Math.max(...elevation) - elevationMin;
  const mapPolylineHeight = Math.min(params.maxPolylineHeight, elevationDiff / 10);

  const scaledElevation = elevation.map(e => 
    (e - elevationMin) * 0.95 * mapPolylineHeight / elevationDiff + 0.05 * mapPolylineHeight
  );

  let polyline = new Manifold();
  
  for (let i = 0; i < maxIdx - 1; i++) {
    const p0 = scaledPoints[i];
    const p1 = scaledPoints[i + 1];
    const h0 = scaledElevation[i];
    const h1 = scaledElevation[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;

    const dxPrev = i > 0 ? p0.x - scaledPoints[i - 1].x : 0;
    const dyPrev = i > 0 ? p0.y - scaledPoints[i - 1].y : 0;
    const dxNext = i < maxIdx - 1 ? scaledPoints[i + 2].x - p1.x : 0;
    const dyNext = i < maxIdx - 1 ? scaledPoints[i + 2].y - p1.y : 0;

    const edgeWidth = 1;
    const edgeLen = Math.sqrt(dx * dx + dy * dy) + 0.01;
    
    const angle = Math.atan2(dy, dx);
    const anglePrev = Math.atan2(dyPrev, dxPrev);
    const angleNext = Math.atan2(dyNext, dxNext);

    // Create edge segment
    const segment = Manifold.cube([edgeLen, edgeWidth, h0])
      .rotate([0, Math.atan2(h1 - h0, edgeLen), 0])
      .translate([p0.x, p0.y, 0])
      .rotate([0, 0, angle * 180 / Math.PI]);

    // Create joint cylinder
    const joint = Manifold.cylinder(h0, edgeWidth/2, edgeWidth/2)
      .translate([p0.x, p0.y, 0]);

    polyline = Manifold.union([polyline, segment, joint]);
  }

  return polyline;
}

function createTextPlate(params: GpxMiniatureParams): Manifold {
  const angle = Math.atan(params.thickness / params.plateDepth);
  
  // Create base plate
  const basePlate = Manifold.cube([params.width, params.plateDepth, params.thickness]);
  
  // Create angled text surface
  const textSurface = new CrossSection([
    [0, 0],
    [params.width, 0],
    [params.width, params.plateDepth * Math.cos(angle)],
    [0, params.plateDepth * Math.cos(angle)]
  ]).extrude(params.textThickness);

  // Create text (Note: Manifold doesn't support text directly, we'd need to use a font rendering library)
  // For now, we'll just create a placeholder rectangle
  const textPlaceholder = Manifold.cube([params.width * 0.8, params.fontSize, params.textThickness])
    .translate([params.width * 0.1, params.plateDepth * 0.3, params.thickness]);

  return Manifold.union([basePlate, textSurface.rotate([angle * 180 / Math.PI, 0, 0]), textPlaceholder]);
}

export function createGpxMiniature(params: GpxMiniatureParams): Manifold {
  const maxSize = params.width - 2 * params.margin;
  
  // Convert lat/lng to points
  const points = params.latLngValues.map(([lat, lng]) => ({ x: lng, y: lat }));
  
  // Calculate bounds
  const pointsX = points.map(p => p.x);
  const pointsY = points.map(p => p.y);
  const pointsXMin = Math.min(...pointsX);
  const pointsYMin = Math.min(...pointsY);
  
  const pointsWidth = Math.max(...pointsX) - pointsXMin;
  const pointsHeight = Math.max(...pointsY) - pointsYMin;
  
  const mapWidth = pointsWidth > pointsHeight ? maxSize : (pointsWidth / pointsHeight) * maxSize;
  const mapHeight = pointsWidth > pointsHeight ? (pointsHeight / pointsWidth) * maxSize : maxSize;
  const scale = mapWidth / pointsWidth;
  
  // Scale points
  const scaledPoints = points.map(p => ({
    x: (p.x - pointsXMin) * scale,
    y: (p.y - pointsYMin) * scale
  }));
  
  // Create base plate
  const base = Manifold.cube([params.width, params.width, params.thickness])
    .translate([0, params.plateDepth, 0]);
  
  // Create text plate
  const textPlate = createTextPlate(params);
  
  // Create map polyline
  const polyline = createMapPolyline(params, scaledPoints, params.elevationValues)
    .translate([
      params.margin + (params.width - 2 * params.margin) / 2,
      params.plateDepth + params.margin + (params.width - 2 * params.margin) / 2,
      params.thickness
    ])
    .rotate([0, 0, params.mapRotation]);
  
  return Manifold.union([base, textPlate, polyline]);
}

export const defaultParams: GpxMiniatureParams = {
  title: "Century *100*",
  fontSize: 3.5,
  outBack: 100,
  mapRotation: 0,
  elevationValues: [1720.8, 1710.8, 1697.8], // Shortened for example
  latLngValues: [[39.697617, -105.114367], [39.707925, -105.109325]], // Shortened for example
  width: 50,
  plateDepth: 10,
  thickness: 5,
  textThickness: 2,
  margin: 2.5,
  maxPolylineHeight: 20
};