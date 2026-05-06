import { useMemo, useState, useCallback } from "react";

import satelliteData from "./data/satellite.json";
import hardwareData from "./data/hardware.json";

import FilterPanel from "./components/FilterPanel";
import StatCard from "./components/StatCard";
import DataTable from "./components/DataTable";
import ComparisonList from "./components/ComparisonList";
import DistributionChart from "./components/DistributionChart";
import MapView from "./components/MapView";
import AddDataModal from "./components/AddDataModal";

import { enrichWithCoords } from "./utils/locationCoords";

// Enrich base data with coordinates once
const BASE_DATA = [...satelliteData, ...hardwareData].map((d) => enrichWithCoords(d));

export default function App() {
  const [userRecords, setUserRecords] = useState([]);
  const [filters, setFilters] = useState({ sources: [], metrics: [], fromDate: "", toDate: "" });
  const [modal, setModal] = useState(null);

  const allData = useMemo(() => [...BASE_DATA, ...userRecords], [userRecords]);

  const filtered = useMemo(() => {
    return allData.filter((d) => {
      const srcOk = filters.sources.length === 0 || filters.sources.includes(d.source);
      const metOk = filters.metrics.length === 0 || filters.metrics.includes(d.metric);
      const fromOk = !filters.fromDate || new Date(d.date) >= new Date(filters.fromDate);
      const toOk = !filters.toDate || new Date(d.date) <= new Date(filters.toDate);
      return srcOk && metOk && fromOk && toOk;
    });
  }, [allData, filters]);

  const openModal = useCallback((prefill = {}) => setModal({ prefill }), []);
  const closeModal = useCallback(() => setModal(null), []);

  const addRecord = useCallback((record) => {
    const enriched = enrichWithCoords({
      ...record,
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    });
    setUserRecords((prev) => [enriched, ...prev]);
  }, []);

  const satCount = useMemo(() => filtered.filter((d) => d.source === "satellite").length, [filtered]);
  const hwCount = useMemo(() => filtered.filter((d) => d.source === "hardware").length, [filtered]);

  return (
    <div style={{ position: "relative", zIndex: 1, padding: "28px 28px 48px", maxWidth: 1400, margin: "0 auto", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 6, opacity: 0.8 }}>
            Analytics Platform
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>
            Solar Analyzer <span style={{ color: "var(--primary)", fontWeight: 300 }}>Dashboard</span>
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "var(--muted)", textAlign: "right", marginRight: 4 }}>
            <div>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
            <div style={{ marginTop: 2 }}><span style={{ color: "var(--green)" }}>●</span> Live</div>
          </div>

          <button
            onClick={() => openModal({})}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.08))",
              border: "1px solid var(--primary-border)", color: "var(--primary)",
              boxShadow: "0 0 20px rgba(34,211,238,0.12)",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Data
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="Filtered Records" value={filtered.length} accent="cyan" />
        <StatCard label="Total Records" value={allData.length} accent="violet" />
        <StatCard label="Satellite" value={satCount} accent="cyan" />
        <StatCard label="Hardware" value={hwCount} accent="green" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, alignItems: "start" }}>
        <FilterPanel filters={filters} setFilters={setFilters} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <DistributionChart data={filtered} />
          <ComparisonList rows={[]} />
          <DataTable data={filtered} />
        </div>
      </div>

      {/* Map section */}
      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 3 }}>
            Spatial View
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>
            Geographic Distribution{" "}
            <span style={{ fontSize: 13, fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>
              — click markers to explore · click map to add data
            </span>
          </div>
        </div>
        <MapView data={allData} onAddData={openModal} />
      </div>

      {/* User records badge */}
      {userRecords.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            padding: "12px 18px", borderRadius: 14,
            background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.18)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>✓</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--green)" }}>
                {userRecords.length} record{userRecords.length > 1 ? "s" : ""} added this session
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                These appear in the dashboard and on the map above
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <AddDataModal
          prefill={modal.prefill}
          onAdd={addRecord}
          onClose={closeModal}
        />
      )}
    </div>
  );
}