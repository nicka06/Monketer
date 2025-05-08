import * as React from "react"

/**
 * Configuration for mobile detection
 * Customize these values based on your mobile design breakpoints
 */
const MOBILE_CONFIG = {
  /** Primary breakpoint for mobile devices */
  WIDTH_BREAKPOINT: 768,
  
  /** Additional breakpoints for specific device types */
  SMALL_PHONE: 380,
  LARGE_PHONE: 480,
  TABLET: 768,
  
  /** Aspect ratio that typically indicates mobile devices */
  MOBILE_ASPECT_RATIO: '13/9',
} as const

/**
 * Device detection result interface
 * Provides detailed information about the current device context
 */
interface DeviceInfo {
  /** True if device is considered mobile based on all factors */
  isMobile: boolean;
  /** More specific device categorization */
  deviceType: 'small-phone' | 'large-phone' | 'tablet' | 'desktop';
  /** Current viewport orientation */
  orientation: 'portrait' | 'landscape';
  /** Whether the device has touch capability */
  hasTouch: boolean;
  /** Current viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
}

/**
 * Enhanced Mobile Detection Hook
 * 
 * Provides comprehensive device and viewport information for conditional rendering
 * and responsive behavior. Perfect for implementing different UX for mobile users.
 * 
 * Features:
 * - Accurate mobile detection using multiple factors
 * - Device type categorization
 * - Orientation awareness
 * - Touch capability detection
 * - Viewport size tracking
 * - Real-time updates on device changes
 * 
 * Usage:
 * ```tsx
 * const { isMobile, deviceType, orientation, hasTouch } = useMobileDetection();
 * 
 * return (
 *   <>
 *     {deviceType === 'small-phone' && <SmallPhoneLayout />}
 *     {deviceType === 'large-phone' && <LargePhoneLayout />}
 *     {deviceType === 'tablet' && <TabletLayout />}
 *     {deviceType === 'desktop' && <DesktopLayout />}
 *   </>
 * );
 * ```
 * 
 * @returns {DeviceInfo} Comprehensive device information
 */
export function useMobileDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>({
    isMobile: false,
    deviceType: 'desktop',
    orientation: 'landscape',
    hasTouch: false,
    viewport: { width: 0, height: 0 }
  });

  React.useEffect(() => {
    // Detect touch capability once
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function updateDeviceInfo() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Determine device type based on width
      let deviceType: DeviceInfo['deviceType'] = 'desktop';
      if (width < MOBILE_CONFIG.SMALL_PHONE) deviceType = 'small-phone';
      else if (width < MOBILE_CONFIG.LARGE_PHONE) deviceType = 'large-phone';
      else if (width < MOBILE_CONFIG.TABLET) deviceType = 'tablet';

      // Determine orientation
      const orientation: DeviceInfo['orientation'] = height > width ? 'portrait' : 'landscape';

      // Consider a device mobile if it's under the breakpoint OR has touch capability
      const isMobile = width < MOBILE_CONFIG.WIDTH_BREAKPOINT || hasTouch;

      setDeviceInfo({
        isMobile,
        deviceType,
        orientation,
        hasTouch,
        viewport: { width, height }
      });
    }

    // Set up event listeners for various change events
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
    
    // Initial check
    updateDeviceInfo();

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

// Original hook maintained for backward compatibility
export function useIsMobile(): boolean {
  const { isMobile } = useMobileDetection();
  return isMobile;
}
