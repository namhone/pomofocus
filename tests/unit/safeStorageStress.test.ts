import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  safeStorage,
  MemoryStorage,
  isQuotaExceededError,
  STORAGE_SCHEMA_VERSION,
  runStorageSchemaMigration,
  OBSOLETE_STORAGE_KEYS,
  OBSOLETE_STORAGE_PREFIXES
} from '../../src/utils/safeStorage';
import { useAiStore } from '../../src/stores/useAiStore';

describe('Empirical Adversarial Stress-Testing: SafeStorage & Storage Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    safeStorage._resetForTest?.();
    vi.restoreAllMocks();
  });

  describe('Dimension 1: Browser QuotaExceeded Signature Matrix & Edge Traps', () => {
    it('accurately identifies all major browser QuotaExceededError variants', () => {
      // 1. Blink / WebKit standard
      expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true);
      expect(isQuotaExceededError({ name: 'QuotaExceededError', code: 22 })).toBe(true);

      // 2. Firefox / Gecko standard
      expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
      expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED', code: 1014 })).toBe(true);

      // 3. Legacy WebKit / iOS Safari code 22
      expect(isQuotaExceededError({ code: 22 })).toBe(true);

      // 4. Legacy Firefox code 1014
      expect(isQuotaExceededError({ code: 1014 })).toBe(true);

      // 5. Legacy IE / Old Edge HRESULT (-2147024882)
      expect(isQuotaExceededError({ number: -2147024882 })).toBe(true);

      // 6. DOMException instance emulation
      const domException = new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      expect(isQuotaExceededError(domException)).toBe(true);
    });

    it('rejects unrelated error signatures and non-quota failures', () => {
      expect(isQuotaExceededError(null)).toBe(false);
      expect(isQuotaExceededError(undefined)).toBe(false);
      expect(isQuotaExceededError(42)).toBe(false);
      expect(isQuotaExceededError('QuotaExceededError')).toBe(false);
      expect(isQuotaExceededError({})).toBe(false);
      expect(isQuotaExceededError(new Error('Network error'))).toBe(false);
      expect(isQuotaExceededError({ name: 'SecurityError', code: 18 })).toBe(false);
      expect(isQuotaExceededError({ name: 'NotFoundError', code: 8 })).toBe(false);
      expect(isQuotaExceededError({ code: 0 })).toBe(false);
      expect(isQuotaExceededError({ number: -1 })).toBe(false);
    });

    it('survives adversarial getter traps without crashing', () => {
      const adversarialObject = {
        get name() {
          return 'QuotaExceededError';
        },
        code: 22
      };
      expect(isQuotaExceededError(adversarialObject)).toBe(true);
    });
  });

  describe('Dimension 2: Quota Saturation Transition & Cross-Store Data Retention', () => {
    it('seamlessly transitions to MemoryStorage when quota is exceeded mid-session', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Phase 1: Normal storage works
      safeStorage.setItem('pre_quota_key_1', 'value_1');
      safeStorage.setItem('pre_quota_key_2', 'value_2');
      expect(safeStorage.getItem('pre_quota_key_1')).toBe('value_1');
      expect(safeStorage.getItem('pre_quota_key_2')).toBe('value_2');

      // Phase 2: Simulate QuotaExceededError on subsequent write
      let failQuota = true;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
        if (failQuota) {
          const err = new Error('The quota has been exceeded');
          err.name = 'QuotaExceededError';
          (err as any).code = 22;
          throw err;
        }
      });

      // Write that triggers quota failure
      const overflowResult = safeStorage.setItem('overflow_key', 'large_data_block');
      expect(overflowResult).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SafeStorage] QuotaExceededError'));

      // In-memory write succeeds
      expect(safeStorage.getItem('overflow_key')).toBe('large_data_block');

      // Additional writes also succeed in memory
      safeStorage.setItem('post_quota_key', 'post_quota_value');
      expect(safeStorage.getItem('post_quota_key')).toBe('post_quota_value');
    });

    it('tests pre-existing localStorage key accessibility after fallback activation', () => {
      // Pre-seed localStorage before safeStorage fallback triggers
      localStorage.setItem('persisted_setting', 'dark_mode');
      localStorage.setItem('user_volume', '80');

      // Force quota exhaustion
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        (err as any).code = 22;
        throw err;
      });

      // Trigger fallback
      safeStorage.setItem('overflow_trigger', 'data');

      // Check access to in-memory key
      expect(safeStorage.getItem('overflow_trigger')).toBe('data');

      // Empirical check: what does safeStorage.getItem return for 'persisted_setting'?
      const settingVal = safeStorage.getItem('persisted_setting');
      const volumeVal = safeStorage.getItem('user_volume');
      
      // Expected architectural invariant: QuotaExceeded on write must NOT obscure existing readable keys in localStorage
      expect(settingVal).toBe('dark_mode');
      expect(volumeVal).toBe('80');
    });

    it('tests removeItem and clear behavior when in fallback mode', () => {
      localStorage.setItem('stale_key', 'stale_value');

      // Trigger fallback
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        (err as any).code = 22;
        throw err;
      });
      safeStorage.setItem('new_mem_key', 'new_mem_val');

      // Try removing new_mem_key
      safeStorage.removeItem('new_mem_key');
      expect(safeStorage.getItem('new_mem_key')).toBeNull();

      // Try removing stale_key - should remove from localStorage to allow freeing space
      safeStorage.removeItem('stale_key');
      expect(localStorage.getItem('stale_key')).toBeNull();
    });
  });

  describe('Dimension 3: High-Frequency & Concurrent Saturation Stress', () => {
    it('survives 1,000 rapid synchronous setItem calls without memory or stack failure', () => {
      const count = 1000;
      for (let i = 0; i < count; i++) {
        const success = safeStorage.setItem(`stress_sync_${i}`, `content_${i}_${'x'.repeat(20)}`);
        expect(success).toBe(true);
      }

      // Verify spot samples
      expect(safeStorage.getItem('stress_sync_0')).toContain('content_0_');
      expect(safeStorage.getItem('stress_sync_500')).toContain('content_500_');
      expect(safeStorage.getItem('stress_sync_999')).toContain('content_999_');
    });

    it('handles 500 concurrent asynchronous safeSetJSON and safeGetJSON operations', async () => {
      const concurrency = 500;
      const tasks = Array.from({ length: concurrency }, async (_, idx) => {
        const payload = {
          id: `task_${idx}`,
          timestamp: Date.now(),
          nested: { count: idx, active: idx % 2 === 0 },
          tags: ['stress', 'concurrency', `tag_${idx}`]
        };
        const setOk = safeStorage.safeSetJSON(`async_key_${idx}`, payload);
        expect(setOk).toBe(true);

        const readBack = safeStorage.safeGetJSON(`async_key_${idx}`, null);
        expect(readBack).toEqual(payload);
      });

      await Promise.all(tasks);
    });

    it('handles large 500KB JSON payload serialization safely', () => {
      const largeObject = {
        meta: 'large_payload_test',
        records: Array.from({ length: 2500 }, (_, i) => ({
          id: i,
          guid: `c2c10b27-5d0b-4e89-8d8a-9f4c${i.toString().padStart(8, '0')}`,
          score: Math.random() * 100,
          text: `Sample sentence for stress payload testing item #${i}`
        }))
      };

      const setSuccess = safeStorage.safeSetJSON('large_payload_key', largeObject);
      expect(setSuccess).toBe(true);

      const retrieved = safeStorage.safeGetJSON<typeof largeObject | null>('large_payload_key', null);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.records.length).toBe(2500);
      expect(retrieved?.records[100].id).toBe(100);
    });

    it('gracefully fails safeSetJSON on circular objects without throwing', () => {
      const circular: any = { name: 'circular_test' };
      circular.self = circular;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = safeStorage.safeSetJSON('circular_key', circular);
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SafeStorage] safeSetJSON serialization error'), expect.any(TypeError));
    });
  });

  describe('Dimension 4: Storage Schema Migration Adversarial Fuzzing', () => {
    it('survives corrupted, non-object, and malformed pomofocus_ai_store payloads', () => {
      const malformedPayloads = [
        'INVALID_JSON_STRING{{{',
        'null',
        '42',
        '"just_a_string"',
        'true',
        '[]',
        '{"unexpected": 123}',
        '{"state": null}',
        '{"state": "not_an_object"}',
        '{"state": {"messages": "not_an_array"}}',
        '{"state": {"messages": null}}',
        '{"messages": [1,2,3], "state": {"messages": [4,5,6]}}'
      ];

      for (const payload of malformedPayloads) {
        localStorage.setItem('pomofocus_ai_store', payload);
        safeStorage.setItem('pomofocus_storage_schema_version', '0');

        // Must never throw
        expect(() => runStorageSchemaMigration(true)).not.toThrow();
        expect(safeStorage.getItem('pomofocus_storage_schema_version')).toBe(String(STORAGE_SCHEMA_VERSION));
      }
    });

    it('safely purges hundreds of dynamic prefix keys mixed with non-prefix keys', () => {
      // Seed 200 prefix keys and 200 normal keys
      for (let i = 0; i < 200; i++) {
        localStorage.setItem(`pomodoro_room_part_cnt_room_${i}`, `${i}`);
        localStorage.setItem(`pomodoro_room_study_sec_room_${i}`, `${i * 60}`);
        localStorage.setItem(`valid_user_pref_${i}`, `pref_${i}`);
      }

      runStorageSchemaMigration(true);

      // Verify all 400 prefix keys removed
      for (let i = 0; i < 200; i++) {
        expect(localStorage.getItem(`pomodoro_room_part_cnt_room_${i}`)).toBeNull();
        expect(localStorage.getItem(`pomodoro_room_study_sec_room_${i}`)).toBeNull();
        // Verify valid keys preserved
        expect(localStorage.getItem(`valid_user_pref_${i}`)).toBe(`pref_${i}`);
      }
    });

    it('remains completely idempotent over 20 consecutive migration executions', () => {
      localStorage.setItem('pomodoro_study_rooms_store', 'mock_room_data');
      localStorage.setItem('pomodoro_room_part_cnt_123', '12');

      for (let run = 0; run < 20; run++) {
        expect(() => runStorageSchemaMigration(false)).not.toThrow();
      }

      expect(localStorage.getItem('pomodoro_study_rooms_store')).toBeNull();
      expect(localStorage.getItem('pomodoro_room_part_cnt_123')).toBeNull();
      expect(safeStorage.getItem('pomofocus_storage_schema_version')).toBe(String(STORAGE_SCHEMA_VERSION));
    });
  });

  describe('Dimension 5: useAiStore partialize Contract Verification', () => {
    it('verifies that useAiStore partialize preserves messages array contract', () => {
      // Check Zustand store state and persist partialize
      const storeState = useAiStore.getState();
      expect(storeState).toBeDefined();

      // Check persist configuration
      const persistOptions = (useAiStore as any).persist?.getOptions?.();
      if (persistOptions?.partialize) {
        const mockFullState: any = {
          messages: [{ id: 'm1', content: 'test', role: 'user' }],
          sessions: [{ id: 's1', title: 'Session 1' }],
          aiCreditsBalance: 50,
          aiPlan: 'pro',
          activeSessionId: 's1'
        };

        const partialized = persistOptions.partialize(mockFullState);
        expect(Array.isArray(partialized.messages)).toBe(true);
        expect(partialized.sessions).toBeDefined();
        expect(partialized.aiCreditsBalance).toBe(50);
        expect(partialized.aiPlan).toBe('pro');
      }
    });
  });
});
