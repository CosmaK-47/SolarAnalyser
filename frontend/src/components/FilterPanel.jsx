export default function FilterPanel({ filters, setFilters }) {
  return (
    <div className="p-4 bg-white border rounded space-y-3">
      <h2 className="font-semibold">Filters</h2>

      <select
        value={filters.source}
        onChange={(e) => setFilters({ ...filters, source: e.target.value })}
      >
        <option value="all">All</option>
        <option value="satellite">Satellite</option>
        <option value="hardware">Hardware</option>
      </select>

      <input
        type="date"
        value={filters.fromDate}
        onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
      />

      <input
        type="date"
        value={filters.toDate}
        onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
      />
    </div>
  );
}