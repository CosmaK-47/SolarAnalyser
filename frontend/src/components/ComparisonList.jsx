export default function ComparisonList({ rows }) {
  return (
    <div className="bg-white p-4 border rounded">
      <h2 className="font-semibold mb-2">Comparison</h2>

      {rows.map((row) => (
        <div key={row.id} className="border-b py-2">
          <div>{row.location} - {row.metric}</div>
          <div>
            Sat: {row.satellite} | HW: {row.hardware}
          </div>
          <div>Diff: {row.diff.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}