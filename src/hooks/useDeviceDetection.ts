import { useState, useEffect } from 'react';

export interface DeviceDetectionResult {
  isAndroid: boolean;
  isIOS: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  isNativeCapacitor: boolean;
}

/**
 * Pure device detection function safe for SSR, JSDOM, and Node environments.
 * @param ua Optional user agent string (falls back to navigator.userAgent when in browser)
 * @param capacitorObj Optional Capacitor instance for native bridge checks
 */
export function detectDevice(ua?: string, capacitorObj?: any): DeviceDetectionResult {
  const userAgent = ua !== undefined
    ? ua
    : (typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '');

  const isAndroid = Boolean(userAgent && /Android/i.test(userAgent));
  const isIOS = Boolean(userAgent && /iPhone|iPad|iPod/i.test(userAgent));
  const isMobile = Boolean(
    userAgent && (isAndroid || isIOS || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent))
  );
  const isDesktop = !isMobile;
  const isNativeCapacitor = Boolean(
    capacitorObj?.isNativePlatform?.() ||
    (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.())
  );

  return {
    isAndroid,
    isIOS,
    isMobile,
    isDesktop,
    isNativeCapacitor,
  };
}

/**
 * React hook for responsive smart device detection.
 */
export function useDeviceDetection(): DeviceDetectionResult {
  const [deviceInfo, setDeviceInfo] = useState<DeviceDetectionResult>(() => detectDevice());

  useEffect(() => {
    setDeviceInfo(detectDevice());
  }, []);

  return deviceInfo;
}

export default useDeviceDetection;
