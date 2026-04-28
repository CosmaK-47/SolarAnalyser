import { dateOnly } from "./formatters";

export function filterData(data, filters) {
  return data.filter((item) => {
    const itemDate = dateOnly(item.timestamp);

    return (
      (filters.source === "all" || item.source === filters.source) &&
      (filters.metric === "all" || item.metric === filters.metric) &&
      (filters.location === "all" || item.location === filters.location) &&
      (filters.region === "all" || item.region === filters.region) &&
      (filters.deviceId === "all" || item.deviceId === filters.deviceId) &&
      (filters.quality === "all" || item.quality === filters.quality) &&
      (filters.status === "all" || item.status === filters.status) &&
      (!filters.fromDate || itemDate >= filters.fromDate) &&
      (!filters.toDate || itemDate <= filters.toDate)
    );
  });
}