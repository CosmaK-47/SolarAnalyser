export default function StatCard({ label, value, accent = "cyan", icon }) {
  const colors = {
    cyan: {
      value: "var(--primary)",
      glow: "rgba(34,211,238,0.15)",
      border: "rgba(34,211,238,0.2)",
      bg: "rgba(34,211,238,0.04)",
    },
    green: {
      value: "var(--green)",
      glow: "rgba(74,222,128,0.15)",
      border: "rgba(74,222,128,0.2)",
      bg: "rgba(74,222,128,0.04)",
    },
    amber: {
      value: "var(--amber)",
      glow: "rgba(251,191,36,0.15)",
      border: "rgba(251,191,36,0.2)",
      bg: "rgba(251,191,36,0.04)",
    },
    violet: {
      value: "var(--violet)",
      glow: "rgba(167,139,250,0.15)",
      border: "rgba(167,139,250,0.2)",
      bg: "rgba(167,139,250,0.04)",
    },
  };

  const c = colors[accent] ?? colors.cyan;

  return (
    <div
      className="card"
      style={{
        background: c.bg,
        borderColor: c.border,
        boxShadow: `0 0 20px ${c.glow}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Corner decoration */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 60,
          height: 60,
          background: `radial-gradient(circle at top right, ${c.glow}, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontSize: 10,
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "'Space Mono', monospace",
          color: c.value,
          lineHeight: 1.1,
          textShadow: `0 0 20px ${c.glow}`,
        }}
      >
        {value}
      </div>
    </div>
  );
}
