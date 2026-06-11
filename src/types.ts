export interface Point {
  id: string; // unique identifier
  x: number;  // Northing (North-South coords in meters, standard Ukrainian X)
  y: number;  // Easting (East-West coords in meters, standard Ukrainian Y)
  lat?: number; // WGS84 latitude (for GeoJSON mapping)
  lng?: number; // WGS84 longitude (for GeoJSON mapping)
}

export interface Building {
  id: string;
  name: string; // e.g., "Житловий будинок (літ. А-1)"
  points: Point[];
  area: number; // calculated area in sq m
}

export interface Restriction {
  id: string;
  code: string; // e.g., "01.05"
  name: string; // e.g., "Охоронна зона кабельної лінії зв'язку"
  points: Point[];
  area: number; // area in sq m
  description?: string;
}

export interface AdjacentBoundary {
  id: string;
  fromPoint: string; // point order index or label (e.g., "1")
  toPoint: string;   // point order index or label (e.g., "2")
  description: string; // e.g., "землі гр. Петренка М.В. (діл. №45)"
}

export interface CadastralModel {
  // Main land plot details
  cadastralNumber: string;
  address: string;
  ownershipForm: 'Приватна' | 'Державна' | 'Комунальна' | 'Сумісна';
  purposeCode: string; // e.g. "02.01"
  purposeName: string; // e.g. "Для будівництва і обслуговування житлового будинку..."
  category: string; // e.g. "Землі житлової та громадської забудови"
  
  // Owner details
  ownerName: string;
  ownerCode: string; // TIN or EDRPOU
  ownerDocument: string; // e.g., "Свідоцтво про право власності №452-12 від 11.02.2021"
  ownerShare: string; // e.g. "1/1"
  
  // DRRP (Державний реєстр речових прав) Info
  drrpRegNumber: string; // Реєстраційний номер об'єкта нерухомого майна
  drrpDecisionNumber: string; // Номер рішення про державну реєстрацію
  drrpDecisionDate: string; // Дата рішення
  drrpRegistrar: string; // Державний реєстратор (ПІБ)
  drrpRightNumber: string; // Номер запису про право власності
  drrpEncumbrances: string; // Обтяження (іпотека, арешт - або "відсутні")
  
  // Geodetic and survey metadata
  coordinateSystem: 'УСК-2000' | 'СК-63' | 'Місцева';
  zone: string; // Zone number for SK-63/USK-2000 (e.g., "Зона 3")
  scale: number; // e.g., 500, 1000, 2000 for drawing scale (M 1:1000)
  surveyorName: string;
  surveyorCertificate: string;
  surveyorOrganization: string;
  surveyDate: string;
  
  // Geometries
  points: Point[];
  buildings: Building[];
  restrictions: Restriction[];
  adjacentBoundaries: AdjacentBoundary[];
  landUseExplication: LandUseExplication[];
}

export interface LandUseExplication {
  id: string;
  code: string; // e.g. "007.01"
  name: string; // e.g. "під житловою забудовою"
  area: number; // area in sq m
  points?: Point[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'Point' | 'LineString';
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONDocument {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export type DrawMode = 'VIEW' | 'EDIT_PARCEL' | 'ADD_BUILDING' | 'ADD_RESTRICTION' | 'ADD_LAND_USE';
