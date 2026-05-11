import { useCallback, useEffect, useMemo, useState } from "react";

import FilterPanel from "./components/FilterPanel";
import StatCard from "./components/StatCard";
import DistributionChart from "./components/DistributionChart";
import MapView from "./components/MapView";
import AddDataModal from "./components/AddDataModal";
import HardwareVerificationPanel from "./components/HardwareVerificationPanel";
import RecordsSidebar from "./components/RecordsSidebar";

import {
  captureHardwareData,
  deleteHardwareRecords,
  deleteSatelliteRecords,
  fetchSatelliteData,
  loadHardwareMeasurements,
  loadSatelliteRecords,
} from "./api";
import { enrichWithCoords } from "./utils/locationCoords";
import { buildPointId, getRecordPointId } from "./utils/pointRecords";

export default function App() {
  const [satelliteRecords, setSatelliteRecords] = useState([]);
  const [hardwareRecords, setHardwareRecords] = useState([]);
  const [hardwareInfo, setHardwareInfo] = useState({ latestRaw: null, totalMeasurements: 0 });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filters, setFilters] = useState({ sources: [], metrics: [], fromDate: "", toDate: "" });
  const [modal, setModal] = useState(null);
  const [apiNotice, setApiNotice] = useState("");

  const refreshSatelliteRecords = useCallback(async () => {
    try {
      const payload = await loadSatelliteRecords();
      setSatelliteRecords((payload.records || []).map((record) => normalizeRecord(record)));
      setApiNotice("");
    } catch (error) {
      setApiNotice(`Satellite backend unavailable: ${error.message}`);
    }
  }, []);

  const refreshHardwareRecords = useCallback(async () => {
    try {
      const payload = await loadHardwareMeasurements();
      setHardwareRecords((payload.records || []).map((record) => normalizeRecord(record)));
      setHardwareInfo({
        latestRaw: payload.latest_raw || null,
        totalMeasurements: payload.total_measurements || 0,
      });
      setApiNotice("");
    } catch (error) {
      setApiNotice(`Hardware backend unavailable: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshSatelliteRecords();
      refreshHardwareRecords();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshSatelliteRecords, refreshHardwareRecords]);

  const allData = useMemo(() => {
    return [...satelliteRecords, ...hardwareRecords];
  }, [satelliteRecords, hardwareRecords]);

  const displayedSelectedRecord = useMemo(() => {
    if (selectedRecord && allData.some((record) => record.id === selectedRecord.id)) {
      return selectedRecord;
    }

    return allData[0] || null;
  }, [allData, selectedRecord]);

  const filtered = useMemo(() => {
    return allData.filter((record) => {
      const date = record.date || record.timestamp?.slice(0, 10) || "";
      const srcOk = filters.sources.length === 0 || filters.sources.includes(record.source);
      const metOk = filters.metrics.length === 0 || filters.metrics.includes(record.metric);
      const fromOk = !filters.fromDate || date >= filters.fromDate;
      const toOk = !filters.toDate || date <= filters.toDate;
      return srcOk && metOk && fromOk && toOk;
    });
  }, [allData, filters]);

  const storedBatchCount = useMemo(() => countRecordGroups(allData), [allData]);

  const openModal = useCallback((prefill = {}) => setModal({ prefill }), []);
  const closeModal = useCallback(() => setModal(null), []);

  const addDataRecord = useCallback(async (request) => {
    const pointId = request.pointId || request.point_id || buildPointId(request.lat, request.lng);

    if (request.source === "both") {
      const satelliteResponse = await fetchSatelliteData({
        ...request,
        pointId,
      });
      const hardwareResponse = await captureHardwareData({
        ...request,
        pointId,
      });

      const satellite = (satelliteResponse.records || []).map((record) => normalizeRecord(record));
      const hardware = (hardwareResponse.records || []).map((record) => normalizeRecord(record));
      const records = [...satellite, ...hardware];

      setSatelliteRecords((current) => [...satellite, ...current]);
      setHardwareRecords((current) => [...hardware, ...current]);
      if (records.length > 0) setSelectedRecord(records[0]);

      return {
        status: "saved",
        records,
        satellite: satelliteResponse,
        hardware: hardwareResponse,
      };
    }

    if (request.source === "hardware") {
      const response = await captureHardwareData({ ...request, pointId });
      const records = (response.records || []).map((record) => normalizeRecord(record));
      setHardwareRecords((current) => [...records, ...current]);
      if (records.length > 0) setSelectedRecord(records[0]);
      return response;
    }

    const response = await fetchSatelliteData({ ...request, pointId });
    const records = (response.records || []).map((record) => normalizeRecord(record));
    setSatelliteRecords((current) => [...records, ...current]);
    if (records.length > 0) setSelectedRecord(records[0]);
    return response;
  }, []);

  const deleteStoredRecords = useCallback(async (source, ids) => {
    if (!ids?.length) return;

    if (source === "hardware") {
      await deleteHardwareRecords(ids);
      await refreshHardwareRecords();
    } else {
      await deleteSatelliteRecords(ids);
      await refreshSatelliteRecords();
    }

    setSelectedRecord(null);
  }, [refreshHardwareRecords, refreshSatelliteRecords]);

  const satCount = useMemo(() => filtered.filter((d) => d.source === "satellite").length, [filtered]);
  const hwCount = useMemo(() => filtered.filter((d) => d.source === "hardware").length, [filtered]);

  return (
    <div className="app-page">
      <div className="app-header">
        <div>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 6, opacity: 0.8 }}>
            Analytics Platform
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>
            Solar Analyzer <span style={{ color: "var(--primary)", fontWeight: 300 }}>Dashboard</span>
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", color: "var(--muted)", textAlign: "right", marginRight: 4 }}>
            <div>{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
            <div style={{ marginTop: 2 }}>
              <span style={{ color: apiNotice ? "var(--amber)" : "var(--green)" }}>●</span> {apiNotice ? "Check backend" : "Backend sync"}
            </div>
            <div style={{ marginTop: 2 }}>
              <span style={{ color: hardwareInfo.latestRaw ? "var(--green)" : "var(--muted)" }}>●</span> {hardwareInfo.latestRaw ? "ESP32 sample ready" : "Demo mode ready"}
            </div>
          </div>

          <button
            onClick={() => openModal({ source: "satellite" })}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.08))",
              border: "1px solid var(--primary-border)", color: "var(--primary)",
              boxShadow: "0 0 20px rgba(34,211,238,0.12)",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Data
          </button>
        </div>
      </div>

      {apiNotice && (
        <div style={{
          marginBottom: 16,
          padding: "10px 14px",
          borderRadius: 12,
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.22)",
          color: "var(--amber)",
          fontSize: 13,
        }}>
          {apiNotice}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Filtered Metrics" value={filtered.length} accent="cyan" />
        <StatCard label="Stored Batches" value={storedBatchCount} accent="violet" />
        <StatCard label="Satellite Metrics" value={satCount} accent="cyan" />
        <StatCard label="Hardware Metrics" value={hwCount} accent="green" />
      </div>

      <div className="dashboard-grid">
        <aside className="left-rail">
          <FilterPanel filters={filters} setFilters={setFilters} />
        </aside>

        <main className="main-stack">
          <DistributionChart data={filtered} />

          <HardwareVerificationPanel
            records={allData}
            selectedRecord={displayedSelectedRecord}
            hardwareSampleAvailable={Boolean(hardwareInfo.latestRaw)}
            hardwareLatestRaw={hardwareInfo.latestRaw}
            onFetchSatellite={addDataRecord}
            onCaptureHardware={addDataRecord}
          />

          <section>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 3 }}>
                Spatial View
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#fff" }}>
                Geographic Distribution{" "}
                <span style={{ fontSize: 13, fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>
                  - click markers to explore · click map to add data for that point
                </span>
              </div>
            </div>
            <MapView data={allData} onAddData={openModal} />
          </section>
        </main>

        <RecordsSidebar
          records={allData}
          selectedRecord={displayedSelectedRecord}
          onSelectRecord={setSelectedRecord}
          onDeleteRecords={deleteStoredRecords}
        />
      </div>

      {modal && (
        <AddDataModal
          prefill={modal.prefill}
          hardwareSampleAvailable={Boolean(hardwareInfo.latestRaw)}
          onAdd={addDataRecord}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function countRecordGroups(records) {
  return new Set(records.map((record) => getRecordGroupKey(record))).size;
}

function getRecordGroupKey(record) {
  const timestamp = (record.timestamp || record.date || "").slice(0, 19);
  const lat = record.lat != null ? Number(record.lat).toFixed(5) : "no-lat";
  const lng = record.lng != null ? Number(record.lng).toFixed(5) : "no-lng";
  const location = record.location || record.deviceId || "unknown";

  return `${record.source}|${timestamp}|${lat}|${lng}|${location}`;
}

function normalizeRecord(record) {
  const timestamp = record.timestamp || record.received_at;
  const date = record.date || (typeof timestamp === "string" ? timestamp.slice(0, 10) : "");
  const value = typeof record.value === "string" ? Number(record.value) : record.value;
  const sanitized = sanitizeRecordForUi(record);
  const enriched = enrichWithCoords({
    ...sanitized,
    date,
    value: Number.isFinite(value) ? value : record.value,
  });
  const pointId = getRecordPointId(enriched);

  return pointId ? { ...enriched, point_id: pointId } : enriched;
}

function sanitizeRecordForUi(record) {
  if (record.source !== "satellite") return record;

  const provider = String(record.provider || "")
    .replace(/Sentinel-2 estimate/gi, "Sentinel-2 Live")
    .replace(/PVGIS TMY/gi, "PVGIS Live");

  const details = record.details && typeof record.details === "object"
    ? {
        ...record.details,
        note: "Live satellite record for the selected point.",
      }
    : record.details;

  return {
    ...record,
    quality: "live",
    provider: provider || "Satellite Live",
    details,
  };
}
