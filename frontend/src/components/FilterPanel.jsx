export default function FilterPanel({ filters, setFilters }) {
  const sources = [
    { value: "satellite", label: "Satellite", color: "cyan" },
    { value: "hardware", label: "Hardware", color: "green" },
  ];

  const metrics = [
    { value: "irradiance", label: "Irradiance", color: "amber" },
    { value: "temperature", label: "Temperature", color: "cyan" },
    { value: "humidity", label: "Humidity", color: "violet" },
    { value: "uv_index", label: "UV Index", color: "amber" },
    { value: "wind_speed", label: "Wind Speed", color: "green" },
  ];

  function toggleSource(val) {
    const current = filters.sources ?? [];
    const next = current.includes(val)
      ? current.filter((s) => s !== val)
      : [...current, val];
    setFilters({ ...filters, sources: next });
  }

  function toggleMetric(val) {
    const current = filters.metrics ?? [];
    const next = current.includes(val)
      ? current.filter((m) => m !== val)
      : [...current, val];
    setFilters({ ...filters, metrics: next });
  }

  function clearAll() {
    setFilters({ sources: [], metrics: [], fromDate: "", toDate: "" });
  }

  const activeSources = filters.sources ?? [];
  const activeMetrics = filters.metrics ?? [];
  const hasActive = activeSources.length > 0 || activeMetrics.length > 0;

  return (
    <div className="panel space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="section-label">Filters</span>
        </div>
        {hasActive && (
          <button
            onClick={clearAll}
            style={{
              padding: "3px 8px",
              fontSize: "11px",
              background: "rgba(248,113,113,0.1)",
              color: "var(--red)",
              border: "1px solid rgba(248,113,113,0.25)",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Source tags */}
      <div className="space-y-2">
        <div className="section-label">Source</div>
        <div className="flex flex-wrap gap-2">
          {sources.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => toggleSource(value)}
              className={`tag-filter ${
                activeSources.includes(value) ? `active-${color}` : ""
              }`}
              style={{ all: "unset", cursor: "pointer" }}
            >
              <span
                className={`tag-filter ${
                  activeSources.includes(value) ? `active-${color}` : ""
                }`}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: activeSources.includes(value)
                      ? color === "cyan" ? "var(--primary)" : "var(--green)"
                      : "var(--muted)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Metric tags */}
      <div className="space-y-2">
        <div className="section-label">Metric</div>
        <div className="flex flex-wrap gap-2">
          {metrics.map(({ value, label, color }) => (
            <span
              key={value}
              onClick={() => toggleMetric(value)}
              className={`tag-filter ${
                activeMetrics.includes(value) ? `active-${color}` : ""
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="space-y-2">
        <div className="section-label">Date Range</div>
        <div className="space-y-2">
          <div className="relative">
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 10,
                color: "var(--muted)",
                pointerEvents: "none",
                fontFamily: "'Space Mono', monospace",
                letterSpacing: "0.05em",
              }}
            >
              FROM
            </span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters({ ...filters, fromDate: e.target.value })
              }
              style={{ paddingLeft: 52 }}
            />
          </div>
          <div className="relative">
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 10,
                color: "var(--muted)",
                pointerEvents: "none",
                fontFamily: "'Space Mono', monospace",
                letterSpacing: "0.05em",
              }}
            >
              TO
            </span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters({ ...filters, toDate: e.target.value })
              }
              style={{ paddingLeft: 52 }}
            />
          </div>
        </div>
      </div>

      {/* Active summary */}
      {hasActive && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(34,211,238,0.05)",
            border: "1px solid rgba(34,211,238,0.12)",
            fontSize: 12,
            color: "var(--muted-2)",
          }}
        >
          {activeSources.length > 0 && (
            <div>
              <span style={{ color: "var(--primary)" }}>Sources: </span>
              {activeSources.join(", ")}
            </div>
          )}
          {activeMetrics.length > 0 && (
            <div>
              <span style={{ color: "var(--amber)" }}>Metrics: </span>
              {activeMetrics.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
