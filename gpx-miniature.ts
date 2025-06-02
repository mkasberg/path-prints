import { Manifold, CrossSection } from './manifold-instance';
import { create3DText } from './text-3d';

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

export async function createGpxMiniature(params: GpxMiniatureParams): Promise<Manifold> {
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
  const base = Manifold.cube(
    [params.width + params.bracketThickness * 2,
    params.height + params.bracketThickness * 2,
    params.depth]
  )
    .translate([0, params.plateDepth, 0]);

  console.log('Base plate created:', {
    isEmpty: base.isEmpty(),
    boundingBox: base.boundingBox()
  });
  
  // Create text
  const text = await create3DText(params.title, {
    fontSize: params.fontSize,
    thickness: params.textThickness
  });

  console.log('Text manifold created:', {
    isEmpty: text.isEmpty(),
    boundingBox: text.boundingBox()
  });

  const result = Manifold.union([base, text]);
  console.log('Final miniature:', {
    isEmpty: result.isEmpty(),
    boundingBox: result.boundingBox()
  });
  return result;
}

export const defaultParams: GpxMiniatureParams = {
  title: "Century *100*",
  fontSize: 100,  // Keep the larger font size for better visibility
  outBack: 100,
  mapRotation: 0,
  elevationValues: [1720.8,1710.8,1697.8,1688.6,1701.6,1706.2,1695,1708.4,1663.8,1643.2,1635.4,1630.4,1621.6,1615,1606.6,1612.8,1626,1637.8,1673.8,1677.8,1677.8,1676.6,1676,1676.2,1675.8,1676.8,1677.4,1675.6,1674.4,1672.8,1674.8,1677.2,1669.4,1676,1675.2,1674.4,1666.8,1664,1651.8,1645.8,1636.8,1626.6,1623,1611,1601.6,1594.2,1598.4,1605,1626.6,1654,1666.6,1694.4,1703.8,1724.2,1731.6,1733.2,1720.2,1707.2,1688.6,1668.6,1644,1629.2,1613.4,1608.2,1603.6,1600.6,1601.2,1599,1593.2,1593.4,1588,1598.4,1608.2,1613,1617.4,1623.2,1631.6,1634.8,1644.2,1655.6,1662.8,1666.6,1679.2,1689.8,1707.4,1722.6,1753,1765,1762.8,1811.6,1824,1850.4,1894,1879,1848.8,1869,1870,1852.8,1785.6,1741.2],
  latLngValues: [[39.697617,-105.114367],[39.707925,-105.109325],[39.710864,-105.090804],[39.702874,-105.081766],[39.696743,-105.084336],[39.69672,-105.084323],[39.696607,-105.101603],[39.696551,-105.109824],[39.682102,-105.100284],[39.664776,-105.095238],[39.665081,-105.081653],[39.655418,-105.060867],[39.653035,-105.041319],[39.65172,-105.023027],[39.65023,-105.010298],[39.631711,-105.014171],[39.624404,-105.000207],[39.620549,-104.988403],[39.614992,-104.980698],[39.61782,-104.976218],[39.612654,-104.956054],[39.607029,-104.938771],[39.620769,-104.945875],[39.617083,-104.930792],[39.626368,-104.939147],[39.634235,-104.931316],[39.641142,-104.934008],[39.64574,-104.944436],[39.653966,-104.940405],[39.660134,-104.927182],[39.667744,-104.920932],[39.67202,-104.915579],[39.667024,-104.910402],[39.665375,-104.906386],[39.665488,-104.90634],[39.662945,-104.903277],[39.677324,-104.906979],[39.665157,-104.885798],[39.671156,-104.890801],[39.677683,-104.895694],[39.690709,-104.912812],[39.704824,-104.933883],[39.715606,-104.955392],[39.719961,-104.977794],[39.736866,-104.996192],[39.753354,-105.007923],[39.743621,-105.016497],[39.735341,-105.027454],[39.734178,-105.039862],[39.734887,-105.060998],[39.73303,-105.080351],[39.732853,-105.100298],[39.723924,-105.109573],[39.712287,-105.10945],[39.701752,-105.109932],[39.700287,-105.112046],[39.707805,-105.109373],[39.723776,-105.109473],[39.732893,-105.100351],[39.733018,-105.076205],[39.734899,-105.058526],[39.733904,-105.038458],[39.738026,-105.02169],[39.74868,-105.015869],[39.760812,-105.00326],[39.765925,-104.988914],[39.778347,-104.978331],[39.793513,-104.966335],[39.807444,-104.959491],[39.822743,-104.950157],[39.827979,-104.950684],[39.823603,-104.972366],[39.820359,-104.992269],[39.814708,-105.008221],[39.811384,-105.015254],[39.802112,-105.030044],[39.796494,-105.044195],[39.791209,-105.06037],[39.785736,-105.074031],[39.780581,-105.091472],[39.774528,-105.10267],[39.771611,-105.110842],[39.77504,-105.1126],[39.77444,-105.126187],[39.772551,-105.149305],[39.772871,-105.16899],[39.769178,-105.19297],[39.766285,-105.209956],[39.757146,-105.21958],[39.750857,-105.230602],[39.743192,-105.221308],[39.731522,-105.210985],[39.725248,-105.198814],[39.713542,-105.1977],[39.699643,-105.194658],[39.686825,-105.18621],[39.681691,-105.173868],[39.683388,-105.158657],[39.696747,-105.145313],[39.696574,-105.126556]],
  width: 50,
  plateDepth: 10,
  thickness: 5,
  textThickness: 2,
  margin: 2.5,
  maxPolylineHeight: 20
};