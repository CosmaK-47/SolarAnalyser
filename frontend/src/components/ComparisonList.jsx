import Badge from "./Badge";

export default function ComparisonList({ rows }) {
  return (
    <div className="panel space-y-3">
      <h2 className="text-lg font-semibold">Satellite vs Hardware</h2>

      {rows.map((r) => (
        <div key={r.id} className="card flex justify-between">
          <div>
            <div className="font-medium">
              {r.location} · {r.metric}
            </div>
            <div className="text-sm text-slate-400">
              Sat: {r.satellite} | HW: {r.hardware}
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