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
    fromDate: "",
    toDate: "",
  });

  const data = [...satelliteData, ...hardwareData];

  const filtered = useMemo(() => {
    return data.filter((d) => {
      return (
        (filters.source === "all" || d.source === filters.source) &&
        (filters.metric === "all" || d.metric === filters.metric)
      );
    });
  }, [filters]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-cyan-400">
        Solar Analyzer Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Records" value={filtered.length} />
        <StatCard label="Satellite" value={satelliteData.length} />
        <StatCard label="Hardware" value={hardwareData.length} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <FilterPanel filters={filters} setFilters={setFilters} />

        <div className="col-span-3 space-y-4">
          <DistributionChart data={filtered} />
          <ComparisonList rows={[]} />
          <DataTable data={filtered} />
        </div>
      </div>
    </div>
  );
}