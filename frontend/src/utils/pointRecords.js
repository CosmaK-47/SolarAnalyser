export const COMPARISON_METRICS = [
  { value: "irradiance", label: "Irradiance", unit: "W/m²" },
  { value: "temperature", label: "Temperature", unit: "°C" },
  { value: "humidity", label: "Humidity", unit: "%" },
];

export function normalizeLatLng(latValue, lngValue) {
  const lat = Number(latValue);
  const lng = Number(lngValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export function buildPointId(latValue, lngValue) {
  const coords = normalizeLatLng(latValue, lngValue);
  if (!coords) return "";

  return `pt-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`;
}

export function getRecordPointId(record) {
  return record?.point_id || record?.pointId || buildLegacyPointId(record?.lat, record?.lng);
}

export function coordinateKey(latValue, lngValue, precision = 4) {
  const coords = normalizeLatLng(latValue, lngValue);
  if (!coords) return "";

  return `${coords.lat.toFixed(precision)},${coords.lng.toFixed(precision)}`;
}

export function buildPointGroups(records) {
  const map = new Map();

  records.forEach((record) => {
    const coords = normalizeLatLng(record.lat, record.lng);
    if (!coords) return;

    const pointId = getRecordPointId(record) || coordinateKey(coords.lat, coords.lng);
    const current = map.get(pointId) || {
      key: pointId,
      pointId,
      name: record.location || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      lat: coords.lat,
      lng: coords.lng,
      records: [],
      satelliteRecords: [],
      hardwareRecords: [],
      metrics: {},
      latestTimestamp: record.timestamp || record.date || "",
    };

    current.records.push(record);
    if (record.source === "satellite") current.satelliteRecords.push(record);
    if (record.source === "hardware") current.hardwareRecords.push(record);

    if (record.metric) {
      const metricState = current.metrics[record.metric] || {
        metric: record.metric,
        label: record.label || getMetricMeta(record.metric).label,
        unit: record.unit || getMetricMeta(record.metric).unit,
        satellite: null,
        hardware: null,
      };
      const slot = record.source === "hardware" ? "hardware" : record.source === "satellite" ? "satellite" : null;
      if (slot && isNewerRecord(record, metricState[slot])) {
        metricState[slot] = record;
        metricState.label = record.label || metricState.label;
        metricState.unit = record.unit || metricState.unit;
      }
      current.metrics[record.metric] = metricState;
    }

    if (isNewerTimestamp(record.timestamp || record.date, current.latestTimestamp)) {
      current.latestTimestamp = record.timestamp || record.date || current.latestTimestamp;
    }

    if (record.source === "hardware") {
      current.name = record.location || current.name;
    }

    map.set(pointId, current);
  });

  return Array.from(map.values())
    .map((point) => {
      const comparableRows = buildComparableRows(point);
      return {
        ...point,
        comparableRows,
        readyCount: comparableRows.length,
        satelliteCount: point.satelliteRecords.length,
        hardwareCount: point.hardwareRecords.length,
      };
    })
    .sort((a, b) => {
      if (b.readyCount !== a.readyCount) return b.readyCount - a.readyCount;
      return timestampValue(b.latestTimestamp) - timestampValue(a.latestTimestamp);
    });
}

export function buildComparableRows(point) {
  if (!point?.metrics) return [];

  return COMPARISON_METRICS
    .map((metric) => {
      const state = point.metrics[metric.value];
      const comparison = buildComparison(state?.satellite, state?.hardware);
      if (!comparison) return null;

      return {
        metric: metric.value,
        label: metric.label,
        unit: state?.unit || metric.unit,
        satelliteRecord: state.satellite,
        hardwareRecord: state.hardware,
        ...comparison,
      };
    })
    .filter(Boolean);
}

export function getMetricMeta(metric) {
  return COMPARISON_METRICS.find((item) => item.value === metric) || {
    value: metric,
    label: titleCase(String(metric || "Metric").replace(/_/g, " ")),
    unit: "",
  };
}

export function findPointForRecord(pointGroups, record) {
  const recordPointId = getRecordPointId(record);
  if (!recordPointId) return null;

  return pointGroups.find((point) => point.pointId === recordPointId) || null;
}

export function pointFromRecord(record) {
  const coords = normalizeLatLng(record?.lat, record?.lng);
  if (!coords) return null;

  return {
    key: getRecordPointId(record),
    pointId: getRecordPointId(record),
    name: record.location || "Selected record",
    lat: coords.lat,
    lng: coords.lng,
    records: record ? [record] : [],
    satelliteRecords: record?.source === "satellite" ? [record] : [],
    hardwareRecords: record?.source === "hardware" ? [record] : [],
    metrics: {},
    comparableRows: [],
    readyCount: 0,
  };
}

export function buildComparison(satelliteRecord, hardwareRecord) {
  if (!satelliteRecord || !hardwareRecord) return null;

  const satellite = Number(satelliteRecord.value);
  const hardware = Number(hardwareRecord.value);
  if (!Number.isFinite(satellite) || !Number.isFinite(hardware)) return null;

  const diff = hardware - satellite;
  const diffPct = satellite === 0 ? 0 : (Math.abs(diff) / Math.abs(satellite)) * 100;

  return {
    satellite,
    hardware,
    diff,
    diffPct,
    match: Math.max(0, 100 - diffPct),
  };
}

function isNewerRecord(nextRecord, currentRecord) {
  if (!currentRecord) return true;
  return timestampValue(nextRecord.timestamp || nextRecord.date) >= timestampValue(currentRecord.timestamp || currentRecord.date);
}

function isNewerTimestamp(nextTimestamp, currentTimestamp) {
  return timestampValue(nextTimestamp) >= timestampValue(currentTimestamp);
}

function timestampValue(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildLegacyPointId(latValue, lngValue) {
  const coords = normalizeLatLng(latValue, lngValue);
  if (!coords) return "";

  return `legacy-${coords.lat.toFixed(4)}-${coords.lng.toFixed(4)}`;
}
