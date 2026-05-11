import { useMemo, useState } from "react";

import { readBrowserPosition } from "../utils/geolocation";

const VERIFY_METRICS = [
  { value: "irradiance", label: "Irradiance", unit: "W/m²" },
  { value: "temperature", label: "Temperature", unit: "°C" },
  { value: "humidity", label: "Humidity", unit: "%" },
];

export default function HardwareVerificationPanel({
  records,
  selectedRecord,
  hardwareSampleAvailable = false,
  hardwareLatestRaw = null,
  onFetchSatellite,
  onCaptureHardware,
}) {
  const [coords, setCoords] = useState(null);
  const [metric, setMetric] = useState("irradiance");
  const [hardwareMode, setHardwareMode] = useState(hardwareSampleAvailable ? "latest" : "demo");
  const [status, setStatus] = useState("");
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingSatellite, setLoadingSatellite] = useState(false);
  const [loadingHardware, setLoadingHardware] = useState(false);

  const effectiveHardwareMode = hardwareSampleAvailable ? hardwareMode : "demo";
  const selectedMetric = VERIFY_METRICS.find((item) => item.value === metric);
  const selectedPoint = useMemo(() => recordToPoint(selectedRecord), [selectedRecord]);
  const activeCoords = coords || selectedPoint;
  const metricAvailableForHardware = isHardwareMetricAvailable(metric, effectiveHardwareMode, hardwareLatestRaw);
  const matching = useMemo(() => findMatchingRecords(records, activeCoords, metric), [records, activeCoords, metric]);
  const comparison = useMemo(() => buildComparison(matching.satellite, matching.hardware), [matching]);
  const guidance = buildGuidance({ activeCoords, matching, comparison, metricLabel: selectedMetric?.label });

  async function readCurrentGps() {
    setStatus("");

    setLoadingGps(true);
    try {
      const position = await readBrowserPosition();
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        label: "Current GPS",
      });
      setStatus("GPS coordinates captured. Now fetch satellite and save hardware for the same metric.");
    } catch (error) {
      setStatus(error.message || "Could not read GPS coordinates.");
    } finally {
      setLoadingGps(false);
    }
  }

  function useSelectedRecordLocation() {
    if (selectedRecord?.lat == null || selectedRecord?.lng == null) {
      setStatus("The selected record has no coordinates.");
      return;
    }

    setCoords({
      lat: Number(selectedRecord.lat),
      lng: Number(selectedRecord.lng),
      label: selectedRecord.location || "Selected record",
    });
    if (VERIFY_METRICS.some((item) => item.value === selectedRecord.metric)) {
      setMetric(selectedRecord.metric);
    }
    setStatus("Selected record location loaded for comparison.");
  }

  async function fetchSatelliteForPoint() {
    if (!activeCoords) {
      setStatus("Choose GPS or a selected record location first.");
      return;
    }

    setLoadingSatellite(true);
    setStatus("");

    try {
      await onFetchSatellite({
        source: "satellite",
        location: activeCoords.label || "Comparison point",
        lat: activeCoords.lat,
        lng: activeCoords.lng,
        metric,
      });
      setStatus("Satellite record stored. Save hardware for the same point and metric to compare.");
    } catch (error) {
      setStatus(error.message || "Satellite fetch failed.");
    } finally {
      setLoadingSatellite(false);
    }
  }

  async function captureHardwareForPoint() {
    if (!activeCoords) {
      setStatus("Choose GPS or a selected record location first.");
      return;
    }

    if (!metricAvailableForHardware) {
      setStatus(`${selectedMetric?.label || metric} is not present in the latest ESP32 sample.`);
      return;
    }

    setLoadingHardware(true);
    setStatus("");

    try {
      await onCaptureHardware({
        source: "hardware",
        location: activeCoords.label || "Comparison point",
        lat: activeCoords.lat,
        lng: activeCoords.lng,
        mode: effectiveHardwareMode,
      });
      setStatus(effectiveHardwareMode === "demo"
        ? "Demo hardware readings stored for this point."
        : "ESP32 hardware readings stored for this point.");
    } catch (error) {
      setStatus(error.message || "Hardware capture failed.");
    } finally {
      setLoadingHardware(false);
    }
  }

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 3 }}>Field Verification</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Compare Satellite And Hardware</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, maxWidth: 820 }}>
            Match = same point and same metric from both sources. Pick a record in the browser, use GPS, or click the map, then store the missing side.
          </div>
        </div>
        <span style={statusBadgeStyle}>
          RECORD MATCHING
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Comparison Point</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <ValuePill label="Lat" value={activeCoords ? activeCoords.lat.toFixed(5) : "not set"} />
            <ValuePill label="Lng" value={activeCoords ? activeCoords.lng.toFixed(5) : "not set"} />
          </div>
          <ValuePill label="Point Source" value={coords ? coords.label : selectedPoint ? "Selected record" : "not set"} />
          {activeCoords?.accuracy != null && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              GPS accuracy: {Math.round(activeCoords.accuracy)} m
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <button onClick={readCurrentGps} disabled={loadingGps} style={buttonStyle("primary", loadingGps)}>
              {loadingGps ? "Reading..." : "Use GPS"}
            </button>
            <button onClick={useSelectedRecordLocation} style={buttonStyle("secondary")}>
              Use Selected
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Metric And Satellite</div>
          <select value={metric} onChange={(event) => setMetric(event.target.value)} style={{ marginBottom: 10 }}>
            {VERIFY_METRICS.map((item) => {
              const available = isHardwareMetricAvailable(item.value, effectiveHardwareMode, hardwareLatestRaw);
              return (
                <option key={item.value} value={item.value} disabled={!available}>
                  {item.label}{available ? "" : " - no ESP32 value"}
                </option>
              );
            })}
          </select>
          <button onClick={fetchSatelliteForPoint} disabled={loadingSatellite || !activeCoords} style={buttonStyle("primary", loadingSatellite || !activeCoords)}>
            {loadingSatellite ? "Fetching..." : "Fetch Satellite Record"}
          </button>
          <div style={{ marginTop: 12 }}>
            <ValuePill
              label="Satellite"
              value={matching.satellite ? `${matching.satellite.value} ${matching.satellite.unit || selectedMetric?.unit || ""}` : "missing for this point"}
              tone="cyan"
            />
          </div>
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Hardware</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => hardwareSampleAvailable && setHardwareMode("latest")}
              disabled={!hardwareSampleAvailable}
              style={modeButtonStyle(effectiveHardwareMode === "latest", "green", !hardwareSampleAvailable)}
            >
              {hardwareSampleAvailable ? "ESP32" : "No ESP32"}
            </button>
            <button onClick={() => setHardwareMode("demo")} style={modeButtonStyle(effectiveHardwareMode === "demo", "amber")}>
              Demo
            </button>
          </div>
          <button
            onClick={captureHardwareForPoint}
            disabled={loadingHardware || !activeCoords || !metricAvailableForHardware}
            style={buttonStyle("primary", loadingHardware || !activeCoords || !metricAvailableForHardware)}
          >
            {loadingHardware ? "Saving..." : "Save Hardware Reading"}
          </button>
          <div style={{ marginTop: 12 }}>
            <ValuePill
              label="Hardware"
              value={matching.hardware ? `${matching.hardware.value} ${matching.hardware.unit || selectedMetric?.unit || ""}` : metricAvailableForHardware ? "missing for this point" : "not in ESP32 sample"}
              tone="green"
            />
          </div>
        </div>
      </div>

      {(comparison || status || guidance) && (
        <div style={{
          marginTop: 14,
          padding: "12px 14px",
          borderRadius: 12,
          background: comparison ? "rgba(251,191,36,0.06)" : "rgba(34,211,238,0.05)",
          border: comparison ? "1px solid rgba(251,191,36,0.18)" : "1px solid rgba(34,211,238,0.14)",
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "center",
        }}>
          <div style={{ fontSize: 13, color: "var(--muted-2)" }}>
            {comparison
              ? `${selectedMetric?.label}: satellite ${comparison.satellite.toFixed(2)} vs hardware ${comparison.hardware.toFixed(2)}. Difference ${comparison.diff.toFixed(2)} ${selectedMetric?.unit || ""} (${comparison.diffPct.toFixed(1)}%).`
              : status || guidance}
          </div>
          {comparison && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: comparison.match >= 90 ? "var(--green)" : "var(--amber)", whiteSpace: "nowrap" }}>
              Match {comparison.match.toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function findMatchingRecords(records, coords, metric) {
  if (!coords) return { satellite: null, hardware: null };

  const key = coordinateKey(coords.lat, coords.lng);
  const matches = records
    .filter((record) => record.metric === metric && coordinateKey(record.lat, record.lng) === key)
    .sort((a, b) => new Date(b.timestamp || b.date || 0).getTime() - new Date(a.timestamp || a.date || 0).getTime());

  return {
    satellite: matches.find((record) => record.source === "satellite") || null,
    hardware: matches.find((record) => record.source === "hardware") || null,
  };
}

function recordToPoint(record) {
  if (record?.lat == null || record?.lng == null) return null;

  const lat = Number(record.lat);
  const lng = Number(record.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    label: record.location || "Selected record",
  };
}

function isHardwareMetricAvailable(metric, mode, latestRaw) {
  if (mode === "demo") return true;
  return latestRaw?.[metric] != null;
}

function buildGuidance({ activeCoords, matching, comparison, metricLabel }) {
  if (comparison) return "";
  if (!activeCoords) return "Step 1: choose a point. Select a record in Record Browser, click Use GPS, or click the map and add data there.";
  if (!matching.satellite && !matching.hardware) return `${metricLabel || "Metric"} has no satellite or hardware record at this point yet. Fetch satellite, then save hardware.`;
  if (!matching.satellite) return `${metricLabel || "Metric"} is missing satellite data at this point. Click Fetch Satellite Record.`;
  if (!matching.hardware) return `${metricLabel || "Metric"} is missing hardware data at this point. Click Save Hardware Reading.`;
  return "";
}

function coordinateKey(lat, lng) {
  if (lat == null || lng == null) return "";
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
}

function buildComparison(satelliteRecord, hardwareRecord) {
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

function ValuePill({ label, value, tone = "muted" }) {
  const color = tone === "green" ? "var(--green)" : tone === "cyan" ? "var(--primary)" : "var(--muted-2)";

  return (
    <div style={{
      padding: "9px 10px",
      borderRadius: 10,
      background: "rgba(6,11,20,0.55)",
      border: "1px solid var(--border)",
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--muted)", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

function buttonStyle(tone, disabled = false) {
  if (tone === "secondary") {
    return {
      width: "100%",
      opacity: disabled ? 0.55 : 1,
      background: "rgba(148,163,184,0.08)",
      border: "1px solid var(--border)",
      color: "var(--muted-2)",
      cursor: disabled ? "not-allowed" : "pointer",
    };
  }

  return {
    width: "100%",
    opacity: disabled ? 0.55 : 1,
    background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.08))",
    border: "1px solid var(--primary-border)",
    color: "var(--primary)",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function modeButtonStyle(active, tone, disabled = false) {
  const isAmber = tone === "amber";

  return {
    padding: "7px 8px",
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    background: active
      ? isAmber ? "var(--amber-dim)" : "var(--green-dim)"
      : "rgba(10,18,32,0.55)",
    border: active
      ? isAmber ? "1px solid var(--amber-border)" : "1px solid var(--green-border)"
      : "1px solid var(--border)",
    color: active
      ? isAmber ? "var(--amber)" : "var(--green)"
      : "var(--muted-2)",
  };
}

const statusBadgeStyle = {
  padding: "5px 10px",
  borderRadius: 99,
  background: "rgba(34,211,238,0.1)",
  border: "1px solid rgba(34,211,238,0.28)",
  color: "var(--primary)",
  fontSize: 11,
  fontFamily: "'Space Mono', monospace",
  whiteSpace: "nowrap",
};
