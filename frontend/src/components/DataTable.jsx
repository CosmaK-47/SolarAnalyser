import Badge from "./Badge";

export default function DataTable({ data }) {
  return (
    <div className="panel overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Location</th>
            <th>Metric</th>
            <th>Value</th>
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
              <td>{d.location}</td>
              <td>{d.metric}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}