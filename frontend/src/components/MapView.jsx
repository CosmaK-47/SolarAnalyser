import { useEffect, useRef, useState, useCallback } from "react";

const METRIC_COLORS = {
  irradiance: { color: "#fbbf24", label: "Irradiance", unit: "W/m²" },
  temperature: { color: "#f87171", label: "Temperature", unit: "°C" },
  humidity: { color: "#22d3ee", label: "Humidity", unit: "%" },
  uv_index: { color: "#a78bfa", label: "UV Index", unit: "UVI" },
  wind_speed: { color: "#4ade80", label: "Wind Speed", unit: "m/s" },
  pressure: { color: "#38bdf8", label: "Pressure", unit: "hPa" },
  precipitation: { color: "#818cf8", label: "Precipitation", unit: "mm" },
};

export default function MapView({ data, onAddData }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const tempMarkerRef = useRef(null);
  const [ready, setReady] = useState(!!window.L);
  const [panel, setPanel] = useState(null); // null | { type: 'location'|'newpoint', ... }

  // ── Load Leaflet ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setReady(true); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;

    const map = L.map(containerRef.current, {
      center: [20, 15],
      zoom: 2,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const attr = L.control.attribution({ prefix: false, position: "bottomleft" });
    attr.addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>');
    attr.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    // Click on empty map
    map.on("click", (e) => {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }

      const marker = L.circleMarker([e.latlng.lat, e.latlng.lng], {
        radius: 8,
        fillColor: "#f87171",
        color: "#0c1526",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7,
        className: "temp-marker",
      }).addTo(map);

      tempMarkerRef.current = marker;
      setPanel({ type: "newpoint", lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
  }, [ready]);

  // ── Rebuild markers when data changes ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current || !ready) return;
    const L = window.L;
    const group = layerGroupRef.current;
    group.clearLayers();

    // Group by location (only those with lat/lng)
    const byLocation = {};
    data.forEach((d) => {
      if (d.lat == null || d.lng == null) return;
      if (!byLocation[d.location]) {
        byLocation[d.location] = { lat: d.lat, lng: d.lng, records: [] };
      }
      byLocation[d.location].records.push(d);
    });

    Object.entries(byLocation).forEach(([location, { lat, lng, records }]) => {
      const hasSat = records.some((r) => r.source === "satellite");
      const hasHW = records.some((r) => r.source === "hardware");

      let fillColor, glowColor;
      if (hasSat && hasHW) {
        fillColor = "#fbbf24"; glowColor = "rgba(251,191,36,0.35)";
      } else if (hasSat) {
        fillColor = "#22d3ee"; glowColor = "rgba(34,211,238,0.35)";
      } else {
        fillColor = "#4ade80"; glowColor = "rgba(74,222,128,0.35)";
      }

      // Pulse ring
      L.circleMarker([lat, lng], {
        radius: 15,
        fillColor: glowColor,
        color: "transparent",
        fillOpacity: 0.5,
        interactive: false,
      }).addTo(group);

      // Core marker
      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor,
        color: "#0c1526",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95,
      });

      marker.on("click", (e) => {
        // Stop click from also firing map click
        window.L.DomEvent.stopPropagation(e);
        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove();
          tempMarkerRef.current = null;
        }
        setPanel({ type: "location", location, lat, lng, records });
      });

      marker.addTo(group);
    });
  }, [data, ready]);

  const closePanel = useCallback(() => {
    setPanel(null);
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
    }
  }, []);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--border)",
        height: 560,
        background: "#060b14",
      }}
    >
      {/* Section label strip */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 800,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            padding: "6px 14px",
            borderRadius: 99,
            background: "rgba(12,21,38,0.85)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="6" r="3" stroke="#22d3ee" strokeWidth="1.5"/>
            <path d="M7 9v4M4.5 6.5C3 7 2 8 2 9.5c0 2 2.2 3.5 5 3.5s5-1.5 5-3.5c0-1.5-1-2.5-2.5-3" stroke="#22d3ee" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: "0.08em", color: "var(--primary)", textTransform: "uppercase" }}>
            Geo Map
          </span>
        </div>

        {/* Legend */}
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 99,
            background: "rgba(12,21,38,0.85)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 11,
            color: "var(--muted-2)",
          }}
        >
          <LegendDot color="#22d3ee" label="Satellite" />
          <LegendDot color="#4ade80" label="Hardware" />
          <LegendDot color="#fbbf24" label="Both" />
        </div>
      </div>

      {/* Add data button */}
      <div style={{ position: "absolute", top: 16, right: panel ? 348 : 16, zIndex: 800, transition: "right 0.3s" }}>
        <button
          onClick={() => onAddData({})}
          style={{
            padding: "7px 14px",
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 600,
            background: "rgba(34,211,238,0.15)",
            border: "1px solid var(--primary-border)",
            color: "var(--primary)",
            cursor: "pointer",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 0 12px rgba(34,211,238,0.15)",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          Add Data
        </button>
      </div>

      {/* Map container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Side panel */}
      {panel && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 340,
            background: "linear-gradient(180deg, rgba(8,14,28,0.97) 0%, rgba(6,11,20,0.97) 100%)",
            borderLeft: "1px solid var(--border)",
            backdropFilter: "blur(20px)",
            zIndex: 900,
            overflowY: "auto",
            animation: "slideIn 0.22s ease",
          }}
        >
          {panel.type === "location" ? (
            <LocationPanel
              panel={panel}
              onClose={closePanel}
              onAddData={onAddData}
            />
          ) : (
            <NewPointPanel
              panel={panel}
              onClose={closePanel}
              onAddData={onAddData}
            />
          )}
        </div>
      )}

      {/* Click hint */}
      {!panel && (
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "7px 14px",
            borderRadius: 99,
            background: "rgba(12,21,38,0.75)",
            border: "1px solid var(--border)",
            backdropFilter: "blur(10px)",
            fontSize: 11,
            color: "var(--muted)",
            zIndex: 800,
            pointerEvents: "none",
          }}
        >
          Click a marker to view data · Click the map to add a measurement
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .leaflet-control-zoom a {
          background: rgba(12,21,38,0.9) !important;
          border: 1px solid rgba(148,163,184,0.15) !important;
          color: #94a3b8 !important;
          border-radius: 8px !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(20,35,60,0.9) !important;
          color: #22d3ee !important;
        }
        .leaflet-attribution-flag { display: none !important; }
        .leaflet-control-attribution {
          background: rgba(6,11,20,0.7) !important;
          color: #475569 !important;
          font-size: 10px !important;
          border-radius: 6px !important;
          padding: 2px 6px !important;
          backdrop-filter: blur(8px);
        }
        .leaflet-control-attribution a { color: #64748b !important; }
      `}</style>
    </div>
  );
}

/* ─── Location Panel ─────────────────────────────────────────────────── */
function LocationPanel({ panel, onClose, onAddData }) {
  const { location, lat, lng, records } = panel;

  const satRecords = records.filter((r) => r.source === "satellite");
  const hwRecords = records.filter((r) => r.source === "hardware");
  const hasHW = hwRecords.length > 0;

  return (
    <div style={{ padding: 20, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 4 }}>
            LOCATION
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", wordBreak: "break-word" }}>
            {location}
          </div>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "var(--muted)", marginTop: 3 }}>
            {lat?.toFixed(4)}, {lng?.toFixed(4)}
          </div>
        </div>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </div>

      {/* Summary badges */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {satRecords.length > 0 && (
          <span style={{ ...tagStyle, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)", color: "var(--primary)" }}>
            🛰 {satRecords.length} satellite
          </span>
        )}
        {hasHW ? (
          <span style={{ ...tagStyle, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "var(--green)" }}>
            🔧 {hwRecords.length} hardware
          </span>
        ) : (
          <span style={{ ...tagStyle, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "var(--red)" }}>
            No hardware
          </span>
        )}
      </div>

      {/* Satellite data */}
      {satRecords.length > 0 && (
        <SourceSection
          title="Satellite"
          color="var(--primary)"
          records={satRecords}
        />
      )}

      {/* Hardware data */}
      {hasHW && (
        <SourceSection
          title="Hardware"
          color="var(--green)"
          records={hwRecords}
        />
      )}

      {/* Comparison if both exist */}
      {satRecords.length > 0 && hasHW && (
        <ComparisonMini sat={satRecords} hw={hwRecords} />
      )}

      {/* CTA to add hardware data */}
      <div
        style={{
          marginTop: 16,
          padding: "14px",
          borderRadius: 12,
          background: hasHW ? "rgba(34,211,238,0.05)" : "rgba(74,222,128,0.06)",
          border: `1px solid ${hasHW ? "rgba(34,211,238,0.15)" : "rgba(74,222,128,0.2)"}`,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 10 }}>
          {hasHW
            ? "Add more measurements for this location"
            : "No hardware measurements yet. Add ground-truth data:"}
        </div>
        <button
          onClick={() => onAddData({ location, lat, lng, source: "hardware" })}
          style={{
            width: "100%",
            padding: "9px 0",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: hasHW ? "rgba(34,211,238,0.12)" : "rgba(74,222,128,0.12)",
            border: `1px solid ${hasHW ? "rgba(34,211,238,0.3)" : "rgba(74,222,128,0.3)"}`,
            color: hasHW ? "var(--primary)" : "var(--green)",
          }}
        >
          {hasHW ? "+ Add Measurement" : "🔧 Add Hardware Data"}
        </button>
      </div>
    </div>
  );
}

/* ─── New Point Panel ───────────────────────────────────────────────── */
function NewPointPanel({ panel, onClose, onAddData }) {
  const { lat, lng } = panel;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--red)", letterSpacing: "0.08em", marginBottom: 4 }}>
            NEW LOCATION
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
            Pinned Location
          </div>
        </div>
        <button onClick={onClose} style={closeBtn}>✕</button>
      </div>

      <div
        style={{
          padding: "14px",
          borderRadius: 12,
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.2)",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--muted)", marginBottom: 6 }}>COORDINATES</div>
        <div style={{ fontSize: 13, fontFamily: "'Space Mono', monospace", color: "var(--text)" }}>
          <div>LAT: <span style={{ color: "var(--primary)" }}>{lat.toFixed(5)}</span></div>
          <div>LNG: <span style={{ color: "var(--primary)" }}>{lng.toFixed(5)}</span></div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: "var(--muted-2)", marginBottom: 16, lineHeight: 1.6 }}>
        No existing measurements at this location. Add a new hardware or satellite record here.
      </div>

      <button
        onClick={() => onAddData({ lat, lng, source: "hardware" })}
        style={{
          width: "100%",
          padding: "11px 0",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          background: "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.08))",
          border: "1px solid rgba(74,222,128,0.3)",
          color: "var(--green)",
          marginBottom: 8,
          boxShadow: "0 0 16px rgba(74,222,128,0.08)",
        }}
      >
        🔧 Add Hardware Data Here
      </button>
      <button
        onClick={() => onAddData({ lat, lng, source: "satellite" })}
        style={{
          width: "100%",
          padding: "11px 0",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(34,211,238,0.08))",
          border: "1px solid var(--primary-border)",
          color: "var(--primary)",
          boxShadow: "0 0 16px rgba(34,211,238,0.08)",
        }}
      >
        🛰 Add Satellite Data Here
      </button>
    </div>
  );
}

/* ─── Source Section ────────────────────────────────────────────────── */
function SourceSection({ title, color, records }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color, letterSpacing: "0.08em", marginBottom: 8 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {records.slice(0, 5).map((r) => {
          const m = METRIC_COLORS[r.metric] || { color: "#94a3b8", label: r.metric, unit: "" };
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(148,163,184,0.05)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, display: "inline-block", flexShrink: 0, boxShadow: `0 0 5px ${m.color}` }} />
                <span style={{ fontSize: 12, color: "var(--muted-2)" }}>{m.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: m.color }}>
                  {r.value}
                </span>
                <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'Space Mono', monospace" }}>
                  {m.unit}
                </span>
              </div>
            </div>
          );
        })}
        {records.length > 5 && (
          <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", padding: "4px 0" }}>
            +{records.length - 5} more
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Comparison Mini ─────────────────────────────────────────────── */
function ComparisonMini({ sat, hw }) {
  const satByMetric = Object.fromEntries(sat.map((r) => [r.metric, r.value]));
  const hwByMetric = Object.fromEntries(hw.map((r) => [r.metric, r.value]));
  const sharedMetrics = Object.keys(satByMetric).filter((m) => hwByMetric[m] != null);

  if (!sharedMetrics.length) return null;

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "12px",
        borderRadius: 12,
        background: "rgba(251,191,36,0.05)",
        border: "1px solid rgba(251,191,36,0.15)",
      }}
    >
      <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--amber)", letterSpacing: "0.08em", marginBottom: 10 }}>
        SAT VS HW DIFF
      </div>
      {sharedMetrics.map((metric) => {
        const sv = satByMetric[metric];
        const hv = hwByMetric[metric];
        const diff = sv - hv;
        const m = METRIC_COLORS[metric] || { color: "#94a3b8", unit: "" };
        return (
          <div key={metric} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 12 }}>
            <span style={{ color: "var(--muted-2)" }}>{metric}</span>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              color: Math.abs(diff) < 5 ? "var(--green)" : "var(--amber)",
              fontSize: 12,
            }}>
              {diff > 0 ? "+" : ""}{diff.toFixed(2)} {m.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Legend Dot ─────────────────────────────────────────────────────── */
function LegendDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 6px ${color}` }} />
      <span>{label}</span>
    </span>
  );
}

/* ─── Shared styles ──────────────────────────────────────────────────── */
const closeBtn = {
  background: "rgba(148,163,184,0.08)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "5px 9px",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1,
  flexShrink: 0,
};

const tagStyle = {
  padding: "3px 10px",
  borderRadius: 99,
  fontSize: 11,
  fontWeight: 500,
};
