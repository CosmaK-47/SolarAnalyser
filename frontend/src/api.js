const jsonHeaders = { "Content-Type": "application/json" };

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return payload;
}

export function loadSatelliteRecords() {
  return request("/api/satellite/records/");
}

export function deleteSatelliteRecords(ids) {
  return request("/api/satellite/records/", {
    method: "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify({ ids }),
  });
}

export function fetchSatelliteData({ lat, lng, metric, metrics, location }) {
  return request("/api/satellite/fetch/", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      lat,
      lng,
      location,
      metrics: metrics || metric,
    }),
  });
}

export function loadHardwareMeasurements() {
  return request("/api/hardware/measurements/");
}

export function captureHardwareData({ lat, lng, location, mode = "latest" }) {
  return request("/api/hardware/capture/", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ lat, lng, location, mode }),
  });
}

export function deleteHardwareRecords(ids) {
  return request("/api/hardware/measurements/", {
    method: "DELETE",
    headers: jsonHeaders,
    body: JSON.stringify({ ids }),
  });
}
