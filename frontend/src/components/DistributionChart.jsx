export default function DistributionChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="panel space-y-3">
      <h2 className="text-lg font-semibold">Distribution</h2>

      {data.slice(0, 6).map((d) => (
        <div key={d.id}>
          <div className="text-xs text-slate-400">{d.metric}</div>
          <div className="h-2 bg-slate-800 rounded">
            <div
              className="h-2 bg-cyan-400 rounded"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}