import fs from 'fs';

console.log('🔧 Injecting StudyRoomView Recovery & Heartbeat...');
let code = fs.readFileSync('src/components/StudyRoomView.tsx', 'utf8');

if (code.includes('handleBackgroundRecovery')) {
  console.log('ℹ️ handleBackgroundRecovery already exists in StudyRoomView.tsx');
  process.exit(0);
}

// 1. Add timer state refs around line 330
const refTargetCrlf = '  const [isRoomRunning, setIsRoomRunning] = useState(false);\r\n';
const refTargetLf = '  const [isRoomRunning, setIsRoomRunning] = useState(false);\n';

const refsCode = `  const isRoomRunningRef = useRef(isRoomRunning);
  isRoomRunningRef.current = isRoomRunning;
  const roomRemainingSecondsRef = useRef(roomRemainingSeconds);
  roomRemainingSecondsRef.current = roomRemainingSeconds;
  const roomPhaseRef = useRef(roomPhase);
  roomPhaseRef.current = roomPhase;\n`;

if (code.includes(refTargetCrlf)) {
  code = code.replace(refTargetCrlf, refTargetCrlf + refsCode.replace(/\n/g, '\r\n'));
  console.log('✅ Injected room timer refs (CRLF)');
} else if (code.includes(refTargetLf)) {
  code = code.replace(refTargetLf, refTargetLf + refsCode);
  console.log('✅ Injected room timer refs (LF)');
}

// 2. Add room-timer-sync-request handler in channel listeners
const syncTargetCrlf = `    // Lắng nghe sự kiện đồng bộ Pomodoro thời gian thực từ Host / bạn học\r\n`;
const syncTargetLf = `    // Lắng nghe sự kiện đồng bộ Pomodoro thời gian thực từ Host / bạn học\n`;

const syncHandler = `    // Lắng nghe yêu cầu đồng bộ lại đồng hồ phòng học khi có bạn học quay lại từ background
    channel.on('broadcast', { event: 'room-timer-sync-request' }, () => {
      if (userRole === 'host' || isRoomRunningRef.current) {
        broadcastRoomTimer({
          senderId: participantId,
          remainingSeconds: roomRemainingSecondsRef.current,
          isRunning: isRoomRunningRef.current,
          phase: roomPhaseRef.current,
          timestamp: Date.now()
        });
      }
    });\n\n`;

if (code.includes(syncTargetCrlf)) {
  code = code.replace(syncTargetCrlf, syncHandler.replace(/\n/g, '\r\n') + syncTargetCrlf);
  console.log('✅ Injected room-timer-sync-request broadcast listener (CRLF)');
} else if (code.includes(syncTargetLf)) {
  code = code.replace(syncTargetLf, syncHandler + syncTargetLf);
  console.log('✅ Injected room-timer-sync-request broadcast listener (LF)');
}

// 3. Add handleBackgroundRecovery, visibilitychange, online, and Web Worker Heartbeat
const effectTargetCrlf = `    studyRoomService.broadcastChannel?.addEventListener('message', handleBroadcast);\r\n    window.addEventListener('storage', handleStorage);\r\n    return () => {\r\n      studyRoomService.broadcastChannel?.removeEventListener('message', handleBroadcast);\r\n      window.removeEventListener('storage', handleStorage);\r\n    };\r\n  }, [roomId, router]);\r\n`;
const effectTargetLf = `    studyRoomService.broadcastChannel?.addEventListener('message', handleBroadcast);\n    window.addEventListener('storage', handleStorage);\n    return () => {\n      studyRoomService.broadcastChannel?.removeEventListener('message', handleBroadcast);\n      window.removeEventListener('storage', handleStorage);\n    };\n  }, [roomId, router]);\n`;

const recoveryBlock = `
  // =========================================================================
  // SILENT DISCONNECTION & BACKGROUND HEARTBEAT RESILIENCE (V8.1)
  // Bắt sự kiện visibilitychange & online để tự động khôi phục kênh Realtime & WebRTC
  // và khởi tạo Web Worker heartbeat để không bị browser throttle khi chạy nền
  // =========================================================================
  const handleBackgroundRecovery = useCallback(async () => {
    if (!hasJoined || !roomId || !channelRef.current) return;
    console.log('[Meet Background Recovery] Kiểm tra trạng thái kênh Realtime:', channelRef.current.state);

    if (channelRef.current.state !== 'joined') {
      try {
        console.log('[Meet Background Recovery] Kênh bị ngắt khi chạy nền -> Re-subscribing...');
        await channelRef.current.subscribe();
        await channelRef.current.track({
          userId: user?.id || 'guest',
          clientSessionId,
          displayName: participantName,
          role: userRole,
          isMicOn,
          isVideoOn,
          joinedAt: Date.now()
        });
      } catch (err) {
        console.warn('[Meet Background Recovery] Lỗi re-subscribe:', err);
      }
    } else {
      try {
        await channelRef.current.track({
          userId: user?.id || 'guest',
          clientSessionId,
          displayName: participantName,
          role: userRole,
          isMicOn,
          isVideoOn,
          joinedAt: Date.now()
        });
      } catch {}
    }

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-timer-sync-request',
        payload: { fromPeerId: participantId, timestamp: Date.now() }
      });
    } catch {}

    if (rtcManagerRef.current) {
      rtcManagerRef.current.checkAndRecoverStalePeers();
    }
  }, [hasJoined, roomId, user?.id, clientSessionId, participantName, userRole, isMicOn, isVideoOn, participantId]);

  useEffect(() => {
    if (!hasJoined) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleBackgroundRecovery();
      }
    };

    const handleOnline = () => {
      console.log('[Meet Network] Thiết bị đã online trở lại, khôi phục phòng học...');
      handleBackgroundRecovery();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    let worker: Worker | null = null;
    try {
      if (typeof window !== 'undefined' && typeof Blob !== 'undefined' && typeof Worker !== 'undefined') {
        const workerBlob = new Blob([
          'let timer = null; self.onmessage = function(e) { if (e.data === \"start\") { if (timer) clearInterval(timer); timer = setInterval(function() { self.postMessage(\"tick\"); }, 15000); } else if (e.data === \"stop\") { if (timer) clearInterval(timer); timer = null; } };'
        ], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(workerBlob));
        worker.onmessage = () => {
          if (channelRef.current && channelRef.current.state === 'joined') {
            try {
              channelRef.current.send({
                type: 'broadcast',
                event: 'p2p-keepalive',
                payload: { fromPeerId: participantId, timestamp: Date.now() }
              });
            } catch {}
          }
        };
        worker.postMessage('start');
      }
    } catch (err) {
      console.debug('[Meet] Web Worker heartbeat fallback:', err);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
    };
  }, [hasJoined, handleBackgroundRecovery, participantId]);\n`;

if (code.includes(effectTargetCrlf)) {
  code = code.replace(effectTargetCrlf, effectTargetCrlf + recoveryBlock.replace(/\n/g, '\r\n'));
  console.log('✅ Injected Background Recovery & Web Worker Heartbeat hook (CRLF)');
} else if (code.includes(effectTargetLf)) {
  code = code.replace(effectTargetLf, effectTargetLf + recoveryBlock);
  console.log('✅ Injected Background Recovery & Web Worker Heartbeat hook (LF)');
} else {
  console.error('❌ Could not locate effect cleanup target in StudyRoomView.tsx');
}

fs.writeFileSync('src/components/StudyRoomView.tsx', code, 'utf8');
console.log('🎉 Done injecting StudyRoomView recovery logic!');
