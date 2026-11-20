import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Milestone 3 Auth Data Loss & Supabase Schema Test Suite', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const migrationPath = path.join(rootDir, 'supabase/migrations/20261120_focus_sessions.sql');
  const schemaPath = path.join(rootDir, 'supabase/schema.sql');
  const appPath = path.join(rootDir, 'src/App.tsx');

  // =========================================================================
  // 1. Supabase DDL & Migration for focus_sessions (BUG-19)
  // =========================================================================
  describe('1. BUG-19: focus_sessions Table Schema & Migration', () => {
    it('migration file 20261120_focus_sessions.sql exists and contains valid DDL', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // Table definition
      expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.focus_sessions/i);

      // Required fields
      expect(sql).toMatch(/id\s+text\s+primary\s+key/i);
      expect(sql).toMatch(/user_id\s+uuid\s+references\s+auth\.users/i);
      expect(sql).toMatch(/mode\s+text/i);
      expect(sql).toMatch(/duration_minutes\s+integer/i);
      expect(sql).toMatch(/started_at\s+timestamptz/i);
      expect(sql).toMatch(/ended_at\s+timestamptz/i);
      expect(sql).toMatch(/completed\s+boolean/i);
      expect(sql).toMatch(/tag\s+text/i);
      expect(sql).toMatch(/notes\s+text/i);
      expect(sql).toMatch(/created_at\s+timestamptz/i);
      expect(sql).toMatch(/updated_at\s+timestamptz/i);

      // Indices
      expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists\s+idx_focus_sessions_user_id\s+on\s+public\.focus_sessions\s*\(\s*user_id\s*\)/i);
      expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists\s+idx_focus_sessions_started_at\s+on\s+public\.focus_sessions\s*\(\s*started_at\s*\)/i);

      // RLS and policies
      expect(sql).toMatch(/alter\s+table\s+public\.focus_sessions\s+enable\s+row\s+level\s+security/i);
      expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
    });

    it('supabase/schema.sql contains focus_sessions table and RLS policies', () => {
      expect(fs.existsSync(schemaPath)).toBe(true);
      const sql = fs.readFileSync(schemaPath, 'utf-8');

      expect(sql).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.focus_sessions/i);
      expect(sql).toMatch(/user_id\s+uuid\s+references\s+auth\.users/i);
      expect(sql).toMatch(/alter\s+table\s+public\.focus_sessions\s+enable\s+row\s+level\s+security/i);
      expect(sql).toMatch(/create\s+policy\s+"Users read own focus sessions"\s+on\s+public\.focus_sessions/i);
      expect(sql).toMatch(/create\s+policy\s+"Users insert own focus sessions"\s+on\s+public\.focus_sessions/i);
      expect(sql).toMatch(/create\s+policy\s+"Users update own focus sessions"\s+on\s+public\.focus_sessions/i);
      expect(sql).toMatch(/create\s+policy\s+"Users delete own focus sessions"\s+on\s+public\.focus_sessions/i);
    });
  });

  // =========================================================================
  // 2. App.tsx AutoSync & loadUserFromCloud Integration (BUG-24)
  // =========================================================================
  describe('2. BUG-24: App.tsx Offline AutoSync & loadUserFromCloud Call', () => {
    it('App.tsx imports syncQueueService and starts autoSync on mount', () => {
      const appContent = fs.readFileSync(appPath, 'utf-8');

      // Import verified
      expect(appContent).toMatch(/import\s*\{\s*syncQueueService\s*\}\s*from\s*['"]\.\/services\/syncQueueService['"]/);

      // startAutoSync called inside useEffect
      expect(appContent).toContain('syncQueueService.startAutoSync(');
    });

    it('App.tsx calls loadUserFromCloud(user.id) instead of syncUserFromSupabase(user.id)', () => {
      const appContent = fs.readFileSync(appPath, 'utf-8');

      // Must NOT call syncUserFromSupabase with string user.id
      expect(appContent).not.toMatch(/syncUserFromSupabase\s*\(\s*user\.id\s*\)/);

      // Must call loadUserFromCloud with user.id
      expect(appContent).toMatch(/loadUserFromCloud\s*\(\s*user\.id\s*\)/);
    });
  });
});
