import { formatDateTime } from "../utils/formatters";

export default function DataTable({ data }) {
  return (
    <table className="w-full bg-white border mt-4">
      <thead>
        <tr>
          <th>Source</th>
          <th>Time</th>
          <th>Location</th>
          <th>Metric</th>
          <th>Value</th>
        </tr>
      </thead>

      <tbody>
        {data.map((d) => (
          <tr key={d.id}>
            <td>{d.source}</td>
            <td>{formatDateTime(d.timestamp)}</td>
            <td>{d.location}</td>
            <td>{d.metric}</td>
            <td>{d.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}