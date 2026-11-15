/**
 * Server Clock Skew Synchronization Utility
 * Mitigates clock divergence between client device and server.
 */

let serverClockOffsetMs = 0;

/**
 * Calculates and updates clock skew offset from any standard HTTP Response or Headers
 * containing the RFC 7231 'date' header. Supports optional RTT midpoint calculation.
 */
export function updateClockOffsetFromResponse(
  resOrHeaders: Response | Headers,
  requestStartMs?: number,
  responseEndMs?: number
): number {
  try {
    const headers = 'headers' in resOrHeaders ? resOrHeaders.headers : resOrHeaders;
    const serverDateHeader = headers?.get ? headers.get('date') : null;
    if (serverDateHeader) {
      const serverTimeMs = new Date(serverDateHeader).getTime();
      if (!isNaN(serverTimeMs)) {
        const clientMidpoint =
          typeof requestStartMs === 'number' && typeof responseEndMs === 'number'
            ? (requestStartMs + responseEndMs) / 2
            : Date.now();
        if (Number.isFinite(clientMidpoint) && !isNaN(serverTimeMs)) {
          serverClockOffsetMs = Math.round(serverTimeMs - clientMidpoint);
        }
      }
    }
  } catch {
    // Ignore header parsing errors
  }
  return serverClockOffsetMs;
}

/**
 * Manually set the server clock offset in milliseconds (useful for tests and sync beacons)
 */
export function setServerClockOffset(offsetMs: number): void {
  if (Number.isFinite(offsetMs)) {
    serverClockOffsetMs = offsetMs;
  }
}

/**
 * Gets the current calculated server clock offset in milliseconds
 */
export function getServerClockOffset(): number {
  return serverClockOffsetMs;
}

/**
 * Resets the clock offset to 0
 */
export function resetServerClockOffset(): void {
  serverClockOffsetMs = 0;
}

/**
 * Returns current synchronized server timestamp in milliseconds
 */
export function getServerTime(): number {
  return Date.now() + serverClockOffsetMs;
}
