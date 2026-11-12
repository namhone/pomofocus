import fs from 'fs';

console.log('🔧 Starting Meet Hardening Script...');

// =============================================================================
// 1. HARDEN WebRTCConnectionManager.ts
// =============================================================================
let rtcCode = fs.readFileSync('src/services/WebRTCConnectionManager.ts', 'utf8');

if (!rtcCode.includes('checkAndRecoverStalePeers')) {
  const targetRestart = '  public async restartIceForPeer(peerId: string) {';
  const targetEnd = '      this.makingOfferMap.set(peerId, false);\n    }\n  }';
  const targetEndCrlf = '      this.makingOfferMap.set(peerId, false);\r\n    }\r\n  }';

  const newMethods = `
  /**
   * Tự động kiểm tra và phục hồi các kết nối peer bị đứt đoạn (Background / Network Change)
   */
  public checkAndRecoverStalePeers() {
    this.peerConnections.forEach((pc, peerId) => {
      const isFailedOrDisconnected =
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed';

      if (isFailedOrDisconnected) {
        console.log(\`[WebRTC Self-Healing] Phục hồi peer \${peerId} (state: \${pc.connectionState}/\${pc.iceConnectionState})\`);
        this.restartIceForPeer(peerId);
      }
    });
  }

  /**
   * Tái tạo lại PeerConnection hoàn toàn sạch mới nếu ICE Restart bị kẹt
   */
  public recreatePeerConnection(peerId: string) {
    console.log(\`[WebRTC] Tái tạo PeerConnection sạch mới cho \${peerId}\`);
    const oldPc = this.peerConnections.get(peerId);
    if (oldPc) {
      try {
        oldPc.close();
      } catch {}
      this.peerConnections.delete(peerId);
    }
    const newPc = this.createPeerConnection(peerId);
    this.peerConnections.set(peerId, newPc);
    if (this.myUserId > peerId) {
      this.callPeer(peerId);
    }
  }`;

  if (rtcCode.includes(targetEndCrlf)) {
    rtcCode = rtcCode.replace(targetEndCrlf, targetEndCrlf + newMethods.replace(/\n/g, '\r\n'));
    console.log('✅ Added checkAndRecoverStalePeers & recreatePeerConnection (CRLF)');
  } else if (rtcCode.includes(targetEnd)) {
    rtcCode = rtcCode.replace(targetEnd, targetEnd + newMethods);
    console.log('✅ Added checkAndRecoverStalePeers & recreatePeerConnection (LF)');
  } else {
    console.error('❌ Could not locate restartIceForPeer end block in WebRTCConnectionManager.ts');
  }

  // Update failed state handler to recreate peer connection if still failed
  const oldFailed = `            if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
              console.warn(\`[P2P] Peer \${peerId} kết nối failed sau 10s -> Dọn dẹp kết nối\`);
              this.closeConnection(peerId);
            }`;
  const newFailed = `            if (pc.connectionState === 'failed' || pc.iceConnectionState === 'failed') {
              console.warn(\`[P2P] Peer \${peerId} kết nối failed sau 10s -> Tự động tái tạo kết nối sạch mới\`);
              this.recreatePeerConnection(peerId);
            }`;

  if (rtcCode.includes(oldFailed.replace(/\n/g, '\r\n'))) {
    rtcCode = rtcCode.replace(oldFailed.replace(/\n/g, '\r\n'), newFailed.replace(/\n/g, '\r\n'));
    console.log('✅ Updated failed peer reconnection handler (CRLF)');
  } else if (rtcCode.includes(oldFailed)) {
    rtcCode = rtcCode.replace(oldFailed, newFailed);
    console.log('✅ Updated failed peer reconnection handler (LF)');
  }

  fs.writeFileSync('src/services/WebRTCConnectionManager.ts', rtcCode, 'utf8');
} else {
  console.log('ℹ️ WebRTCConnectionManager already contains checkAndRecoverStalePeers');
}

// =============================================================================
// 2. HARDEN StudyRoomView.tsx
// =============================================================================
let studyCode = fs.readFileSync('src/components/StudyRoomView.tsx', 'utf8');

// Fix 2.1: Fix isSelf to ONLY check participantId (allowing multiple devices of same user)
const oldIsSelfCrlf = `    const isSelf = (p: { id?: string; userId?: string; role?: string; name?: string }) => {
      if (!p) return true;
      // 1. Trùng session participantId cục bộ
      if (p.id === participantId) return true;

      // 2. Trùng userId tài khoản đăng nhập hiện tại (chỉ áp dụng khi user thật đã đăng nhập, không dùng cho guest)
      if (user?.id && user.id !== 'guest') {
        if (p.userId === user.id) return true;
        if (p.id === user.id) return true;
        if (p.id?.startsWith(\`\${user.id}_\`)) return true;
      }

      // 3. Trùng vai trò Host của chính bản thân khi là Host
      if (userRole === 'host') {
        if (p.role === 'host') return true;
        if (room?.hostUserId && room.hostUserId !== 'system_study_pod' && (p.userId === room.hostUserId || p.id === room.hostUserId || p.id?.startsWith(\`\${room.hostUserId}_\`))) {
          return true;
        }
      }

      return false;
    };`.replace(/\n/g, '\r\n');

const newIsSelfCrlf = `    const isSelf = (p: { id?: string; userId?: string; role?: string; name?: string }) => {
      if (!p) return true;
      // Chỉ coi là Self khi trùng chính xác participantId của phiên/thiết bị này
      // (Cho phép cùng 1 tài khoản đăng nhập trên Laptop và Điện thoại đồng thời mà không bị ẩn hay đá nhau)
      return p.id === participantId;
    };`.replace(/\n/g, '\r\n');

if (studyCode.includes(oldIsSelfCrlf)) {
  studyCode = studyCode.replace(oldIsSelfCrlf, newIsSelfCrlf);
  console.log('✅ Fixed isSelf to support multi-device sessions for same user (CRLF)');
} else if (studyCode.includes(oldIsSelfCrlf.replace(/\r\n/g, '\n'))) {
  studyCode = studyCode.replace(oldIsSelfCrlf.replace(/\r\n/g, '\n'), newIsSelfCrlf.replace(/\r\n/g, '\n'));
  console.log('✅ Fixed isSelf to support multi-device sessions for same user (LF)');
} else {
  console.log('ℹ️ isSelf already updated or pattern differs');
}

// Fix 2.2: Fix onPeerLeave in StudyRoomView so leaving 1 device only removes that specific session
const oldOnPeerLeaveCrlf = `        setPresenceUsers((prev) => {
          let found = false;
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (k === peerId || next[k]?.id === peerId || (next[k] as any)?.userId === peerId) {
              delete next[k];
              found = true;
            }
          });
          return found ? next : prev;
        });`.replace(/\n/g, '\r\n');

const newOnPeerLeaveCrlf = `        setPresenceUsers((prev) => {
          if (!prev[peerId]) return prev;
          const next = { ...prev };
          delete next[peerId];
          return next;
        });`.replace(/\n/g, '\r\n');

if (studyCode.includes(oldOnPeerLeaveCrlf)) {
  studyCode = studyCode.replace(oldOnPeerLeaveCrlf, newOnPeerLeaveCrlf);
  console.log('✅ Fixed onPeerLeave to isolate device session cleanup without kicking same-user peers (CRLF)');
} else if (studyCode.includes(oldOnPeerLeaveCrlf.replace(/\r\n/g, '\n'))) {
  studyCode = studyCode.replace(oldOnPeerLeaveCrlf.replace(/\r\n/g, '\n'), newOnPeerLeaveCrlf.replace(/\r\n/g, '\n'));
  console.log('✅ Fixed onPeerLeave to isolate device session cleanup without kicking same-user peers (LF)');
}

// Fix 2.3: Add visibilitychange & online listeners + unthrottled Web Worker heartbeat for silent disconnection prevention
if (!studyCode.includes('handleBackgroundVisibilityChange')) {
  const targetEffectCleanupCrlf = `    return () => {
      window.removeEventListener('focus', syncStudyRoomTimerWithHost);
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);`.replace(/\n/g, '\r\n');

  const recoveryLogicCrlf = `  // =========================================================================
  // SILENT DISCONNECTION & BACKGROUND HEARTBEAT RESILIENCE (V8.1)
  // Bắt sự kiện visibilitychange & online để tự động khôi phục kênh Realtime & WebRTC
  // và khởi tạo Web Worker heartbeat để không bị browser throttle khi chạy nền
  // =========================================================================
  const handleBackgroundRecovery = useCallback(async () => {
    if (!hasJoined || !roomId || !channelRef.current) return;
    console.log('[Meet Background Recovery] Kiểm tra trạng thái kênh Realtime:', channelRef.current.state);

    // 1. Kiểm tra trạng thái kết nối kênh Supabase Realtime
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
      // Kênh vẫn mở -> Làm mới presence track để tránh bị server coi là stale
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

    // 2. Đồng bộ lại đồng hồ phòng học với Host
    syncStudyRoomTimerWithHost();

    // 3. Tự động kiểm tra và phục hồi WebRTC Peer connections
    if (rtcManagerRef.current) {
      rtcManagerRef.current.checkAndRecoverStalePeers();
    }
  }, [hasJoined, roomId, user?.id, clientSessionId, participantName, userRole, isMicOn, isVideoOn, syncStudyRoomTimerWithHost]);

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

    // Inline unthrottled Web Worker heartbeat (gửi ping mỗi 15s kể cả khi tab bị ẩn / tắt màn hình)
    let worker: Worker | null = null;
    try {
      const workerBlob = new Blob([
        \`let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(function() {
              self.postMessage('heartbeat_tick');
            }, 15000);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };\`.replace(/\\r\\n/g, '\\n')
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
  }, [hasJoined, handleBackgroundRecovery, participantId]);\n\n`.replace(/\n/g, '\r\n');

  // Insert before targetEffectCleanup
  if (studyCode.includes(targetEffectCleanupCrlf)) {
    studyCode = studyCode.replace(targetEffectCleanupCrlf, recoveryLogicCrlf + targetEffectCleanupCrlf);
    console.log('✅ Added Background Recovery & Web Worker Heartbeat (CRLF)');
  } else if (studyCode.includes(targetEffectCleanupCrlf.replace(/\r\n/g, '\n'))) {
    studyCode = studyCode.replace(targetEffectCleanupCrlf.replace(/\r\n/g, '\n'), recoveryLogicCrlf.replace(/\r\n/g, '\n') + targetEffectCleanupCrlf.replace(/\r\n/g, '\n'));
    console.log('✅ Added Background Recovery & Web Worker Heartbeat (LF)');
  }
}

fs.writeFileSync('src/components/StudyRoomView.tsx', studyCode, 'utf8');

// =============================================================================
// 3. HARDEN WhiteboardView.tsx (Rate Limiting & Broadcast Throttling)
// =============================================================================
let wbCode = fs.readFileSync('src/components/WhiteboardView.tsx', 'utf8');

const oldDrawHandlerCrlf = `    // 2. Broadcast Live Cursor
    const now = Date.now();
    if (now - lastCursorBroadcastRef.current > 40) {
      lastCursorBroadcastRef.current = now;
      broadcastCursor(normalized, isPointerDownRef.current);
    }

    // 3. Drawing Move
    if (!isPointerDownRef.current) return;

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      currentPointsRef.current.push(normalized);
    } else {
      currentPointsRef.current = [currentPointsRef.current[0], normalized];
    }

    // Broadcast in-flight stream (<50ms)
    if (now - lastStreamBroadcastRef.current > 40 && channel) {
      lastStreamBroadcastRef.current = now;
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_DRAW_STREAM',
        payload: {
          userId: currentUserId,
          userName: currentUserName,
          tool: activeTool,
          color: currentColor,
          size: currentSize,
          points: currentPointsRef.current
        }
      });
    }`.replace(/\n/g, '\r\n');

const newDrawHandlerCrlf = `    // 2. Broadcast Live Cursor: Chỉ gửi khi KHÔNG đang vẽ dở (khi đang vẽ thì draw stream đã mang tọa độ bút)
    const now = Date.now();
    if (!isPointerDownRef.current && now - lastCursorBroadcastRef.current > 60) {
      lastCursorBroadcastRef.current = now;
      broadcastCursor(normalized, false);
    }

    // 3. Drawing Move
    if (!isPointerDownRef.current) return;

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      currentPointsRef.current.push(normalized);
    } else {
      currentPointsRef.current = [currentPointsRef.current[0], normalized];
    }

    // Broadcast in-flight stream (điều tiết an toàn 50ms chống tràn rate limit)
    if (now - lastStreamBroadcastRef.current > 50 && channel) {
      lastStreamBroadcastRef.current = now;
      channel.send({
        type: 'broadcast',
        event: 'WHITEBOARD_DRAW_STREAM',
        payload: {
          userId: currentUserId,
          userName: currentUserName,
          tool: activeTool,
          color: currentColor,
          size: currentSize,
          points: currentPointsRef.current
        }
      });
    }`.replace(/\n/g, '\r\n');

if (wbCode.includes(oldDrawHandlerCrlf)) {
  wbCode = wbCode.replace(oldDrawHandlerCrlf, newDrawHandlerCrlf);
  console.log('✅ Applied Whiteboard broadcast throttling & cursor deduplication (CRLF)');
} else if (wbCode.includes(oldDrawHandlerCrlf.replace(/\r\n/g, '\n'))) {
  wbCode = wbCode.replace(oldDrawHandlerCrlf.replace(/\r\n/g, '\n'), newDrawHandlerCrlf.replace(/\r\n/g, '\n'));
  console.log('✅ Applied Whiteboard broadcast throttling & cursor deduplication (LF)');
} else {
  console.log('ℹ️ Whiteboard draw handler pattern differs or already updated');
}

fs.writeFileSync('src/components/WhiteboardView.tsx', wbCode, 'utf8');

console.log('🎉 Meet Hardening Script completed successfully!');
