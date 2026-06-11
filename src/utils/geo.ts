import { Point, AdjacentBoundary } from '../types';

/**
 * Calculates the distance between two metric points in meters.
 */
export function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculates the area of a polygon using the Shoelace formula (Formula of Gauss).
 * Vertices must be ordered sequentially.
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    // Standard formula: Area = 0.5 * sum(X_i * (Y_{i+1} - Y_{i-1}))
    // Here we use Ukrainian standard coords where X is vertical (north) and Y is horizontal (east)
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculates perimeter of polygon in meters.
 */
export function calculatePolygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    perimeter += calculateDistance(points[i], next);
  }
  return perimeter;
}

/**
 * Calculate the centroid of a set of points.
 */
export function calculateCentroid(points: Point[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  return { x: sumX / points.length, y: sumY / points.length };
}

/**
 * Calculates the directional angle (дирекційний кут) from p1 to p2.
 * Returns angle in degrees, 0 is North (+X in geodetic), rotated clockwise.
 * Geodetic system standard:
 * dx = X2 - X1 (North delta)
 * dy = Y2 - Y1 (East delta)
 */
export function calculateDirectionalAngle(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x; // North
  const dy = p2.y - p1.y; // East
  
  // Math.atan2(dy, dx) returns angle starting from positive X-axis (which is East in standard mathematics,
  // but let's map it: dx is North (X-axis in geodesy), dy is East (Y-axis in geodesy).
  // Thus atan2(dy, dx) is exactly the azimuth angle from North!
  let angleRad = Math.atan2(dy, dx);
  let angleDeg = angleRad * (180 / Math.PI);
  
  if (angleDeg < 0) {
    angleDeg += 360;
  }
  
  return angleDeg;
}

/**
 * Formats a decimal angle into standard degrees, minutes, seconds format (DMS, e.g., 141°23'12").
 */
export function formatToDMS(decimalAngle: number): string {
  const deg = Math.floor(decimalAngle);
  const minDouble = (decimalAngle - deg) * 60;
  const min = Math.floor(minDouble);
  const sec = Math.round((minDouble - min) * 60);
  
  // Safeguard rounding overflow
  let finalSec = sec;
  let finalMin = min;
  let finalDeg = deg;
  if (finalSec >= 60) {
    finalSec -= 60;
    finalMin += 1;
  }
  if (finalMin >= 60) {
    finalMin -= 60;
    finalDeg += 1;
  }
  
  return `${finalDeg}°${finalMin.toString().padStart(2, '0')}'${finalSec.toString().padStart(2, '0')}"`;
}

/**
 * Projects latitude and longitude coordinates (WGS-84) to local metric Ukrainian coordinates
 * around a specific reference geographic centroid.
 * We add realistic state offsets:
 * Default base X: 5,612,400 m (Northing coordinate near central Ukraine)
 * Default base Y: 3,248,600 m (Easting coordinate near central Ukraine)
 */
export function projectLatLngToMetric(
  lat: number,
  lng: number,
  refLat: number,
  refLng: number,
  baseX = 5612400,
  baseY = 3248600
): { x: number; y: number } {
  const latRad = lat * (Math.PI / 180);
  const refLatRad = refLat * (Math.PI / 180);
  
  // Approximate standard Earth projections (meters per geographic degree)
  const metersPerLatDegree = 111132;
  const metersPerLngDegree = 111132 * Math.cos(refLatRad);
  
  const dy = (lng - refLng) * metersPerLngDegree; // East-West (becomes Y in geodetic)
  const dx = (lat - refLat) * metersPerLatDegree; // North-South (becomes X in geodetic)
  
  // Round to millimeter precision
  const x = Math.round((baseX + dx) * 1000) / 1000;
  const y = Math.round((baseY + dy) * 1000) / 1000;
  
  return { x, y };
}

/**
 * Performs reverse projection from local metric coordinates back to WGS-84 Lat/Lng values.
 */
export function projectMetricToLatLng(
  x: number,
  y: number,
  refLat: number,
  refLng: number,
  baseX = 5612400,
  baseY = 3248600
): { lat: number; lng: number } {
  const refLatRad = refLat * (Math.PI / 180);
  const metersPerLatDegree = 111132;
  const metersPerLngDegree = 111132 * Math.cos(refLatRad);
  
  const dx = x - baseX;
  const dy = y - baseY;
  
  const lat = refLat + dx / metersPerLatDegree;
  const lng = refLng + dy / metersPerLngDegree;
  
  return {
    lat: Math.round(lat * 10000000) / 10000000,
    lng: Math.round(lng * 10000000) / 10000000
  };
}

/**
 * Generate a standard initial land parcel model for Ukraine land survey context.
 */
export function createSampleCadastralModel(): import('../types').CadastralModel {
  // Center of our sample is near Kyiv Suburbs (e.g. 50.3124, 30.6548)
  const refLat = 50.3124;
  const refLng = 30.6548;
  
  const sampleGeographicPoints = [
    { lat: 50.3129, lng: 30.6541 }, // Point 1
    { lat: 50.3131, lng: 30.6552 }, // Point 2
    { lat: 50.3122, lng: 30.6556 }, // Point 3
    { lat: 50.3120, lng: 30.6546 }, // Point 4
    { lat: 50.3124, lng: 30.6540 }, // Point 5
  ];
  
  const points: Point[] = sampleGeographicPoints.map((gp, index) => {
    const metric = projectLatLngToMetric(gp.lat, gp.lng, refLat, refLng);
    return {
      id: `pt_${index + 1}`,
      x: metric.x,
      y: metric.y,
      lat: gp.lat,
      lng: gp.lng
    };
  });
  
  // Place a building inside the parcel
  const buildingGeographics = [
    { lat: 50.3126, lng: 30.6545 },
    { lat: 50.3127, lng: 30.6549 },
    { lat: 50.3125, lng: 30.6550 },
    { lat: 50.3124, lng: 30.6546 },
  ];
  const buildingPoints: Point[] = buildingGeographics.map((gp, i) => {
    const metric = projectLatLngToMetric(gp.lat, gp.lng, refLat, refLng);
    return {
      id: `bld_pt_${i + 1}`,
      x: metric.x,
      y: metric.y,
      lat: gp.lat,
      lng: gp.lng
    };
  });
  const buildingArea = calculatePolygonArea(buildingPoints);
  
  // Place a restriction/easement zone (e.g. utilities zone across south edge)
  const restrictionGeographics = [
    { lat: 50.31215, lng: 30.65430 },
    { lat: 50.31225, lng: 30.65545 },
    { lat: 50.31200, lng: 30.65555 },
    { lat: 50.31195, lng: 30.65450 },
  ];
  const restrictionPoints: Point[] = restrictionGeographics.map((gp, i) => {
    const metric = projectLatLngToMetric(gp.lat, gp.lng, refLat, refLng);
    return {
      id: `rc_pt_${i + 1}`,
      x: metric.x,
      y: metric.y,
      lat: gp.lat,
      lng: gp.lng
    };
  });
  const restrictionArea = calculatePolygonArea(restrictionPoints);

  const adjacentBoundaries: AdjacentBoundary[] = [
    { id: 'adj_1', fromPoint: '1', toPoint: '2', description: 'від А до Б — Землі загального користування (вул. Центральна)' },
    { id: 'adj_2', fromPoint: '2', toPoint: '3', description: 'від Б до В — ділянка гр. Лисенка В.М. (кадастровий № 3220882600:02:003:0125)' },
    { id: 'adj_3', fromPoint: '3', toPoint: '4', description: 'від В до Г — ділянка гр. Мельника С.П. (кадастровий № 3220882600:02:003:0126)' },
    { id: 'adj_4', fromPoint: '4', toPoint: '5', description: 'від Г до Д — Землі лісового фонду Бориспільського держлісгоспу' },
    { id: 'adj_5', fromPoint: '5', toPoint: '1', description: 'від Д до А — ділянка гр. Петренко Н.О. (кадастровий № 3220882600:02:003:0099)' },
  ];

  return {
    cadastralNumber: '3220882600:02:003:0112',
    address: 'Київська обл., Бориспільський р-н, Щасливська сільська рада, масив "Озерний", ділянка 12',
    ownershipForm: 'Приватна',
    category: 'Землі житлової та громадської забудови',
    purposeCode: '02.01',
    purposeName: 'Для будівництва і обслуговування житлового будинку, господарських будівель і споруд (присадибна ділянка)',
    
    ownerName: 'Карпенко Олександр Миколайович',
    ownerCode: '2987410293',
    ownerDocument: 'Договір дарування земельної ділянки від 12.10.2022 № 1582, посвідчений приватним нотаріусом Кравченко О.В.',
    ownerShare: '1/1',
    
    drrpRegNumber: '2647382910321',
    drrpDecisionNumber: '68502941',
    drrpDecisionDate: '2022-10-15',
    drrpRegistrar: 'Кравченко Ольга Вікторівна',
    drrpRightNumber: '48029314',
    drrpEncumbrances: 'Відсутні',
    
    coordinateSystem: 'УСК-2000',
    zone: 'Зона 3',
    scale: 500,
    surveyorName: 'Костенко Дмитро Петрович',
    surveyorCertificate: '№ 012485 від 18.06.2016',
    surveyorOrganization: 'ТОВ "ГЕОПРОЕКТ-УКРАЇНА"',
    surveyDate: '2022-09-28',
    
    points,
    buildings: [
      {
        id: 'bld_1',
        name: 'Садибний житловий будинок (літ. А-1)',
        points: buildingPoints,
        area: Math.round(buildingArea * 10) / 10
      }
    ],
    restrictions: [
      {
        id: 'rest_1',
        code: '01.05',
        name: 'Охоронна зона інженерних мереж (кабельна лінія 10кВ)',
        points: restrictionPoints,
        area: Math.round(restrictionArea * 10) / 10,
        description: 'Обмеження діє згідно Постанови КМУ №209 від 04.03.1997 року.'
      }
    ],
    adjacentBoundaries,
    landUseExplication: [
      { id: 'lu_1', code: '007.01', name: 'Землі під житловою забудовою', area: Math.round(buildingArea * 10) / 10 },
      { id: 'lu_2', code: '007.02', name: 'Землі під іншими спорудами, двір та проїзди', area: 350.0 },
      { id: 'lu_3', code: '001.01', name: 'Рілля (городи)', area: Math.round((calculatePolygonArea(points) - Math.round(buildingArea * 10) / 10 - 350.0) * 10) / 10 }
    ]
  };
}
