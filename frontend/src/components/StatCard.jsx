export default function StatCard({ label, value }) {
  return (
    <div className="p-4 border rounded bg-white">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}