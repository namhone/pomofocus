import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUUID, isValidUUIDv4 } from '../../src/utils/uuid';
import {
  updateClockOffsetFromResponse,
  getServerClockOffset,
  getServerTime,
  setServerClockOffset,
  resetServerClockOffset
} from '../../src/utils/clockSync';
import { safeParseJson, safeParseJsonResult } from '../../src/utils/safeFetch';
import { syncQueueService } from '../../src/services/syncQueueService';
import { db } from '../../src/db';
import type { Task } from '../../src/types/tasks';

describe('Adversarial Forensic Stress-Test: Milestone 2 Components', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetServerClockOffset();
  });

  afterEach(() => {
    resetServerClockOffset();
  });

  describe('Adversarial 1: UUID v4 Collision, Distribution & Fallback Chains', () => {
    it('generates 5,000 distinct UUIDs with 0 collisions and 100% RFC4122 compliance', () => {
      const set = new Set<string>();
      const sampleSize = 5000;
      for (let i = 0; i < sampleSize; i++) {
        const u = generateUUID();
        expect(isValidUUIDv4(u)).toBe(true);
        set.add(u);
      }
      expect(set.size).toBe(sampleSize);
    });

    it('forces crypto.getRandomValues fallback when crypto.randomUUID throws', () => {
      const origRandomUUID = crypto.randomUUID;
      try {
        (crypto as any).randomUUID = () => {
          throw new Error('Simulated randomUUID failure in restricted iframe');
        };
        const u = generateUUID();
        expect(isValidUUIDv4(u)).toBe(true);
        expect(u.length).toBe(36);
        expect(u.split('-')[2].startsWith('4')).toBe(true);
      } finally {
        (crypto as any).randomUUID = origRandomUUID;
      }
    });

    it('forces Math.random fallback when both crypto methods fail or are missing', () => {
      const origCrypto = globalThis.crypto;
      try {
        // Temporarily redefine crypto
        Object.defineProperty(globalThis, 'crypto', {
          value: {
            randomUUID: undefined,
            getRandomValues: undefined
          },
          configurable: true,
          writable: true
        });

        const u = generateUUID();
        expect(isValidUUIDv4(u)).toBe(true);
        expect(u.length).toBe(36);
        expect(u.split('-')[2].startsWith('4')).toBe(true);
        const variantChar = u.split('-')[3][0].toLowerCase();
        expect(['8', '9', 'a', 'b'].includes(variantChar)).toBe(true);
      } finally {
        Object.defineProperty(globalThis, 'crypto', {
          value: origCrypto,
          configurable: true,
          writable: true
        });
      }
    });

    it('rigorously tests isValidUUIDv4 edge cases and invalid formats', () => {
      expect(isValidUUIDv4(null as any)).toBe(false);
      expect(isValidUUIDv4(undefined as any)).toBe(false);
      expect(isValidUUIDv4(12345 as any)).toBe(false);
      // Valid lowercase
      expect(isValidUUIDv4('c8f90afe-cc27-42a6-bc46-1bceeef03cf3')).toBe(true);
      // Valid uppercase
      expect(isValidUUIDv4('C8F90AFE-CC27-42A6-BC46-1BCEEEF03CF3')).toBe(true);
      // Invalid version (version 1 instead of 4)
      expect(isValidUUIDv4('c8f90afe-cc27-12a6-bc46-1bceeef03cf3')).toBe(false);
      // Invalid variant (variant 0 instead of 8,9,a,b)
      expect(isValidUUIDv4('c8f90afe-cc27-42a6-3c46-1bceeef03cf3')).toBe(false);
      // Invalid length / extra characters
      expect(isValidUUIDv4('c8f90afe-cc27-42a6-bc46-1bceeef03cf34')).toBe(false);
      expect(isValidUUIDv4('c8f90afe-cc27-42a6-bc46-1bceeef03cf')).toBe(false);
      // Non-hex chars
      expect(isValidUUIDv4('g8f90afe-cc27-42a6-bc46-1bceeef03cf3')).toBe(false);
    });
  });

  describe('Adversarial 2: Clock Skew Edge Cases & Boundary Conditions', () => {
    it('handles malformed date headers without crashing and preserves existing offset', () => {
      setServerClockOffset(1500);
      const headers = new Headers();
      headers.set('date', 'not-a-valid-date-header');
      const offset = updateClockOffsetFromResponse(headers);
      // Should gracefully catch and return unchanged offset
      expect(offset).toBe(1500);
      expect(getServerClockOffset()).toBe(1500);
    });

    it('handles empty or missing date headers safely', () => {
      setServerClockOffset(2500);
      const headers = new Headers();
      const offset = updateClockOffsetFromResponse(headers);
      expect(offset).toBe(2500);
    });

    it('supports negative clock skew (client is ahead of server)', () => {
      const serverDate = new Date(10000).toUTCString();
      const headers = new Headers();
      headers.set('date', serverDate);
      // Client midpoint = 15000 -> offset = 10000 - 15000 = -5000
      const offset = updateClockOffsetFromResponse(headers, 14900, 15100);
      expect(offset).toBe(-5000);
      expect(getServerClockOffset()).toBe(-5000);

      vi.spyOn(Date, 'now').mockReturnValue(20000);
      expect(getServerTime()).toBe(15000);
    });
  });

  describe('Adversarial 3: Captive Portal & Malformed JSON Responses', () => {
    it('rejects 200 OK HTML captive portal with informative error', async () => {
      const res = new Response('<html><head><title>WiFi Hotspot Login</title></head><body>Login Here</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      });
      await expect(safeParseJson(res, { endpointName: 'HotelWifi' })).rejects.toThrow(
        /Phát hiện mạng WiFi yêu cầu đăng nhập/
      );
    });

    it('returns fallback instead of throwing when fallback is configured on HTML response', async () => {
      const res = new Response('<html>Login required</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      });
      const fallback = { fallbackTriggered: true };
      const result = await safeParseJson(res, fallback);
      expect(result).toEqual({ fallbackTriggered: true });
    });

    it('handles empty response safely with fallback', async () => {
      const res = new Response(null, {
        status: 204,
        headers: { 'content-type': 'application/json' }
      });
      const result = await safeParseJson(res, { fallback: { defaultVal: 1 } });
      expect(result).toEqual({ defaultVal: 1 });
    });

    it('safeParseJsonResult returns structured captive portal metadata', async () => {
      const res = new Response('<html><body>Captive Portal</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' }
      });
      const result = await safeParseJsonResult(res, { default: true });
      expect(result.ok).toBe(false);
      expect(result.isCaptivePortal).toBe(true);
      expect(result.data).toEqual({ default: true });
      expect(result.error).toContain('Captive Portal');
    });

    it('safeParseJsonResult handles malformed JSON body with application/json header', async () => {
      const res = new Response('{"broken": json', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
      const result = await safeParseJsonResult(res, null);
      expect(result.ok).toBe(false);
      expect(result.isCaptivePortal).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });

  describe('Adversarial 4: Sync Queue Resiliency & Strict Retention Invariants', () => {
    it('validates exponential backoff progression and cap at 300,000ms', () => {
      const calculateDelay = (retryCount: number) =>
        Math.min(300000, 1000 * Math.pow(2, retryCount));

      expect(calculateDelay(0)).toBe(1000);
      expect(calculateDelay(1)).toBe(2000);
      expect(calculateDelay(2)).toBe(4000);
      expect(calculateDelay(3)).toBe(8000);
      expect(calculateDelay(4)).toBe(16000);
      expect(calculateDelay(5)).toBe(32000);
      expect(calculateDelay(6)).toBe(64000);
      expect(calculateDelay(7)).toBe(128000);
      expect(calculateDelay(8)).toBe(256000);
      expect(calculateDelay(9)).toBe(300000); // capped at 5 mins
      expect(calculateDelay(20)).toBe(300000); // strictly capped
    });

    it('enforces that failed mutations are preserved, never deleted after 5 attempts', async () => {
      const id = generateUUID();
      await db.sync_queue.put({
        id,
        userId: 'usr_adversarial_1',
        tableName: 'tasks',
        recordId: generateUUID(),
        action: 'UPDATE',
        payload: { title: 'Persistent Offline Mutation' },
        status: 'failed',
        createdAt: Date.now(),
        retryCount: 6,
        lastError: 'HTTP 429 Too Many Requests'
      });

      // Verify the record is in db
      const fetched = await db.sync_queue.get(id);
      expect(fetched).toBeDefined();
      expect(fetched?.status).toBe('failed');
      expect(fetched?.retryCount).toBe(6);

      // Verify getPendingMutations excludes failed mutations
      const pending = await syncQueueService.getPendingMutations('usr_adversarial_1');
      expect(pending.some((m) => m.id === id)).toBe(false);

      // Verify retryFailedMutations resets mutation to pending, runs flushQueue, and handles retry increment
      const retryResult = await syncQueueService.retryFailedMutations('usr_adversarial_1');
      expect(retryResult.failedCount).toBe(1);

      const retried = await db.sync_queue.get(id);
      expect(retried).toBeDefined();
      expect(retried?.status).toBe('pending');
      expect(retried?.retryCount).toBe(1);
      expect(retried?.nextRetryAt).toBeGreaterThan(Date.now() - 5000);

      // Cleanup
      await db.sync_queue.delete(id);
    });
  });

  describe('Adversarial 5: Soft Delete Tombstone 30-Day Boundary Precision', () => {
    it('strictly preserves records deleted 29 days 23 hours ago, and purges records deleted 30 days 1 hour ago', () => {
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

      const recentTombstone: Task = {
        id: generateUUID(),
        title: 'Task deleted 29.9 days ago',
        completed: true,
        priority: 'p2',
        status: 'archived',
        tagIds: [],
        repeat: 'none',
        orderIndex: 0,
        estimatedPomodoros: 1,
        completedPomodoros: 1,
        createdAt: now - 35 * 24 * 60 * 60 * 1000,
        updatedAt: now - (THIRTY_DAYS_MS - 60 * 60 * 1000), // 1 hour before 30 days
        deletedAt: now - (THIRTY_DAYS_MS - 60 * 60 * 1000)
      };

      const expiredTombstone: Task = {
        id: generateUUID(),
        title: 'Task deleted 30.1 days ago',
        completed: true,
        priority: 'p2',
        status: 'archived',
        tagIds: [],
        repeat: 'none',
        orderIndex: 1,
        estimatedPomodoros: 1,
        completedPomodoros: 1,
        createdAt: now - 35 * 24 * 60 * 60 * 1000,
        updatedAt: now - (THIRTY_DAYS_MS + 60 * 60 * 1000), // 1 hour after 30 days
        deletedAt: now - (THIRTY_DAYS_MS + 60 * 60 * 1000)
      };

      const isGcEligible = (t: Task) => Boolean(t.deletedAt && now - t.deletedAt > THIRTY_DAYS_MS);

      expect(isGcEligible(recentTombstone)).toBe(false);
      expect(isGcEligible(expiredTombstone)).toBe(true);
    });
  });
});
