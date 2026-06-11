import React, { useRef, useState } from 'react';
import { CadastralModel, Point, GeoJSONDocument, GeoJSONFeature } from '../../types';
import { projectLatLngToMetric, projectMetricToLatLng, calculateCentroid, calculatePolygonArea } from '../../utils/geo';
import { Upload, Check, AlertCircle } from 'lucide-react';
import DragDropZone from './DragDropZone';
import ExportActions from './ExportActions';

interface GeoJSONImporterProps {
  model: CadastralModel;
  onUpdateModel: (updates: Partial<CadastralModel>) => void;
}

export default function GeoJSONImporter({ model, onUpdateModel }: GeoJSONImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [feedback, setFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  // Parse GeoJSON
  const parseGeoJSONContent = (text: string) => {
    try {
      const geojson = JSON.parse(text) as any;
      let polygonFeature: any = null;
      let buildingFeatures: any[] = [];
      let restrictionFeatures: any[] = [];

      const features = geojson.features || (geojson.type === 'Feature' ? [geojson] : []);

      if (features.length === 0) {
        throw new Error("Не знайдено жодних об'єктів (features) у файлі GeoJSON.");
      }

      features.forEach((feat: any) => {
        const geomType = feat.geometry?.type;
        const props = feat.properties || {};

        if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
          if (props.type === 'building' || props.building || String(props.name).toLowerCase().includes('буд')) {
            buildingFeatures.push(feat);
          } else if (props.type === 'restriction' || props.restriction || String(props.name).toLowerCase().includes('обмеж')) {
            restrictionFeatures.push(feat);
          } else {
            if (!polygonFeature) {
              polygonFeature = feat;
            } else {
              buildingFeatures.push(feat);
            }
          }
        }
      });

      if (!polygonFeature) {
        const anyPolygon = features.find((f: any) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon');
        if (anyPolygon) {
          polygonFeature = anyPolygon;
        } else {
          throw new Error("Файл GeoJSON має містити щонайменше один об'єкт типу 'Polygon' для відображення меж ділянки.");
        }
      }

      const mainGeom = polygonFeature.geometry;
      let rawCoords: [number, number][] = [];
      if (mainGeom.type === 'Polygon') {
        rawCoords = mainGeom.coordinates[0];
      } else if (mainGeom.type === 'MultiPolygon') {
        rawCoords = mainGeom.coordinates[0][0];
      }

      if (rawCoords.length > 3) {
        const first = rawCoords[0];
        const last = rawCoords[rawCoords.length - 1];
        if (Math.abs(first[0] - last[0]) < 0.0000001 && Math.abs(first[1] - last[1]) < 0.0000001) {
          rawCoords = rawCoords.slice(0, -1);
        }
      }

      const lats = rawCoords.map(c => c[1]);
      const lngs = rawCoords.map(c => c[0]);
      const refLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const refLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

      const points: Point[] = rawCoords.map((coord, idx) => {
        const [lng, lat] = coord;
        const metric = projectLatLngToMetric(lat, lng, refLat, refLng);
        return {
          id: `imported_${idx}_${Date.now()}`,
          x: metric.x,
          y: metric.y,
          lat: lat,
          lng: lng
        };
      });

      const importedBuildings = buildingFeatures.map((bFeat: any, bIdx) => {
        let bCoords: [number, number][] = [];
        if (bFeat.geometry.type === 'Polygon') bCoords = bFeat.geometry.coordinates[0];
        else if (bFeat.geometry.type === 'MultiPolygon') bCoords = bFeat.geometry.coordinates[0][0];
        
        if (bCoords.length > 3) {
          const first = bCoords[0];
          const last = bCoords[bCoords.length - 1];
          if (Math.abs(first[0] - last[0]) < 0.0000001 && Math.abs(first[1] - last[1]) < 0.0000001) {
            bCoords = bCoords.slice(0, -1);
          }
        }

        const bPts: Point[] = bCoords.map((bc, i) => {
          const metric = projectLatLngToMetric(bc[1], bc[0], refLat, refLng);
          return {
            id: `bld_pt_${bIdx}_${i}`,
            x: metric.x,
            y: metric.y,
            lat: bc[1],
            lng: bc[0]
          };
        });

        return {
          id: `bld_${bIdx}_${Date.now()}`,
          name: bFeat.properties?.name || `Будівля ${bIdx + 1} (імпортовано)`,
          points: bPts,
          area: Math.round(calculatePolygonArea(bPts) * 10) / 10
        };
      });

      const importedRestrictions = restrictionFeatures.map((rFeat: any, rIdx) => {
        let rCoords: [number, number][] = [];
        if (rFeat.geometry.type === 'Polygon') rCoords = rFeat.geometry.coordinates[0];
        else if (rFeat.geometry.type === 'MultiPolygon') rCoords = rFeat.geometry.coordinates[0][0];

        if (rCoords.length > 3) {
          const first = rCoords[0];
          const last = rCoords[rCoords.length - 1];
          if (Math.abs(first[0] - last[0]) < 0.0000001 && Math.abs(first[1] - last[1]) < 0.0000001) {
            rCoords = rCoords.slice(0, -1);
          }
        }

        const rPts: Point[] = rCoords.map((rc, i) => {
          const metric = projectLatLngToMetric(rc[1], rc[0], refLat, refLng);
          return {
            id: `rest_pt_${rIdx}_${i}`,
            x: metric.x,
            y: metric.y,
            lat: rc[1],
            lng: rc[0]
          };
        });

        return {
          id: `rest_${rIdx}_${Date.now()}`,
          code: rFeat.properties?.code || '01.05',
          name: rFeat.properties?.name || `Охоронна зона (імпортовано)`,
          points: rPts,
          area: Math.round(calculatePolygonArea(rPts) * 10) / 10,
          description: rFeat.properties?.description || 'Імпортовано з файлу GeoJSON.'
        };
      });

      onUpdateModel({
        points,
        buildings: importedBuildings.length ? importedBuildings : model.buildings,
        restrictions: importedRestrictions.length ? importedRestrictions : model.restrictions,
        cadastralNumber: polygonFeature.properties?.cadastralNumber || model.cadastralNumber,
        address: polygonFeature.properties?.address || model.address,
        ownerName: polygonFeature.properties?.ownerName || model.ownerName,
        ownerCode: polygonFeature.properties?.ownerCode || model.ownerCode
      });

      setFeedback({
        status: 'success',
        message: `Геометрію імпортовано успішно! Знайдено ${points.length} вершин меж земельної ділянки.`
      });
    } catch (err: any) {
      setFeedback({
        status: 'error',
        message: `Помилка читання GeoJSON: ${err.message}`
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseGeoJSONContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          parseGeoJSONContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  // EXPORT 1: GeoJSON Download
  const exportToGeoJSON = () => {
    const refLat = model.points.find(p => p.lat)?.lat || 50.3124;
    const refLng = model.points.find(p => p.lng)?.lng || 30.6548;

    const transformPointsToLatLng = (pts: Point[]) => {
      return pts.map(p => {
        const actualGeo = projectMetricToLatLng(p.x, p.y, refLat, refLng);
        return [actualGeo.lng, actualGeo.lat];
      });
    };

    const parcelCoords = transformPointsToLatLng(model.points);
    if (parcelCoords.length > 0) {
      parcelCoords.push(parcelCoords[0]);
    }

    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [parcelCoords]
        },
        properties: {
          type: 'parcel',
          cadastralNumber: model.cadastralNumber,
          address: model.address,
          ownerName: model.ownerName,
          ownerCode: model.ownerCode,
          ownershipForm: model.ownershipForm,
          purposeCode: model.purposeCode,
          purposeName: model.purposeName,
          category: model.category,
          areaHectares: model.points.length >= 3 ? (calculatePolygonArea(model.points) / 10000) : 0
        }
      }
    ];

    model.buildings.forEach((b, bIdx) => {
      const bCoords = transformPointsToLatLng(b.points);
      if (bCoords.length > 0) {
        bCoords.push(bCoords[0]);
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [bCoords]
          },
          properties: {
            type: 'building',
            name: b.name,
            area: b.area,
            index: bIdx
          }
        });
      }
    });

    model.restrictions.forEach((r, rIdx) => {
      const rCoords = transformPointsToLatLng(r.points);
      if (rCoords.length > 0) {
        rCoords.push(rCoords[0]);
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [rCoords]
          },
          properties: {
            type: 'restriction',
            code: r.code,
            name: r.name,
            area: r.area,
            description: r.description,
            index: rIdx
          }
        });
      }
    });

    const fileDocument: GeoJSONDocument = {
      type: 'FeatureCollection',
      features
    };

    const blob = new Blob([JSON.stringify(fileDocument, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadastral_plan_${model.cadastralNumber.replace(/:/g, '_') || 'custom'}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // EXPORT 2: XML Cadastral Exchange File
  const exportToXML = () => {
    const totalAreaSqM = calculatePolygonArea(model.points);
    const dateFormatted = model.surveyDate || new Date().toISOString().split('T')[0];

    const generateXMLString = (): string => {
      const pointsXML = model.points.map((p, idx) => `
        <Point id="P_${idx + 1}">
          <PointNumber>${idx + 1}</PointNumber>
          <X>${p.x.toFixed(3)}</X>
          <Y>${p.y.toFixed(3)}</Y>
        </Point>`).join('');

      const boundariesXML = model.points.map((_, idx) => {
        const next = (idx + 1) === model.points.length ? 1 : idx + 2;
        return `
        <Boundary>
          <FromPoint>P_${idx + 1}</FromPoint>
          <ToPoint>P_${next}</ToPoint>
        </Boundary>`;
      }).join('');

      return `<?xml version="1.0" encoding="UTF-8"?>
<CadastralExchangeFile xmlns="http://www.dzk.gov.ua/schemas/ExchangeFile">
  <Header>
    <Version>2.0</Version>
    <Sender>
      <Organization>${model.surveyorOrganization}</Organization>
      <Developer>${model.surveyorName}</Developer>
      <Certificate>${model.surveyorCertificate}</Certificate>
    </Sender>
    <DateCreated>${dateFormatted}</DateCreated>
  </Header>
  <CadastralZoneInfo>
    <CadastralZoneNumber>${model.cadastralNumber.split(':')[0] || '0000000000'}</CadastralZoneNumber>
    <CadastralQuarterInfo>
      <CadastralQuarterNumber>${model.cadastralNumber.split(':')[2] || '000'}</CadastralQuarterNumber>
      <ParcelInfo>
        <CadastralNumber>${model.cadastralNumber}</CadastralNumber>
        <Address>
          <Country>Україна</Country>
          <Region>${model.address.split(',')[0]?.trim() || ''}</Region>
          <District>${model.address.split(',')[1]?.trim() || ''}</District>
          <Settlement>${model.address.split(',')[2]?.trim() || ''}</Settlement>
          <Street>${model.address.split(',')[3]?.trim() || ''}</Street>
        </Address>
        <Category>${model.category}</Category>
        <Purpose>${model.purposeCode}</Purpose>
        <Use>${model.purposeName}</Use>
        <FormOfOwnership>${model.ownershipForm}</FormOfOwnership>
        <Area>
          <MeasurementUnit>га</MeasurementUnit>
          <Size>${(totalAreaSqM / 10000).toFixed(4)}</Size>
        </Area>
        <ProprietorshipInfo>
          <Proprietor>
            <Name>${model.ownerName}</Name>
            <Code>${model.ownerCode}</Code>
            <Document>${model.ownerDocument}</Document>
            <Share>${model.ownerShare}</Share>
          </Proprietor>
          <DRRPData>
            <StateRegistrationNumber>${model.drrpRegNumber}</StateRegistrationNumber>
            <RightEntryNumber>${model.drrpRightNumber}</RightEntryNumber>
            <DecisionNumber>${model.drrpDecisionNumber}</DecisionNumber>
            <DecisionDate>${model.drrpDecisionDate}</DecisionDate>
            <RegistrarName>${model.drrpRegistrar}</RegistrarName>
            <Restrictions>${model.drrpEncumbrances}</Restrictions>
          </DRRPData>
        </ProprietorshipInfo>
        <MetricInfo>
          <CoordinateSystem>${model.coordinateSystem}</CoordinateSystem>
          <Zone>${model.zone}</Zone>
          <Points>${pointsXML}
          </Points>
          <Boundaries>${boundariesXML}
          </Boundaries>
        </MetricInfo>
      </ParcelInfo>
    </CadastralQuarterInfo>
  </CadastralZoneInfo>
</CadastralExchangeFile>`;
    };

    const xmlText = generateXMLString();
    const blob = new Blob([xmlText], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exchange_dzk_${model.cadastralNumber.replace(/:/g, '_') || 'custom'}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-4" id="geojson_import_export_component">
      <div className="flex items-center gap-2">
        <Upload className="h-4.5 w-4.5 text-emerald-600" />
        <span className="text-sm font-bold text-slate-800">Імпорт та Експорт файлів геометрії</span>
      </div>

      <DragDropZone
        fileInputRef={fileInputRef}
        dragActive={dragActive}
        onDrag={handleDrag}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
      />

      {feedback && (
        <div
          id="import_feedback_banner"
          className={`p-3 rounded-lg flex items-start gap-2 text-xs font-medium ${feedback.status === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}
        >
          {feedback.status === 'success' ? (
            <Check className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <ExportActions
        onExportGeoJSON={exportToGeoJSON}
        onExportXML={exportToXML}
      />
    </div>
  );
}
