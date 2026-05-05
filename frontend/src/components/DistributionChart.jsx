export default function DistributionChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  const metricColors = {
    irradiance: { bar: "var(--amber)", glow: "rgba(251,191,36,0.4)" },
    temperature: { bar: "var(--red)", glow: "rgba(248,113,113,0.4)" },
    humidity: { bar: "var(--primary)", glow: "rgba(34,211,238,0.4)" },
    uv_index: { bar: "var(--violet)", glow: "rgba(167,139,250,0.4)" },
    wind_speed: { bar: "var(--green)", glow: "rgba(74,222,128,0.4)" },
  };

  const visible = data.slice(0, 7);

  return (
    <div className="panel" style={{ gap: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 2,
            }}
          >
            Distribution
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
            Value Spread
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            color: "var(--muted)",
          }}
        >
          {data.length} records
        </div>
      </div>

      {/* Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((d) => {
          const pct = (d.value / max) * 100;
          const c = metricColors[d.metric] ?? {
            bar: "var(--primary)",
            glow: "rgba(34,211,238,0.4)",
          };

          return (
            <div key={d.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--muted-2)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: c.bar,
                      display: "inline-block",
                      boxShadow: `0 0 6px ${c.glow}`,
                    }}
                  />
                  {d.metric}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'Space Mono', monospace",
                    color: c.bar,
                  }}
                >
                  {d.value}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "rgba(148,163,184,0.08)",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${c.bar}cc, ${c.bar})`,
                    borderRadius: 99,
                    boxShadow: `0 0 8px ${c.glow}`,
                    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
