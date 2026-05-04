import { useMemo, useState } from "react";

import satelliteData from "./data/satellite.json";
import hardwareData from "./data/hardware.json";

import FilterPanel from "./components/FilterPanel";
import StatCard from "./components/StatCard";
import DataTable from "./components/DataTable";
import ComparisonList from "./components/ComparisonList";
import DistributionChart from "./components/DistributionChart";

export default function App() {
  const [filters, setFilters] = useState({
    sources: [],   // multi-select array
    metrics: [],   // multi-select array
    fromDate: "",
    toDate: "",
  });

  const data = [...satelliteData, ...hardwareData];

  const filtered = useMemo(() => {
    return data.filter((d) => {
      const sourceMatch =
        filters.sources.length === 0 || filters.sources.includes(d.source);
      const metricMatch =
        filters.metrics.length === 0 || filters.metrics.includes(d.metric);
      const fromMatch =
        !filters.fromDate || new Date(d.date) >= new Date(filters.fromDate);
      const toMatch =
        !filters.toDate || new Date(d.date) <= new Date(filters.toDate);
      return sourceMatch && metricMatch && fromMatch && toMatch;
    });
  }, [filters]);

  const satelliteFiltered = filtered.filter((d) => d.source === "satellite");
  const hardwareFiltered = filtered.filter((d) => d.source === "hardware");

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        padding: "28px 28px 40px",
        maxWidth: 1400,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--primary)",
              marginBottom: 6,
              opacity: 0.8,
            }}
          >
            Analytics Platform
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#fff",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Solar Analyzer{" "}
            <span style={{ color: "var(--primary)", fontWeight: 300 }}>
              Dashboard
            </span>
          </h1>
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: "'Space Mono', monospace",
            color: "var(--muted)",
            textAlign: "right",
          }}
        >
          <div>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
          <div style={{ marginTop: 2 }}>
            <span style={{ color: "var(--green)" }}>●</span> Live
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard label="Filtered Records" value={filtered.length} accent="cyan" />
        <StatCard label="Total Records" value={data.length} accent="violet" />
        <StatCard label="Satellite" value={satelliteFiltered.length} accent="cyan" />
        <StatCard label="Hardware" value={hardwareFiltered.length} accent="green" />
      </div>

      {/* Main grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <FilterPanel filters={filters} setFilters={setFilters} />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <DistributionChart data={filtered} />
          <ComparisonList rows={[]} />
          <DataTable data={filtered} />
        </div>
      </div>
    </div>
  );
}
