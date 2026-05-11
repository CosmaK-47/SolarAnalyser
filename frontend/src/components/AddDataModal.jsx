import { useEffect, useMemo, useState } from "react";

import { readBrowserPosition } from "../utils/geolocation";

const METRICS = [
  { value: "irradiance", label: "Irradiance", unit: "W/m²", color: "amber" },
  { value: "temperature", label: "Temperature", unit: "°C", color: "red" },
  { value: "wind_speed", label: "Wind Speed", unit: "m/s", color: "green" },
  { value: "humidity", label: "Humidity", unit: "%", color: "cyan" },
  { value: "pressure", label: "Pressure", unit: "hPa", color: "blue" },
  { value: "elevation", label: "Elevation", unit: "m", color: "violet" },
  { value: "vegetation", label: "Vegetation", unit: "%", color: "green" },
  { value: "shading", label: "Shading", unit: "%", color: "amber" },
];

const ALL_METRIC_VALUES = METRICS.map((metric) => metric.value);

const colorMap = {
  amber: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", text: "var(--amber)" },
  red: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", text: "var(--red)" },
  cyan: { bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.3)", text: "var(--primary)" },
  violet: { bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.3)", text: "var(--violet)" },
  green: { bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)", text: "var(--green)" },
  blue: { bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.3)", text: "var(--primary)" },
};

export default function AddDataModal({ prefill, hardwareSampleAvailable = false, onAdd, onClose }) {
  const hasPrefilledCoordinates = prefill?.lat != null && prefill?.lng != null;
  const [form, setForm] = useState({
    source: prefill?.source || "satellite",
    location: prefill?.location || "",
    lat: prefill?.lat != null ? Number(prefill.lat).toFixed(5) : "",
    lng: prefill?.lng != null ? Number(prefill.lng).toFixed(5) : "",
    metrics: [prefill?.metric || "irradiance"],
    hardwareMode: hardwareSampleAvailable ? "latest" : "demo",
    coordinateSource: hasPrefilledCoordinates ? "map" : "manual",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [readingGps, setReadingGps] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function set(key, val) {
    setForm((current) => ({ ...current, [key]: val }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError("");
  }

  function validate() {
    const errs = {};
    const lat = Number(form.lat);
    const lng = Number(form.lng);

    if (form.source === "satellite" && form.metrics.length === 0) errs.metrics = "Select at least one";
    if (form.lat === "" || Number.isNaN(lat) || lat < -90 || lat > 90) errs.lat = "Invalid latitude";
    if (form.lng === "" || Number.isNaN(lng) || lng < -180 || lng > 180) errs.lng = "Invalid longitude";

    return errs;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await onAdd({
        source: form.source,
        location: form.location.trim() || `Point ${Number(form.lat).toFixed(5)}, ${Number(form.lng).toFixed(5)}`,
        lat: Number(form.lat),
        lng: Number(form.lng),
        metrics: form.source === "satellite" ? form.metrics : undefined,
        mode: effectiveHardwareMode,
      });
      setResult(response?.records ? { records: response.records } : response?.measurement || true);
      setTimeout(onClose, 1100);
    } catch (error) {
      setSubmitError(error.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function readCurrentGps() {
    setReadingGps(true);
    setSubmitError("");

    try {
      const position = await readBrowserPosition();
      setForm((current) => ({
        ...current,
        lat: position.coords.latitude.toFixed(5),
        lng: position.coords.longitude.toFixed(5),
        location: current.location.trim() ? current.location : "Current GPS",
        coordinateSource: "gps",
      }));
      setErrors((current) => ({ ...current, lat: undefined, lng: undefined }));
    } catch (error) {
      setSubmitError(error.message || "Could not read GPS coordinates.");
    } finally {
      setReadingGps(false);
    }
  }

  function toggleMetric(value) {
    setForm((current) => {
      const active = current.metrics.includes(value);
      return {
        ...current,
        metrics: active
          ? current.metrics.filter((metric) => metric !== value)
          : [...current.metrics, value],
      };
    });
    setErrors((current) => ({ ...current, metrics: undefined }));
    setSubmitError("");
  }

  function selectAllMetrics() {
    set("metrics", ALL_METRIC_VALUES);
  }

  function clearMetrics() {
    set("metrics", []);
  }

  const selectedMetrics = METRICS.filter((metric) => form.metrics.includes(metric.value));
  const allMetricsSelected = selectedMetrics.length === METRICS.length;
  const effectiveHardwareMode = hardwareSampleAvailable ? form.hardwareMode : "demo";
  const coordinateLabel = useMemo(() => {
    if (form.coordinateSource === "gps") return "Current GPS";
    if (form.coordinateSource === "map") return "Map point";
    return "Manual coordinate";
  }, [form.coordinateSource]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,11,20,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          background: "linear-gradient(135deg, #0c1526 0%, #0a1220 100%)",
          border: "1px solid rgba(34,211,238,0.2)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(34,211,238,0.1), 0 40px 80px rgba(0,0,0,0.6)",
          animation: "modalIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(34,211,238,0.04)",
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em", color: "var(--primary)", marginBottom: 3 }}>
              DATA INGEST
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>
              Add Data
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        <div style={{ padding: 24 }}>
          {result ? (
            <SuccessState record={result} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Label>Source</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                  <SourceButton active={form.source === "satellite"} onClick={() => set("source", "satellite")} tone="satellite">
                    Satellite data
                  </SourceButton>
                  <SourceButton active={form.source === "hardware"} onClick={() => set("source", "hardware")} tone="hardware">
                    Hardware reading
                  </SourceButton>
                </div>
              </div>

              <div>
                <Label>Point name <span style={{ color: "var(--muted)", fontSize: 11 }}>(optional)</span></Label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder={coordinateLabel === "Map point" ? "Map point" : "e.g. roof test point"}
                  style={{ ...inputStyle(false), marginTop: 6 }}
                />
              </div>

              <div>
                <Label error={errors.lat || errors.lng}>
                  Coordinates
                  {(errors.lat || errors.lng) && <Err>{errors.lat || errors.lng}</Err>}
                </Label>
                <div style={{
                  marginTop: 6,
                  marginBottom: 8,
                  padding: "9px 11px",
                  borderRadius: 10,
                  background: form.coordinateSource === "map" ? "rgba(248,113,113,0.06)" : "rgba(34,211,238,0.05)",
                  border: form.coordinateSource === "map" ? "1px solid rgba(248,113,113,0.18)" : "1px solid rgba(34,211,238,0.14)",
                  color: "var(--muted-2)",
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}>
                  <span>
                    {coordinateLabel}
                    {form.coordinateSource === "map" && " selected from the map"}
                  </span>
                  {!hasPrefilledCoordinates && (
                    <button
                      onClick={readCurrentGps}
                      disabled={readingGps}
                      style={{
                        padding: "5px 10px",
                        whiteSpace: "nowrap",
                        opacity: readingGps ? 0.65 : 1,
                        cursor: readingGps ? "wait" : "pointer",
                      }}
                    >
                      {readingGps ? "Reading..." : "Use GPS"}
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="number"
                    value={form.lat}
                    onChange={(e) => {
                      set("lat", e.target.value);
                      if (!hasPrefilledCoordinates) set("coordinateSource", "manual");
                    }}
                    placeholder="Latitude"
                    step="0.00001"
                    style={inputStyle(!!errors.lat)}
                  />
                  <input
                    type="number"
                    value={form.lng}
                    onChange={(e) => {
                      set("lng", e.target.value);
                      if (!hasPrefilledCoordinates) set("coordinateSource", "manual");
                    }}
                    placeholder="Longitude"
                    step="0.00001"
                    style={inputStyle(!!errors.lng)}
                  />
                </div>
              </div>

              {form.source === "hardware" ? (
                <HardwareCaptureState
                  activeMode={effectiveHardwareMode}
                  set={set}
                  hardwareSampleAvailable={hardwareSampleAvailable}
                />
              ) : (
                <>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <Label error={errors.metrics}>Satellite Data Types {errors.metrics && <Err>{errors.metrics}</Err>}</Label>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={selectAllMetrics}
                          disabled={allMetricsSelected}
                          style={smallActionButtonStyle(allMetricsSelected)}
                        >
                          Select all
                        </button>
                        <button
                          onClick={clearMetrics}
                          disabled={selectedMetrics.length === 0}
                          style={smallActionButtonStyle(selectedMetrics.length === 0)}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 6 }}>
                      {METRICS.map(({ value, label, color }) => {
                        const c = colorMap[color];
                        const active = form.metrics.includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => toggleMetric(value)}
                            style={{
                              padding: "6px 11px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              border: active ? `1px solid ${c.border}` : "1px solid var(--border)",
                              background: active ? c.bg : "rgba(10,18,32,0.5)",
                              color: active ? c.text : "var(--muted-2)",
                              boxShadow: active ? `0 0 12px ${c.bg}` : "none",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {selectedMetrics.length > 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                        The backend will fetch and store {selectedMetrics.length} satellite record{selectedMetrics.length > 1 ? "s" : ""} for this coordinate.
                      </div>
                    )}
                  </div>

                </>
              )}

              {submitError && (
                <div style={errorPanelStyle}>
                  {submitError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={onClose} style={secondaryButtonStyle}>
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: "10px 0",
                    opacity: submitting ? 0.65 : 1,
                    background: form.source === "hardware"
                      ? "linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))"
                      : "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.1))",
                    border: form.source === "hardware" ? "1px solid var(--green-border)" : "1px solid var(--primary-border)",
                    color: form.source === "hardware" ? "var(--green)" : "var(--primary)",
                    fontWeight: 700,
                    cursor: submitting ? "wait" : "pointer",
                    boxShadow: form.source === "hardware" ? "0 0 20px rgba(74,222,128,0.1)" : "0 0 20px rgba(34,211,238,0.1)",
                  }}
                >
                  {submitting ? "Saving..." : form.source === "hardware" ? "Save Hardware Reading" : "Fetch Satellite Data"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function SourceButton({ active, onClick, tone, children }) {
  const isHardware = tone === "hardware";
  const color = isHardware ? "var(--green)" : "var(--primary)";
  const border = isHardware ? "var(--green-border)" : "var(--primary-border)";
  const bg = isHardware ? "var(--green-dim)" : "var(--primary-dim)";

  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 0",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        border: active ? `1px solid ${border}` : "1px solid var(--border)",
        background: active ? bg : "rgba(10,18,32,0.5)",
        color: active ? color : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

function HardwareCaptureState({ activeMode, set, hardwareSampleAvailable }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        background: "rgba(74,222,128,0.06)",
        border: "1px solid rgba(74,222,128,0.2)",
      }}
    >
      <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--green)", letterSpacing: "0.1em", marginBottom: 8 }}>
        HARDWARE INGEST
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
        Store A Hardware Reading At This Point
      </div>
      <div style={{ fontSize: 13, color: "var(--muted-2)", lineHeight: 1.6 }}>
        Demo creates a realistic reading for testing. ESP32 uses the latest raw device sample and attaches these coordinates so it can be compared with satellite data.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
        <button
          onClick={() => hardwareSampleAvailable && set("hardwareMode", "latest")}
          disabled={!hardwareSampleAvailable}
          style={captureModeStyle(activeMode === "latest", "green", !hardwareSampleAvailable)}
        >
          {hardwareSampleAvailable ? "ESP32 reading" : "ESP32 unavailable"}
        </button>
        <button
          onClick={() => set("hardwareMode", "demo")}
          style={captureModeStyle(activeMode === "demo", "amber")}
        >
          Demo reading
        </button>
      </div>
    </div>
  );
}

function captureModeStyle(active, tone, disabled = false) {
  const isAmber = tone === "amber";

  return {
    padding: "8px 10px",
    borderRadius: 10,
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

function SuccessState({ record }) {
  const records = record?.records || [];

  return (
    <div style={{ textAlign: "center", padding: "34px 0", color: "var(--green)" }}>
      <div style={{ fontSize: 34, marginBottom: 12 }}>✓</div>
      <div style={{ fontWeight: 700, fontSize: 16 }}>
        {records.length > 1 ? `${records.length} records stored` : "Record stored"}
      </div>
      {records.length > 0 && (
        <div style={{ fontSize: 13, color: "var(--muted-2)", marginTop: 8 }}>
          {records.map((item) => item.label || item.metric).join(", ")}
        </div>
      )}
      {!records.length && record?.metric && (
        <div style={{ fontSize: 13, color: "var(--muted-2)", marginTop: 8 }}>
          {record.label || record.metric}: <span style={{ color: "var(--primary)", fontFamily: "'Space Mono', monospace" }}>{record.value} {record.unit}</span>
        </div>
      )}
    </div>
  );
}

function Label({ children, error }) {
  return (
    <div style={{
      fontSize: 11,
      fontFamily: "'Space Mono', monospace",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: error ? "var(--red)" : "var(--muted)",
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}>
      {children}
    </div>
  );
}

function Err({ children }) {
  return (
    <span style={{ fontSize: 10, color: "var(--red)", textTransform: "none", letterSpacing: 0 }}>
      - {children}
    </span>
  );
}

function inputStyle(hasError) {
  return {
    display: "block",
    width: "100%",
    background: "rgba(6,11,20,0.6)",
    border: `1px solid ${hasError ? "var(--red-border)" : "var(--border)"}`,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    color: "var(--text)",
    outline: "none",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxShadow: hasError ? "0 0 0 2px rgba(248,113,113,0.1)" : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
}

const closeButtonStyle = {
  background: "rgba(148,163,184,0.08)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "5px 9px",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1,
};

const secondaryButtonStyle = {
  flex: 1,
  padding: "10px 0",
  background: "rgba(148,163,184,0.08)",
  border: "1px solid var(--border)",
  color: "var(--muted)",
  cursor: "pointer",
};

const errorPanelStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(248,113,113,0.08)",
  border: "1px solid rgba(248,113,113,0.22)",
  color: "var(--red)",
  fontSize: 12,
};

function smallActionButtonStyle(disabled) {
  return {
    padding: "4px 8px",
    borderRadius: 8,
    fontSize: 11,
    background: disabled ? "rgba(148,163,184,0.05)" : "rgba(34,211,238,0.08)",
    border: disabled ? "1px solid var(--border)" : "1px solid var(--primary-border)",
    color: disabled ? "var(--muted)" : "var(--primary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}
