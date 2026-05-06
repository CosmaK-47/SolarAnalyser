import { useState, useEffect } from "react";

const METRICS = [
  { value: "irradiance", label: "Irradiance", unit: "W/m²", color: "amber" },
  { value: "temperature", label: "Temperature", unit: "°C", color: "red" },
  { value: "humidity", label: "Humidity", unit: "%", color: "cyan" },
  { value: "uv_index", label: "UV Index", unit: "UVI", color: "violet" },
  { value: "wind_speed", label: "Wind Speed", unit: "m/s", color: "green" },
  { value: "pressure", label: "Pressure", unit: "hPa", color: "blue" },
  { value: "precipitation", label: "Precipitation", unit: "mm", color: "blue" },
];

const colorMap = {
  amber: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)", text: "var(--amber)" },
  red: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", text: "var(--red)" },
  cyan: { bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.3)", text: "var(--primary)" },
  violet: { bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.3)", text: "var(--violet)" },
  green: { bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)", text: "var(--green)" },
  blue: { bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.3)", text: "var(--primary)" },
};

export default function AddDataModal({ prefill, onAdd, onClose }) {
  const [form, setForm] = useState({
    source: prefill?.source || "hardware",
    location: prefill?.location || "",
    lat: prefill?.lat != null ? prefill.lat.toFixed(5) : "",
    lng: prefill?.lng != null ? prefill.lng.toFixed(5) : "",
    metric: prefill?.metric || "",
    value: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.location.trim()) errs.location = "Required";
    if (!form.metric) errs.metric = "Select a metric";
    if (form.value === "" || isNaN(parseFloat(form.value))) errs.value = "Enter a valid number";
    if (!form.date) errs.date = "Required";
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    onAdd({
      source: form.source,
      location: form.location.trim(),
      lat: form.lat !== "" ? parseFloat(form.lat) : undefined,
      lng: form.lng !== "" ? parseFloat(form.lng) : undefined,
      metric: form.metric,
      value: parseFloat(form.value),
      date: form.date,
      notes: form.notes.trim() || undefined,
    });

    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 900);
  }

  const selectedMetric = METRICS.find((m) => m.value === form.metric);

  return (
    /* Backdrop */
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
      {/* Modal */}
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: "linear-gradient(135deg, #0c1526 0%, #0a1220 100%)",
          border: "1px solid rgba(34,211,238,0.2)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(34,211,238,0.1), 0 40px 80px rgba(0,0,0,0.6)",
          animation: "modalIn 0.2s ease",
        }}
      >
        {/* Header */}
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
              NEW RECORD
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>
              Add Measurement
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(148,163,184,0.08)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "6px 10px",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {submitted ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--green)",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Record added!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Source toggle */}
              <div>
                <Label>Source</Label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {["satellite", "hardware"].map((s) => (
                    <button
                      key={s}
                      onClick={() => set("source", s)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        border: form.source === s
                          ? `1px solid ${s === "satellite" ? "var(--primary-border)" : "var(--green-border)"}`
                          : "1px solid var(--border)",
                        background: form.source === s
                          ? s === "satellite" ? "var(--primary-dim)" : "var(--green-dim)"
                          : "rgba(10,18,32,0.5)",
                        color: form.source === s
                          ? s === "satellite" ? "var(--primary)" : "var(--green)"
                          : "var(--muted)",
                        transition: "all 0.15s",
                      }}
                    >
                      {s === "satellite" ? "🛰 Satellite" : "🔧 Hardware"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <Label error={errors.location}>Location {errors.location && <Err>{errors.location}</Err>}</Label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Cairo, Egypt"
                  style={inputStyle(!!errors.location)}
                />
              </div>

              {/* Coordinates */}
              <div>
                <Label>Coordinates <span style={{ color: "var(--muted)", fontSize: 11 }}>(optional — auto-filled from map click)</span></Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                  <input
                    type="number"
                    value={form.lat}
                    onChange={(e) => set("lat", e.target.value)}
                    placeholder="Latitude"
                    step="0.00001"
                  />
                  <input
                    type="number"
                    value={form.lng}
                    onChange={(e) => set("lng", e.target.value)}
                    placeholder="Longitude"
                    step="0.00001"
                  />
                </div>
                {form.lat && form.lng && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                    📍 {parseFloat(form.lat).toFixed(4)}, {parseFloat(form.lng).toFixed(4)}
                  </div>
                )}
              </div>

              {/* Metric */}
              <div>
                <Label error={errors.metric}>Metric {errors.metric && <Err>{errors.metric}</Err>}</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 6 }}>
                  {METRICS.map(({ value, label, color }) => {
                    const c = colorMap[color];
                    const active = form.metric === value;
                    return (
                      <span
                        key={value}
                        onClick={() => set("metric", value)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          border: active ? `1px solid ${c.border}` : "1px solid var(--border)",
                          background: active ? c.bg : "rgba(10,18,32,0.5)",
                          color: active ? c.text : "var(--muted-2)",
                          transition: "all 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Value */}
              <div>
                <Label error={errors.value}>
                  Value {selectedMetric && (
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>in {selectedMetric.unit}</span>
                  )}
                  {errors.value && <Err>{errors.value}</Err>}
                </Label>
                <div style={{ position: "relative", marginTop: 6 }}>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    style={{ ...inputStyle(!!errors.value), paddingRight: selectedMetric ? 52 : 12 }}
                  />
                  {selectedMetric && (
                    <span style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 11,
                      fontFamily: "'Space Mono', monospace",
                      color: "var(--muted)",
                      pointerEvents: "none",
                    }}>
                      {selectedMetric.unit}
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div>
                <Label error={errors.date}>Date {errors.date && <Err>{errors.date}</Err>}</Label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  style={{ ...inputStyle(!!errors.date), marginTop: 6 }}
                />
              </div>

              {/* Notes */}
              <div>
                <Label>Notes <span style={{ color: "var(--muted)", fontSize: 11 }}>(optional)</span></Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any additional observations..."
                  rows={2}
                  style={{
                    ...inputStyle(false),
                    marginTop: 6,
                    resize: "vertical",
                    minHeight: 60,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background: "rgba(148,163,184,0.08)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={{
                    flex: 2,
                    padding: "10px 0",
                    background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.1))",
                    border: "1px solid var(--primary-border)",
                    color: "var(--primary)",
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(34,211,238,0.1)",
                  }}
                >
                  Add Record
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
      — {children}
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
