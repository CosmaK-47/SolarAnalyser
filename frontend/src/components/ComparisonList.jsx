import Badge from "./Badge";

export default function ComparisonList({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div
        className="panel"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(34,211,238,0.08)",
            border: "1px solid var(--primary-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h4M9 8h4M8 3v4M8 9v4"
              stroke="var(--primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            Satellite vs Hardware
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            No comparison data available yet
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel space-y-3">
      <div style={{ marginBottom: 4 }}>
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
          Comparison
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          Satellite vs Hardware
        </div>
      </div>

      {rows.map((r) => (
        <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>
              {r.location}{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                · {r.metric}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 3,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              <span style={{ color: "var(--primary)" }}>SAT</span> {r.satellite}{" "}
              &nbsp;|&nbsp;{" "}
              <span style={{ color: "var(--green)" }}>HW</span> {r.hardware}
            </div>
          </div>
          <Badge type={Math.abs(r.diff) < 5 ? "green" : "amber"}>
            Δ {r.diff.toFixed(2)}
          </Badge>
        </div>
      ))}
    </div>
  );
}
