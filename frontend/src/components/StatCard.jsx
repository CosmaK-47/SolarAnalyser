export default function StatCard({ label, value }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400 uppercase">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}