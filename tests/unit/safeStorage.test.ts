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

describe('SafeStorage & Storage Schema Migration Specification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    safeStorage._resetForTest?.();
    vi.restoreAllMocks();
  });

  describe('1. MemoryStorage Basic In-Memory Operations', () => {
    it('implements get, set, remove, clear, and key methods correctly', () => {
      const mem = new MemoryStorage();
      expect(mem.getItem('foo')).toBeNull();

      mem.setItem('foo', 'bar');
      expect(mem.getItem('foo')).toBe('bar');
      expect(mem.length).toBe(1);
      expect(mem.key(0)).toBe('foo');

      mem.removeItem('foo');
      expect(mem.getItem('foo')).toBeNull();
      expect(mem.length).toBe(0);

      mem.setItem('a', '1');
      mem.setItem('b', '2');
      expect(mem.length).toBe(2);
      mem.clear();
      expect(mem.length).toBe(0);
      expect(mem.getItem('a')).toBeNull();
    });
  });

  describe('2. SafeStorage Standard Operations', () => {
    it('sets and gets string items safely', () => {
      expect(safeStorage.getItem('test_key')).toBeNull();
      expect(safeStorage.getItem('test_key', 'fallback_val')).toBe('fallback_val');

      const setResult = safeStorage.setItem('test_key', 'hello_world');
      expect(setResult).toBe(true);
      expect(safeStorage.getItem('test_key')).toBe('hello_world');
    });

    it('removes items safely from storage', () => {
      safeStorage.setItem('temp_key', 'temp_val');
      expect(safeStorage.getItem('temp_key')).toBe('temp_val');

      safeStorage.removeItem('temp_key');
      expect(safeStorage.getItem('temp_key')).toBeNull();
    });

    it('clears all items safely', () => {
      safeStorage.setItem('k1', 'v1');
      safeStorage.setItem('k2', 'v2');
      safeStorage.clear();
      expect(safeStorage.getItem('k1')).toBeNull();
      expect(safeStorage.getItem('k2')).toBeNull();
    });

    it('safely serializes and deserializes JSON with safeGetJSON & safeSetJSON', () => {
      const testObj = { name: 'Pomofocus', count: 42, active: true };
      const setSuccess = safeStorage.safeSetJSON('obj_key', testObj);
      expect(setSuccess).toBe(true);

      const retrieved = safeStorage.safeGetJSON('obj_key', { fallback: true });
      expect(retrieved).toEqual(testObj);

      // Fallback on missing key
      const fallbackRetrieved = safeStorage.safeGetJSON('missing_key', { def: 123 });
      expect(fallbackRetrieved).toEqual({ def: 123 });

      // Fallback on corrupted JSON
      localStorage.setItem('corrupted_key', '{{{invalid-json-string');
      const corruptedRetrieved = safeStorage.safeGetJSON('corrupted_key', { recovered: true });
      expect(corruptedRetrieved).toEqual({ recovered: true });
    });
  });

  describe('3. QuotaExceededError & Incognito Resilience', () => {
    it('identifies QuotaExceededError by name, code, or HRESULT number', () => {
      expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true);
      expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
      expect(isQuotaExceededError({ code: 22 })).toBe(true);
      expect(isQuotaExceededError({ code: 1014 })).toBe(true);
      expect(isQuotaExceededError({ number: -2147024882 })).toBe(true);
      expect(isQuotaExceededError(new Error('Other error'))).toBe(false);
      expect(isQuotaExceededError(null)).toBe(false);
    });

    it('gracefully falls back to in-memory storage when QuotaExceededError is thrown', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate browser throwing QuotaExceededError on localStorage.setItem
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      (quotaError as any).code = 22;

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError;
      });

      const writeSuccess = safeStorage.setItem('overflow_key', 'heavy_payload_content');
      expect(writeSuccess).toBe(true);
      expect(warnSpy).toHaveBeenCalled();

      // Subsequent read retrieves from in-memory fallback
      const readVal = safeStorage.getItem('overflow_key');
      expect(readVal).toBe('heavy_payload_content');

      // Subsequent writes and reads continue to work seamlessly in memory
      safeStorage.setItem('overflow_key_2', 'second_value');
      expect(safeStorage.getItem('overflow_key_2')).toBe('second_value');
    });

    it('gracefully handles private browsing / blocked localStorage environment', () => {
      // Simulate SecurityError when accessing localStorage
      const securityError = new Error('The operation is insecure.');
      securityError.name = 'SecurityError';

      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw securityError;
      });

      const result = safeStorage.setItem('private_key', 'private_val');
      expect(result).toBe(false); // Reports false for security errors but routes to memory
      expect(safeStorage.getItem('private_key')).toBe('private_val');
    });
  });

  describe('4. Storage Schema Migration & Obsolete Key Purge', () => {
    it('purges static obsolete and mock keys on migration', () => {
      // Seed obsolete keys into localStorage
      for (const k of OBSOLETE_STORAGE_KEYS) {
        localStorage.setItem(k, JSON.stringify({ mock: true }));
      }
      expect(localStorage.getItem('pomodoro_study_rooms_store')).toBeDefined();
      expect(localStorage.getItem('pomodoro_deleted_rooms_store')).toBeDefined();

      runStorageSchemaMigration(true);

      for (const k of OBSOLETE_STORAGE_KEYS) {
        expect(localStorage.getItem(k)).toBeNull();
      }
      expect(safeStorage.getItem('pomofocus_storage_schema_version')).toBe(String(STORAGE_SCHEMA_VERSION));
    });

    it('purges dynamic prefix keys (pomodoro_room_part_cnt_* and pomodoro_room_study_sec_*)', () => {
      localStorage.setItem('pomodoro_room_part_cnt_room_abc_1', '5');
      localStorage.setItem('pomodoro_room_part_cnt_room_xyz_2', '10');
      localStorage.setItem('pomodoro_room_study_sec_room_abc_1', '3600');
      localStorage.setItem('pomofocus_keep_this_key', 'valid');

      runStorageSchemaMigration(true);

      expect(localStorage.getItem('pomodoro_room_part_cnt_room_abc_1')).toBeNull();
      expect(localStorage.getItem('pomodoro_room_part_cnt_room_xyz_2')).toBeNull();
      expect(localStorage.getItem('pomodoro_room_study_sec_room_abc_1')).toBeNull();
      expect(localStorage.getItem('pomofocus_keep_this_key')).toBe('valid');
    });

    it('evacuates messages array from pomofocus_ai_store while preserving remaining state', () => {
      const initialAiStore = {
        state: {
          aiCreditsBalance: 75,
          aiPlan: 'pro',
          messages: [
            { id: 'msg_1', content: 'Long chat message 1', role: 'user' },
            { id: 'msg_2', content: 'Long response 2', role: 'assistant' }
          ],
          sessions: [{ id: 's1', title: 'Session 1' }]
        },
        version: 0
      };

      localStorage.setItem('pomofocus_ai_store', JSON.stringify(initialAiStore));

      runStorageSchemaMigration(true);

      const cleanedRaw = localStorage.getItem('pomofocus_ai_store');
      expect(cleanedRaw).toBeDefined();
      const parsed = JSON.parse(cleanedRaw!);

      expect(parsed.state.aiCreditsBalance).toBe(75);
      expect(parsed.state.aiPlan).toBe('pro');
      expect(parsed.state.sessions).toEqual([{ id: 's1', title: 'Session 1' }]);
      // messages array must be completely removed from localStorage
      expect(parsed.state.messages).toBeUndefined();
    });

    it('skips migration when schema version is already up to date without force flag', () => {
      safeStorage.setItem('pomofocus_storage_schema_version', String(STORAGE_SCHEMA_VERSION));
      localStorage.setItem('pomodoro_study_rooms_store', 'should_remain');

      // Migration called without force
      runStorageSchemaMigration(false);

      // Key should remain since version matched
      expect(localStorage.getItem('pomodoro_study_rooms_store')).toBe('should_remain');
    });
  });
});
