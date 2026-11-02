/**
 * POMOFOCUS MEET SERVICE ADAPTER / FACADE
 * ==============================================================================
 * Cung cấp cấu hình WebRTC (bao gồm TURN relay servers chống ngắt kết nối chéo mạng)
 * và kết nối dịch vụ phòng học Meet.
 */

import { DEFAULT_RTC_CONFIG, WebRTCConnectionManager } from './WebRTCConnectionManager';
import { meetRealtimeService } from './meet/realtimeService';
import { studyRoomService } from './studyRoomService';

export const RTC_CONFIG = DEFAULT_RTC_CONFIG;

export const meetService = {
  rtcConfig: DEFAULT_RTC_CONFIG,
  studyRoomService,
  realtimeService: meetRealtimeService,
  WebRTCConnectionManager,
};

export default meetService;
