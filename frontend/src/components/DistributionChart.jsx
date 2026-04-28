export default function DistributionChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="bg-white p-4 border rounded">
      <h2 className="font-semibold mb-2">Distribution</h2>

      {data.slice(0, 5).map((d) => (
        <div key={d.id}>
          <div>{d.metric}</div>
          <div className="bg-gray-200 h-2">
            <div
              className="bg-blue-500 h-2"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}