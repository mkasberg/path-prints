import Module from 'manifold-3d';
import { create3DText } from './text-3d';

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

function createSlantedSegment(edgeLen: number, edgeWidth: number, h0: number, h1: number): Manifold {
  // Create a cross section of the trapezoidal shape
  const crossSection = new CrossSection([
    [0, 0],       // bottom left
    [edgeLen, 0], // bottom right
    [edgeLen, h1], // top right
    [0, h0]       // top left
  ]);

  // Extrude up Z, rotate to the proper orientation (+Z resting on thy XY plane),
  // and then translate to center on X axis.
  return crossSection.extrude(edgeWidth).rotate([90, 0, 0]).translate([0, edgeWidth/2, 0]);
}

function createMapPolyline(params: GpxMiniatureParams, scaledPoints: { x: number, y: number }[], elevation: number[]): Manifold {
  const maxIdx = Math.round((params.outBack / 100) * scaledPoints.length - 1);
  const elevationMin = Math.min(...elevation);
  const elevationDiff = Math.max(...elevation) - elevationMin;
  const mapPolylineHeight = Math.min(params.maxPolylineHeight, elevationDiff / 10);

  const scaledElevation = elevation.map(e => 
    (e - elevationMin) * 0.95 * mapPolylineHeight / elevationDiff + 0.05 * mapPolylineHeight
  );

  const parts: Manifold[] = [];
  
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
    
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const anglePrev = Math.atan2(dyPrev, dxPrev) * 180 / Math.PI;
    const angleNext = Math.atan2(dyNext, dxNext) * 180 / Math.PI;

    let segment = createSlantedSegment(edgeLen, edgeWidth, h0, h1);

    if (i < maxIdx - 1) {
      const nextCutter = Manifold.cube([edgeWidth, edgeWidth * 4, mapPolylineHeight + 2])
        .translate([0, -2 * edgeWidth, -1])
        .rotate([0, 0, halfAngleDifference(angleNext, angle)])
        .translate([edgeLen, 0, 0]);
      segment = segment.subtract(nextCutter);
    }

    if (i > 0) {
      const prevCutter = Manifold.cube([edgeWidth, edgeWidth * 4, mapPolylineHeight + 2])
        .translate([0, -2 * edgeWidth, -1])
        .rotate([0, 0, 180 - halfAngleDifference(angle, anglePrev)]);
      segment = segment.subtract(prevCutter);
    }

    segment = segment.rotate([0, 0, angle]).translate([p0.x, p0.y, 0]);
    parts.push(segment);

    let joint = Manifold.cylinder(h0, edgeWidth/2, edgeWidth/2, 12);

    const segmentCutter = Manifold.cube([edgeWidth, edgeWidth + 2, mapPolylineHeight + 0.002])
      .translate([0.001, -(edgeWidth + 2) / 2, -0.001])
      .rotate([0, 0, angle]);
    joint = joint.subtract(segmentCutter);

    if (i > 0) {
      const prevSegmentCutter = Manifold.cube([edgeWidth, edgeWidth + 2, mapPolylineHeight + 0.002])
        .translate([0.001, -(edgeWidth + 2) / 2, -0.001])
        .rotate([0, 0, 180 + anglePrev]);
      joint = joint.subtract(prevSegmentCutter);
    }

    joint = joint.translate([p0.x, p0.y, 0]);
    parts.push(joint);

    if (i === maxIdx - 2) {
      let finalJoint = Manifold.cylinder(h1, edgeWidth/2, edgeWidth/2, 12);
      const finalCutter = Manifold.cube([edgeWidth, edgeWidth + 2, mapPolylineHeight + 0.002])
        .translate([0.001, -(edgeWidth + 2) / 2, -0.001])
        .rotate([0, 0, 180 + angle]);
      finalJoint = finalJoint.subtract(finalCutter);
      finalJoint = finalJoint.translate([p1.x, p1.y, 0]);
      parts.push(finalJoint);
    }
  }

  return parts.length > 0 ? Manifold.union(parts) : new Manifold();
}

async function createTextPlate(params: GpxMiniatureParams): Promise<Manifold> {
  const angle = Math.atan(params.thickness / params.plateDepth) * 180 / Math.PI;

  const textSurface = Manifold.intersection([
    Manifold.cube([params.width, params.plateDepth, params.thickness]),
    Manifold.cube([params.width, 2 * params.plateDepth, params.thickness])
      .translate([0, 0, -params.thickness])
      .rotate([angle, 0, 0])
  ]);

  // Create 3D text
  const text3D = await create3DText(params.title, {
    fontSize: params.fontSize,
    thickness: params.textThickness,
    x: params.width * 0.1,
    y: params.plateDepth * 0.3,
    z: params.thickness
  });

  return Manifold.union([textSurface, text3D]);
}

export async function createGpxMiniature(params: GpxMiniatureParams): Promise<Manifold> {
  const maxSize = params.width - 2 * params.margin;
  
  const points = params.latLngValues.map(([lat, lng]) => ({ x: lng, y: lat }));
  
  const pointsX = points.map(p => p.x);
  const pointsY = points.map(p => p.y);
  const pointsXMin = Math.min(...pointsX);
  const pointsYMin = Math.min(...pointsY);
  
  const pointsWidth = Math.max(...pointsX) - pointsXMin;
  const pointsHeight = Math.max(...pointsY) - pointsYMin;
  
  const mapWidth = pointsWidth > pointsHeight ? maxSize : (pointsWidth / pointsHeight) * maxSize;
  const mapHeight = pointsWidth > pointsHeight ? (pointsHeight / pointsWidth) * maxSize : maxSize;
  const scale = mapWidth / pointsWidth;
  
  const scaledPoints = points.map(p => ({
    x: (p.x - pointsXMin) * scale,
    y: (p.y - pointsYMin) * scale
  }));
  
  const base = Manifold.cube([params.width, params.width, params.thickness])
    .translate([0, params.plateDepth, 0]);
  
  // Create text plate
  const textPlate = await createTextPlate(params);
  
  const polyline = createMapPolyline(params, scaledPoints, params.elevationValues)
    .translate([-mapWidth/2, -mapHeight/2, 0])
    .rotate([0, 0, params.mapRotation])
    .translate([
      params.margin + (params.width - 2 * params.margin) / 2,
      params.plateDepth + params.margin + (params.width - 2 * params.margin) / 2,
      params.thickness - 0.001
    ]);
  
  return Manifold.union([base, textPlate, polyline]);
}