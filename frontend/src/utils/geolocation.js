function isLocalhost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function gpsErrorMessage(error) {
  if (error?.code === 1) {
    return "GPS permission was denied. Allow location access in the browser, then try again.";
  }

  if (error?.code === 2) {
    return "The browser could not determine your position. Check OS location services, Wi-Fi/GNSS availability, or use a map/manual coordinate.";
  }

  if (error?.code === 3) {
    return "GPS timed out. Move near a window or use a map/manual coordinate.";
  }

  return error?.message || "Could not read GPS coordinates.";
}

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export async function readBrowserPosition() {
  if (!window.isSecureContext && !isLocalhost()) {
    throw new Error("Browser GPS requires HTTPS or localhost. Open the app from localhost, or use a map/manual coordinate.");
  }

  if (!navigator.geolocation) {
    throw new Error("GPS is not available in this browser.");
  }

  try {
    return await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
  } catch (firstError) {
    if (firstError?.code !== 2 && firstError?.code !== 3) {
      throw new Error(gpsErrorMessage(firstError), { cause: firstError });
    }

    try {
      return await getPosition({ enableHighAccuracy: false, timeout: 9000, maximumAge: 60000 });
    } catch (secondError) {
      throw new Error(gpsErrorMessage(secondError), { cause: secondError });
    }
  }
}
