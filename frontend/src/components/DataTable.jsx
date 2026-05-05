import Badge from "./Badge";

export default function DataTable({ data }) {
  return (
    <div className="panel" style={{ padding: 0 }}>
      {/* Table header bar */}
      <div
        style={{
          padding: "16px 20px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
            Data Table
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Records</div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            padding: "4px 10px",
            borderRadius: 99,
            background: "var(--primary-dim)",
            color: "var(--primary)",
            border: "1px solid var(--primary-border)",
          }}
        >
          {data.length} rows
        </div>
      </div>

      <div style={{ padding: "0 20px", overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 110 }}>Source</th>
              <th>Location</th>
              <th>Metric</th>
              <th style={{ textAlign: "right" }}>Value</th>
              <th style={{ textAlign: "right", width: 90 }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id}>
                <td>
                  <Badge type={d.source === "satellite" ? "blue" : "green"}>
                    {d.source}
                  </Badge>
                </td>
                <td style={{ color: "var(--muted-2)", fontWeight: 400 }}>
                  {d.location}
                </td>
                <td>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "rgba(148,163,184,0.07)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {d.metric}
                  </span>
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: "var(--primary)",
                    fontWeight: 700,
                  }}
                >
                  {d.value}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  {d.date ? d.date.slice(0, 10) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--muted)",
              fontSize: 13,
            }}
          >
            No records match current filters
          </div>
        )}
      </div>

      <div
        style={{
          height: 16,
          background:
            "linear-gradient(to bottom, transparent, rgba(10,18,32,0.3))",
          borderTop: "1px solid var(--border)",
          borderRadius: "0 0 16px 16px",
        }}
      />
    </div>
  );
}
