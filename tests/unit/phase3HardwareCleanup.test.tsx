import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { WebRTCConnectionManager } from '../../src/services/WebRTCConnectionManager';
import { RoomStreamMedia } from '../../src/components/common/RoomStreamMedia';

class Peer {
  static peers: Peer[] = [];
  signalingState = 'stable';
  connectionState = 'connected';
  ontrack: ((e: any) => void) | null = null;
  onicecandidate = null;
  onconnectionstatechange = null;
  dc = { onmessage: null, readyState: 'open', close: vi.fn(), send: vi.fn() };
  constructor() { Peer.peers.push(this); }
  createDataChannel = vi.fn(() => this.dc);
  addTrack = vi.fn();
  getSenders = vi.fn(() => []);
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  close = vi.fn(() => { this.signalingState = 'closed'; });
}
const managers: WebRTCConnectionManager[] = [];
const stream = () => { const track = { stop: vi.fn() }; return { track, getTracks: () => [track] } as any; };
beforeEach(() => {
  vi.useFakeTimers(); Peer.peers = [];
  vi.stubGlobal('RTCPeerConnection', Peer);
  vi.stubGlobal('BroadcastChannel', class { onmessage = null; close = vi.fn(); postMessage = vi.fn(); });
});
afterEach(() => { cleanup(); managers.splice(0).forEach(m => m.destroy()); vi.useRealTimers(); vi.unstubAllGlobals(); });
function manager() {
  const channel: any = { topic: 'cleanup-room', on: vi.fn().mockReturnThis(), off: vi.fn(), send: vi.fn() };
  const m = new WebRTCConnectionManager(channel, 'z-user', { onRemoteStream: vi.fn(), onPeerLeave: vi.fn() });
  managers.push(m); return { m, channel };
}
describe('Phase 3 hardware release', () => {
  it('recreation closes the old data channel and receiver track, then negotiates a fresh peer', async () => {
    const { m } = manager(); await m.callPeer('a-user');
    const previous = Peer.peers[0]; const remote = stream(); previous.ontrack?.({ streams: [remote] });
    m.recreatePeerConnection('a-user'); await Promise.resolve();
    expect(previous.dc.close).toHaveBeenCalledOnce();
    expect(previous.dc.onmessage).toBeNull();
    expect(previous.close).toHaveBeenCalledOnce();
    expect(remote.track.stop).toHaveBeenCalledOnce();
    expect(Peer.peers).toHaveLength(2);
    expect(Peer.peers[1].createOffer).toHaveBeenCalledOnce();
  });
  it('destroy releases local and remote tracks, connections, signaling listeners and timers exactly once', async () => {
    const { m, channel } = manager(); const local = stream(), remote = stream();
    m.setLocalStream(local); await m.callPeer('a-user');
    const pc = Peer.peers[0]; pc.ontrack?.({ streams: [remote] });
    m.destroy(); m.destroy();
    expect(local.track.stop).toHaveBeenCalledOnce();
    expect(remote.track.stop).toHaveBeenCalledOnce();
    expect(pc.dc.close).toHaveBeenCalledOnce();
    expect(channel.off).toHaveBeenCalledTimes(5);
    const sent = channel.send.mock.calls.length; vi.advanceTimersByTime(60000);
    expect(channel.send).toHaveBeenCalledTimes(sent);
    await m.callPeer('new-user'); expect(Peer.peers).toHaveLength(1);
  });
  it('detaches replaced and unmounted DOM streams while leaving shared hardware ownership with the room', () => {
    const first = stream(), second = stream();
    const view = render(<RoomStreamMedia kind="video" stream={first} />);
    const video = view.container.querySelector('video')!;
    expect(video.srcObject).toBe(first); expect(video.muted).toBe(true);
    view.rerender(<RoomStreamMedia kind="video" stream={second} />);
    expect(video.srcObject).toBe(second);
    expect(first.track.stop).not.toHaveBeenCalled();
    view.unmount(); expect(video.srcObject).toBeNull();
    expect(second.track.stop).not.toHaveBeenCalled();
  });
});
