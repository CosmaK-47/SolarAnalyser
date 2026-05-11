const sourceTone = {
  satellite: { color: "var(--primary)", bg: "var(--primary-dim)", border: "var(--primary-border)" },
  hardware: { color: "var(--green)", bg: "var(--green-dim)", border: "var(--green-border)" },
};

export default function RecordsSidebar({ records, selectedRecord, onSelectRecord, onDeleteRecords }) {
  const groups = groupRecords(records);
  const selectedGroup = groups.find((group) => group.records.some((record) => record.id === selectedRecord?.id)) || groups[0] || null;

  return (
    <aside
      className="panel records-sidebar"
      style={{
        padding: 0,
        position: "sticky",
        top: 20,
        height: "calc(100vh - 40px)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ padding: "18px 18px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div className="section-label" style={{ marginBottom: 3 }}>Stored Records</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Record Browser</div>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "var(--muted)" }}>
            {groups.length} batch{groups.length === 1 ? "" : "es"}
          </div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
          Hardware samples and satellite fetches are grouped by time and coordinate.
        </div>
      </div>

      <div style={{ overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: "0 0 245px", minHeight: 140 }}>
        {groups.map((group) => (
          <RecordGroupButton
            key={group.key}
            group={group}
            active={selectedGroup?.key === group.key}
            onClick={() => onSelectRecord(group.records[0])}
          />
        ))}
        {groups.length === 0 && (
          <div style={{ padding: "34px 12px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No records yet
          </div>
        )}
      </div>

      <RecordDetail
        group={selectedGroup}
        onDeleteRecords={onDeleteRecords}
      />
    </aside>
  );
}

function groupRecords(records) {
  const map = new Map();

  records.forEach((record) => {
    const key = getGroupKey(record);
    const current = map.get(key) || {
      key,
      source: record.source,
      location: record.location || record.deviceId || "Unknown location",
      lat: record.lat,
      lng: record.lng,
      timestamp: record.timestamp || record.date,
      records: [],
    };

    current.records.push(record);
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      records: group.records.sort((a, b) => String(a.metric).localeCompare(String(b.metric))),
    }))
    .sort((a, b) => {
      const aTime = new Date(a.timestamp || 0).getTime();
      const bTime = new Date(b.timestamp || 0).getTime();
      return bTime - aTime;
    });
}

function getGroupKey(record) {
  const timestamp = (record.timestamp || record.date || "").slice(0, 19);
  const lat = record.lat != null ? Number(record.lat).toFixed(5) : "no-lat";
  const lng = record.lng != null ? Number(record.lng).toFixed(5) : "no-lng";
  const location = record.location || record.deviceId || "unknown";

  return `${record.source}|${timestamp}|${lat}|${lng}|${location}`;
}

function RecordGroupButton({ group, active, onClick }) {
  const tone = sourceTone[group.source] || sourceTone.satellite;
  const firstRecord = group.records[0];

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "10px 11px",
        borderRadius: 10,
        border: active ? `1px solid ${tone.border}` : "1px solid var(--border)",
        background: active ? tone.bg : "rgba(10,18,32,0.55)",
        color: "var(--text)",
        cursor: "pointer",
        boxShadow: active ? `0 0 14px ${tone.bg}` : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: tone.color }}>
          {group.source}
        </span>
        <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--muted)" }}>
          {(group.timestamp || "").slice(0, 10) || "no date"}
        </span>
      </div>
      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 700 }}>
        {group.location}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 3 }}>
        <span style={{ fontSize: 12, color: "var(--muted-2)" }}>
          {group.records.length} metric{group.records.length === 1 ? "" : "s"}
        </span>
        <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: tone.color, whiteSpace: "nowrap" }}>
          {firstRecord?.value} {firstRecord?.unit || ""}
        </span>
      </div>
    </button>
  );
}

function RecordDetail({ group, onDeleteRecords }) {
  if (!group) {
    return (
      <div style={{ borderTop: "1px solid var(--border)", padding: 18, color: "var(--muted)", fontSize: 13, overflowY: "auto", flex: 1 }}>
        Select a record to inspect values, provider, metadata, and location.
      </div>
    );
  }

  const tone = sourceTone[group.source] || sourceTone.satellite;
  const firstRecord = group.records[0];
  const provider = firstRecord.provider || firstRecord.deviceId || firstRecord.status || "local";
  const ids = group.records.map((record) => record.id);

  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: 18, overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 10 }}>
        <div>
          <div className="section-label" style={{ color: tone.color, marginBottom: 8 }}>
            Record Detail
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            {group.location}
          </div>
        </div>
        <button
          onClick={() => onDeleteRecords(group.source, ids)}
          style={{
            padding: "5px 9px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.24)",
            color: "var(--red)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Delete
        </button>
      </div>

      <MiniLocationMap record={firstRecord} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <DetailPill label="Source" value={group.source || "unknown"} tone={tone.color} />
        <DetailPill label="Provider" value={provider} />
        <DetailPill label="Date" value={(group.timestamp || "").slice(0, 19).replace("T", " ") || "unknown"} />
        <DetailPill label="Metrics" value={String(group.records.length)} />
        <DetailPill label="Lat" value={group.lat != null ? Number(group.lat).toFixed(5) : "not set"} />
        <DetailPill label="Lng" value={group.lng != null ? Number(group.lng).toFixed(5) : "not set"} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>Values</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {group.records.map((record) => (
            <div
              key={record.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 9,
                background: "rgba(6,11,20,0.55)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--muted-2)" }}>{record.label || record.metric}</span>
              <span style={{ fontSize: 12, color: tone.color, fontFamily: "'Space Mono', monospace", whiteSpace: "nowrap" }}>
                {record.value} {record.unit || ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {group.records.some((record) => record.details) && (
        <div style={{ marginTop: 12 }}>
          <div className="section-label" style={{ marginBottom: 6 }}>Metadata</div>
          <pre style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 11,
            lineHeight: 1.5,
            color: "var(--muted-2)",
            background: "rgba(6,11,20,0.55)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 10,
            maxHeight: 240,
            overflowY: "auto",
          }}>
            {JSON.stringify(group.records.map((record) => ({
              metric: record.metric,
              details: record.details,
            })).filter((item) => item.details), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function MiniLocationMap({ record }) {
  if (record.lat == null || record.lng == null) {
    return (
      <div style={emptyMapStyle}>
        No coordinates for this record
      </div>
    );
  }

  const lat = Number(record.lat);
  const lng = Number(record.lng);
  const delta = 0.015;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "#07111f", height: 170 }}>
      <iframe
        title="Record location"
        src={src}
        style={{ border: 0, width: "100%", height: "100%", filter: "brightness(0.78) saturate(0.9)" }}
        loading="lazy"
      />
    </div>
  );
}

function DetailPill({ label, value, tone = "var(--muted-2)" }) {
  return (
    <div style={{
      padding: "8px 9px",
      borderRadius: 9,
      background: "rgba(6,11,20,0.55)",
      border: "1px solid var(--border)",
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: "var(--muted)", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: tone, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

const emptyMapStyle = {
  height: 150,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "rgba(6,11,20,0.55)",
  color: "var(--muted)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
};
