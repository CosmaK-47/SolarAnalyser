import { useMemo, useState } from "react";

import { readBrowserPosition } from "../utils/geolocation";
import {
  COMPARISON_METRICS,
  buildComparableRows,
  buildComparison,
  buildPointGroups,
  buildPointId,
  findPointForRecord,
  getMetricMeta,
  getRecordPointId,
  pointFromRecord,
} from "../utils/pointRecords";

export default function HardwareVerificationPanel({
  records,
  selectedRecord,
  hardwareSampleAvailable = false,
  hardwareLatestRaw = null,
  onFetchSatellite,
  onCaptureHardware,
}) {
  const [selectedPointId, setSelectedPointId] = useState("");
  const [draftPoint, setDraftPoint] = useState(null);
  const [metric, setMetric] = useState("irradiance");
  const [hardwareMode, setHardwareMode] = useState(hardwareSampleAvailable ? "latest" : "demo");
  const [status, setStatus] = useState("");
  const [showPointPicker, setShowPointPicker] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [loadingSatellite, setLoadingSatellite] = useState(false);
  const [loadingHardware, setLoadingHardware] = useState(false);

  const pointGroups = useMemo(() => buildPointGroups(records), [records]);
  const selectedRecordPoint = useMemo(() => {
    return findPointForRecord(pointGroups, selectedRecord) || pointFromRecord(selectedRecord);
  }, [pointGroups, selectedRecord]);

  const effectiveSelectedPointId = selectedPointId || pointGroups[0]?.pointId || "";
  const storedPoint = useMemo(() => {
    if (!effectiveSelectedPointId) return null;
    return pointGroups.find((point) => point.pointId === effectiveSelectedPointId) || null;
  }, [pointGroups, effectiveSelectedPointId]);

  const activePoint = draftPoint || storedPoint || selectedRecordPoint || pointGroups[0] || null;
  const selectedMetric = getMetricMeta(metric);
  const effectiveHardwareMode = hardwareSampleAvailable ? hardwareMode : "demo";
  const metricState = useMemo(() => activePoint?.metrics?.[metric] || {}, [activePoint, metric]);
  const comparison = useMemo(() => buildComparison(metricState.satellite, metricState.hardware), [metricState]);
  const readyRows = useMemo(() => buildComparableRows(activePoint), [activePoint]);
  const guidance = buildGuidance({ activePoint, metricState, comparison, metricLabel: selectedMetric.label });
  const metricAvailableForHardware = isHardwareMetricAvailable(metric, effectiveHardwareMode, hardwareLatestRaw);

  async function readCurrentGps() {
    setStatus("");
    setLoadingGps(true);

    try {
      const position = await readBrowserPosition();
      const point = makePoint({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        name: "Current GPS",
        sourceLabel: "GPS",
        accuracy: position.coords.accuracy,
      });
      setDraftPoint(point);
      setSelectedPointId(point.pointId);
      setHardwareMode(hardwareSampleAvailable ? "latest" : "demo");
      setStatus("GPS point selected. Save satellite, hardware, or both; comparison will use the stored records.");
    } catch (error) {
      setStatus(error.message || "Could not read GPS coordinates.");
    } finally {
      setLoadingGps(false);
    }
  }

  function useSelectedRecordLocation() {
    if (!selectedRecordPoint) {
      setStatus("The selected record has no coordinates.");
      return;
    }

    const pointId = getRecordPointId(selectedRecord) || selectedRecordPoint.pointId;
    setDraftPoint(null);
    setSelectedPointId(pointId);
    if (COMPARISON_METRICS.some((item) => item.value === selectedRecord?.metric)) {
      setMetric(selectedRecord.metric);
    }
    setStatus("Selected record point loaded. Comparison is based on records already stored for this point.");
  }

  function choosePoint(point) {
    setDraftPoint(null);
    setSelectedPointId(point.pointId);
    const firstReady = point.comparableRows?.[0]?.metric;
    const firstMetric = firstReady || COMPARISON_METRICS.find((item) => point.metrics[item.value])?.value;
    if (firstMetric) setMetric(firstMetric);
    setStatus("");
    setShowPointPicker(false);
  }

  async function fetchSatelliteForPoint() {
    if (!activePoint) {
      setStatus("Choose a point first.");
      return;
    }

    setLoadingSatellite(true);
    setStatus("");

    try {
      await onFetchSatellite({
        source: "satellite",
        location: activePoint.name || "Comparison point",
        lat: activePoint.lat,
        lng: activePoint.lng,
        pointId: activePoint.pointId || buildPointId(activePoint.lat, activePoint.lng),
        metric,
      });
      setDraftPoint(null);
      setSelectedPointId(activePoint.pointId || buildPointId(activePoint.lat, activePoint.lng));
      setStatus("Satellite record stored. It is now available for stored comparison at this point.");
    } catch (error) {
      setStatus(error.message || "Satellite fetch failed.");
    } finally {
      setLoadingSatellite(false);
    }
  }

  async function captureHardwareForPoint() {
    if (!activePoint) {
      setStatus("Choose a point first.");
      return;
    }

    if (!metricAvailableForHardware) {
      setStatus(`${selectedMetric.label} is not present in the latest ESP32 sample.`);
      return;
    }

    setLoadingHardware(true);
    setStatus("");

    try {
      await onCaptureHardware({
        source: "hardware",
        location: activePoint.name || "Comparison point",
        lat: activePoint.lat,
        lng: activePoint.lng,
        pointId: activePoint.pointId || buildPointId(activePoint.lat, activePoint.lng),
        mode: effectiveHardwareMode,
      });
      setDraftPoint(null);
      setSelectedPointId(activePoint.pointId || buildPointId(activePoint.lat, activePoint.lng));
      setStatus(effectiveHardwareMode === "demo"
        ? "Demo hardware reading stored. It can now be compared with stored satellite records."
        : "ESP32 hardware reading stored. It can now be compared with stored satellite records.");
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
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Stored Satellite And Hardware Comparison</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, maxWidth: 820 }}>
            Pick a point from stored data, GPS, selected record, or the map. Comparison uses saved records with the same point and metric.
          </div>
        </div>

        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setShowPointPicker((value) => !value)} style={pointPickerButtonStyle}>
            Available Points
            <span style={{ color: "var(--muted-2)", fontFamily: "'Space Mono', monospace" }}>{pointGroups.length}</span>
          </button>
          {showPointPicker && (
            <PointPicker
              points={pointGroups}
              activePointId={activePoint?.pointId}
              onPick={choosePoint}
            />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Comparison Point</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8, minHeight: 22 }}>
            {activePoint?.name || "No point selected"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <ValuePill label="Lat" value={activePoint ? activePoint.lat.toFixed(5) : "not set"} />
            <ValuePill label="Lng" value={activePoint ? activePoint.lng.toFixed(5) : "not set"} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <ValuePill label="Satellite" value={activePoint ? String(activePoint.satelliteCount || 0) : "0"} tone="cyan" />
            <ValuePill label="Hardware" value={activePoint ? String(activePoint.hardwareCount || 0) : "0"} tone="green" />
          </div>
          {activePoint?.accuracy != null && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              GPS accuracy: {Math.round(activePoint.accuracy)} m
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={readCurrentGps} disabled={loadingGps} style={buttonStyle("primary", loadingGps)}>
              {loadingGps ? "Reading..." : "Use GPS"}
            </button>
            <button onClick={useSelectedRecordLocation} style={buttonStyle("secondary")}>
              Use Selected
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Stored Matches</div>
          {readyRows.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {readyRows.map((row) => (
                <button
                  key={row.metric}
                  onClick={() => setMetric(row.metric)}
                  style={matchRowStyle(metric === row.metric)}
                >
                  <span>
                    <span style={{ fontWeight: 700 }}>{row.label}</span>
                    <span style={{ color: "var(--muted)", marginLeft: 6 }}>
                      Δ {row.diff.toFixed(2)} {row.unit}
                    </span>
                  </span>
                  <span style={{ color: row.match >= 90 ? "var(--green)" : "var(--amber)", fontFamily: "'Space Mono', monospace" }}>
                    {row.match.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={emptyStateStyle}>
              No complete satellite and hardware pair is stored for this point yet.
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div className="section-label" style={{ marginBottom: 7 }}>Metric</div>
            <select value={metric} onChange={(event) => setMetric(event.target.value)}>
              {COMPARISON_METRICS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="section-label" style={{ marginBottom: 10 }}>Selected Metric Data</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <ValuePill
              label="Satellite"
              value={metricState.satellite ? `${metricState.satellite.value} ${metricState.satellite.unit || selectedMetric.unit}` : "missing"}
              tone="cyan"
            />
            <ValuePill
              label="Hardware"
              value={metricState.hardware ? `${metricState.hardware.value} ${metricState.hardware.unit || selectedMetric.unit}` : "missing"}
              tone="green"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            <button
              onClick={fetchSatelliteForPoint}
              disabled={loadingSatellite || !activePoint}
              style={buttonStyle("primary", loadingSatellite || !activePoint)}
            >
              {loadingSatellite ? "Fetching..." : metricState.satellite ? "Refresh Satellite" : "Fetch Satellite"}
            </button>
            <button
              onClick={captureHardwareForPoint}
              disabled={loadingHardware || !activePoint || !metricAvailableForHardware}
              style={buttonStyle("green", loadingHardware || !activePoint || !metricAvailableForHardware)}
            >
              {loadingHardware ? "Saving..." : "Save Hardware"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
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
              ? `${selectedMetric.label}: stored satellite ${comparison.satellite.toFixed(2)} vs stored hardware ${comparison.hardware.toFixed(2)}. Difference ${comparison.diff.toFixed(2)} ${selectedMetric.unit} (${comparison.diffPct.toFixed(1)}%).`
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

function PointPicker({ points, activePointId, onPick }) {
  return (
    <div style={pointPickerMenuStyle}>
      {points.length === 0 ? (
        <div style={{ padding: 14, color: "var(--muted)", fontSize: 12 }}>
          No stored points yet
        </div>
      ) : (
        points.map((point) => (
          <button
            key={point.pointId}
            onClick={() => onPick(point)}
            style={pointOptionStyle(point.pointId === activePointId)}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {point.name}
              </span>
              <span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </span>
            </span>
            <span style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ color: point.readyCount ? "var(--amber)" : "var(--muted-2)", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
                {point.readyCount} match{point.readyCount === 1 ? "" : "es"}
              </span>
              <span style={{ display: "block", marginTop: 2, color: "var(--muted)", fontSize: 10 }}>
                S {point.satelliteCount} · H {point.hardwareCount}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function makePoint({ lat, lng, name, sourceLabel, accuracy }) {
  const pointId = buildPointId(lat, lng);

  return {
    key: pointId,
    pointId,
    name,
    sourceLabel,
    lat,
    lng,
    accuracy,
    records: [],
    satelliteRecords: [],
    hardwareRecords: [],
    satelliteCount: 0,
    hardwareCount: 0,
    metrics: {},
    comparableRows: [],
    readyCount: 0,
  };
}

function isHardwareMetricAvailable(metric, mode, latestRaw) {
  if (mode === "demo") return true;
  return latestRaw?.[metric] != null;
}

function buildGuidance({ activePoint, metricState, comparison, metricLabel }) {
  if (comparison) return "";
  if (!activePoint) return "Choose a stored point, use GPS, select a record, or click the map to add data.";
  if (!metricState.satellite && !metricState.hardware) return `${metricLabel} has no stored satellite or hardware data at this point yet. Store one or both sources first.`;
  if (!metricState.satellite) return `${metricLabel} is missing a stored satellite record at this point.`;
  if (!metricState.hardware) return `${metricLabel} is missing a stored hardware record at this point.`;
  return "";
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

  if (tone === "green") {
    return {
      width: "100%",
      opacity: disabled ? 0.55 : 1,
      background: "linear-gradient(135deg, rgba(74,222,128,0.18), rgba(74,222,128,0.08))",
      border: "1px solid var(--green-border)",
      color: "var(--green)",
      fontWeight: 700,
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

function matchRowStyle(active) {
  return {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    textAlign: "left",
    padding: "8px 10px",
    borderRadius: 9,
    background: active ? "rgba(251,191,36,0.1)" : "rgba(6,11,20,0.55)",
    border: active ? "1px solid var(--amber-border)" : "1px solid var(--border)",
    color: "var(--text)",
    cursor: "pointer",
  };
}

const pointPickerButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 12px",
  borderRadius: 99,
  background: "rgba(34,211,238,0.1)",
  border: "1px solid rgba(34,211,238,0.28)",
  color: "var(--primary)",
  fontSize: 11,
  fontFamily: "'Space Mono', monospace",
  whiteSpace: "nowrap",
};

const pointPickerMenuStyle = {
  position: "absolute",
  right: 0,
  top: 38,
  zIndex: 20,
  width: 330,
  maxHeight: 330,
  overflowY: "auto",
  padding: 8,
  borderRadius: 12,
  background: "rgba(6,11,20,0.98)",
  border: "1px solid var(--border-hover)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.42)",
};

function pointOptionStyle(active) {
  return {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    marginBottom: 6,
    borderRadius: 10,
    textAlign: "left",
    background: active ? "rgba(34,211,238,0.12)" : "rgba(10,18,32,0.65)",
    border: active ? "1px solid var(--primary-border)" : "1px solid var(--border)",
    cursor: "pointer",
  };
}

const emptyStateStyle = {
  padding: "18px 12px",
  borderRadius: 10,
  background: "rgba(6,11,20,0.45)",
  border: "1px solid var(--border)",
  color: "var(--muted)",
  fontSize: 13,
  lineHeight: 1.5,
};
