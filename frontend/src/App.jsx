import { useMemo, useState } from "react";

import satelliteData from "./data/satellite.json";
import hardwareData from "./data/hardware.json";

import FilterPanel from "./components/FilterPanel";
import StatCard from "./components/StatCard";
import DataTable from "./components/DataTable";
import ComparisonList from "./components/ComparisonList";
import DistributionChart from "./components/DistributionChart";

import { filterData } from "./utils/filters";
import { rangeStats, dateOnly } from "./utils/formatters";

export default function App() {
  const [filters, setFilters] = useState({
    source: "all",
    metric: "all",
    location: "all",
    region: "all",
    deviceId: "all",
    quality: "all",
    status: "all",
    fromDate: "",
    toDate: "",
  });

  const merged = [...satelliteData, ...hardwareData];

  const filtered = useMemo(() => {
    return filterData(merged, filters);
  }, [filters]);

  const satelliteFiltered = filtered.filter((x) => x.source === "satellite");
  const hardwareFiltered = filtered.filter((x) => x.source === "hardware");

  const stats = rangeStats(filtered.map((x) => x.value));

  const comparison = useMemo(() => {
    const map = new Map(
      hardwareFiltered.map(
        (x) => [`${x.location}-${x.metric}-${dateOnly(x.timestamp)}`, x]
      )
    );

    return satelliteFiltered
      .map((sat) => {
        const key = `${sat.location}-${sat.metric}-${dateOnly(sat.timestamp)}`;
        const hw = map.get(key);
        if (!hw) return null;

        return {
          id: sat.id + hw.id,
          location: sat.location,
          metric: sat.metric,
          satellite: sat.value,
          hardware: hw.value,
          diff: hw.value - sat.value,
        };
      })
      .filter(Boolean);
  }, [satelliteFiltered, hardwareFiltered]);

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold">Solar Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Records" value={filtered.length} />
        <StatCard label="Avg" value={stats.avg.toFixed(2)} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <FilterPanel filters={filters} setFilters={setFilters} />

        <div className="col-span-3 space-y-4">
          <DistributionChart data={filtered} />
          <ComparisonList rows={comparison} />
          <DataTable data={filtered} />
        </div>
      </div>
    </div>
  );
}