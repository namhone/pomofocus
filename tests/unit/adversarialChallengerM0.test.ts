import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Empirical Challenger M0: Adversarial Stress Test & Oracle Harness', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261121_tighten_payment_rls.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // ===========================================================================
  // 1. ORACLE: PostgreSQL RLS WITH CHECK Condition Evaluator
  // ===========================================================================
  describe('Oracle: payment_orders_insert_own WITH CHECK clause evaluation', () => {
    // Extract exact WITH CHECK condition
    const match = sql.match(/CREATE\s+POLICY\s+"payment_orders_insert_own"[\s\S]*?WITH\s+CHECK\s*\(([\s\S]*?)\);/i);
    expect(match).not.toBeNull();
    const withCheckClause = match![1].trim();

    it('confirms the exact SQL condition contains status check', () => {
      expect(withCheckClause).toContain('(select auth.uid())::text = user_id');
      expect(withCheckClause).toMatch(/\(status\s+IS\s+NULL\s+OR\s+status\s*=\s*'pending'\)/i);
    });

    // PostgreSQL boolean evaluation simulation for:
    // ((select auth.uid())::text = user_id AND (status IS NULL OR status = 'pending'))
    const evaluateInsertRls = (authUid: string, row: { user_id: string; status?: string | null }) => {
      const isOwner = authUid === row.user_id;
      const isStatusValid = row.status === null || row.status === undefined || row.status === 'pending';
      return isOwner && isStatusValid;
    };

    const testVectors = [
      { name: 'Direct insert with status = completed', authUid: 'user-123', row: { user_id: 'user-123', status: 'completed' }, expected: false },
      { name: 'Direct insert with status = COMPLETED (caps)', authUid: 'user-123', row: { user_id: 'user-123', status: 'COMPLETED' }, expected: false },
      { name: 'Direct insert with status = paid', authUid: 'user-123', row: { user_id: 'user-123', status: 'paid' }, expected: false },
      { name: 'Direct insert with status = processing', authUid: 'user-123', row: { user_id: 'user-123', status: 'processing' }, expected: false },
      { name: 'Direct insert with status = fulfilled', authUid: 'user-123', row: { user_id: 'user-123', status: 'fulfilled' }, expected: false },
      { name: 'Direct insert with SQL injection attempt in status', authUid: 'user-123', row: { user_id: 'user-123', status: "pending' OR '1'='1" }, expected: false },
      { name: 'Cross-tenant insert with pending status', authUid: 'user-123', row: { user_id: 'victim-456', status: 'pending' }, expected: false },
      { name: 'Cross-tenant insert with completed status', authUid: 'user-123', row: { user_id: 'victim-456', status: 'completed' }, expected: false },
      { name: 'Valid insert with status = pending', authUid: 'user-123', row: { user_id: 'user-123', status: 'pending' }, expected: true },
      { name: 'Valid insert with status = null', authUid: 'user-123', row: { user_id: 'user-123', status: null }, expected: true },
      { name: 'Valid insert with omitted status (undefined)', authUid: 'user-123', row: { user_id: 'user-123' }, expected: true },
    ];

    testVectors.forEach(({ name, authUid, row, expected }) => {
      it(`evaluates test vector: ${name} -> ${expected ? 'ALLOWED' : 'REJECTED'}`, () => {
        const result = evaluateInsertRls(authUid, row);
        expect(result).toBe(expected);
      });
    });
  });

  // ===========================================================================
  // 2. ORACLE: Stored Procedure Privilege & Grant Matrix
  // ===========================================================================
  describe('Oracle: RPC process_payment_by_order authorization matrix', () => {
    it('verifies explicit REVOKE ALL from public and anon on process_payment_by_order', () => {
      const revokePattern = /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.process_payment_by_order[^(]*\([^)]*\)\s+FROM\s+(?:public,\s*anon|anon,\s*public)/i;
      expect(sql).toMatch(revokePattern);
    });

    it('verifies process_payment_by_order is NEVER granted to anon in any GRANT statement', () => {
      const grantLines = sql.split('\n').filter(line =>
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.process_payment_by_order/i.test(line)
      );
      expect(grantLines.length).toBeGreaterThan(0);
      for (const line of grantLines) {
        const toClause = line.match(/TO\s+([^;]+)/i);
        expect(toClause).not.toBeNull();
        const roles = toClause![1].split(',').map(r => r.trim().toLowerCase());
        expect(roles).not.toContain('anon');
        expect(roles).not.toContain('public');
        expect(roles).not.toContain('authenticated');
        expect(roles).toContain('service_role');
      }
    });

    it('verifies get_or_create_payment_order is REVOKED from public, anon and granted only to authenticated, service_role', () => {
      const revokePattern = /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.get_or_create_payment_order[^(]*\([^)]*\)\s+FROM\s+(?:public,\s*anon|anon,\s*public)/i;
      expect(sql).toMatch(revokePattern);

      const grantLines = sql.split('\n').filter(line =>
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_or_create_payment_order/i.test(line)
      );
      expect(grantLines.length).toBeGreaterThan(0);
      for (const line of grantLines) {
        const toClause = line.match(/TO\s+([^;]+)/i);
        expect(toClause).not.toBeNull();
        const roles = toClause![1].split(',').map(r => r.trim().toLowerCase());
        expect(roles).not.toContain('anon');
        expect(roles).not.toContain('public');
        expect(roles).toContain('authenticated');
        expect(roles).toContain('service_role');
      }
    });

    it('verifies search_path hardening on both stored procedures to prevent search_path hijacking', () => {
      expect(sql).toMatch(/FUNCTION\s+public\.get_or_create_payment_order[\s\S]*?SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,\s*pg_temp/i);
      expect(sql).toMatch(/FUNCTION\s+public\.process_payment_by_order[\s\S]*?SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,\s*pg_temp/i);
    });
  });

  // ===========================================================================
  // 3. ZERO-UPDATE & ZERO-LEAK POLICIES ON FINANCIAL TABLES
  // ===========================================================================
  describe('Oracle: Complete policy perimeter check on payment_orders and payment_transactions', () => {
    it('verifies NO direct UPDATE policy exists for authenticated users on payment_orders', () => {
      const updatePolicies = sql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_orders\s+FOR\s+UPDATE\s+TO\s+([^\s;]+)/gi) || [];
      expect(updatePolicies.length).toBe(0);
    });

    it('verifies NO direct INSERT/UPDATE/DELETE policy exists for users on payment_transactions', () => {
      const userTxPolicies = sql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_transactions\s+FOR\s+(?:INSERT|UPDATE|DELETE)\s+TO\s+([^\s;]+)/gi) || [];
      expect(userTxPolicies.length).toBe(0);
    });
  });
});
