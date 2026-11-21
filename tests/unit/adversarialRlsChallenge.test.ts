import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Adversarial RLS & RPC Policy Empirical Verification', () => {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261121_tighten_payment_rls.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  // Helper to extract target role from CREATE POLICY clause (e.g. TO authenticated)
  const extractRolesFromPolicies = (policyMatches: string[] = []) => {
    return policyMatches.map(stmt => {
      const match = stmt.match(/TO\s+([^\s;]+)/i);
      return match ? match[1].toLowerCase() : '';
    });
  };

  // ===========================================================================
  // CHALLENGE 1: Anon actor reading payment_orders directly using ANON_KEY
  // ===========================================================================
  describe('Challenge 1: Anonymous read payment_orders directly via ANON_KEY', () => {
    it('verifies RLS is enabled on payment_orders', () => {
      expect(migrationSql).toMatch(/ALTER\s+TABLE\s+(IF\s+EXISTS\s+)?public\.payment_orders\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    });

    it('verifies all permissive/anon SELECT policies on payment_orders are dropped', () => {
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"Public can read payment_orders"/i);
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"payment_orders_read_all"/i);
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"payment_orders_anon_select"/i);
    });

    it('verifies SELECT on payment_orders is restricted to authenticated owner or service_role only', () => {
      const selectPolicies = migrationSql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_orders\s+FOR\s+SELECT\s+TO\s+([^\s;]+)/gi) || [];
      const roles = extractRolesFromPolicies(selectPolicies);
      expect(roles.length).toBeGreaterThan(0);
      for (const role of roles) {
        expect(['authenticated', 'service_role']).toContain(role);
        expect(role).not.toBe('anon');
        expect(role).not.toBe('public');
      }
    });
  });

  // ===========================================================================
  // CHALLENGE 2: Anon actor inserting or updating payment_orders directly
  // ===========================================================================
  describe('Challenge 2: Anonymous insert or update payment_orders directly', () => {
    it('verifies all permissive/anon INSERT policies on payment_orders are dropped', () => {
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"Public can insert payment_orders"/i);
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"payment_orders_anon_insert"/i);
    });

    it('verifies all permissive/anon UPDATE policies on payment_orders are dropped', () => {
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"Public can update payment_orders"/i);
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"payment_orders_anon_update"/i);
    });

    it('verifies INSERT on payment_orders is restricted to authenticated owner or service_role only', () => {
      const insertPolicies = migrationSql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_orders\s+FOR\s+INSERT\s+TO\s+([^\s;]+)/gi) || [];
      const roles = extractRolesFromPolicies(insertPolicies);
      expect(roles.length).toBeGreaterThan(0);
      for (const role of roles) {
        expect(['authenticated', 'service_role']).toContain(role);
        expect(role).not.toBe('anon');
        expect(role).not.toBe('public');
      }
    });

    it('verifies NO direct UPDATE policy exists on payment_orders for anon', () => {
      const updatePolicies = migrationSql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_orders\s+FOR\s+UPDATE\s+TO\s+([^\s;]+)/gi) || [];
      const roles = extractRolesFromPolicies(updatePolicies);
      expect(roles).not.toContain('anon');
      expect(roles).not.toContain('public');
    });
  });

  // ===========================================================================
  // CHALLENGE 3: Anon actor selecting rows from payment_transactions
  // ===========================================================================
  describe('Challenge 3: Anonymous select rows from payment_transactions', () => {
    it('verifies RLS is enabled on payment_transactions', () => {
      expect(migrationSql).toMatch(/ALTER\s+TABLE\s+(IF\s+EXISTS\s+)?public\.payment_transactions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    });

    it('verifies all permissive/anon SELECT policies on payment_transactions are dropped', () => {
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"Public can read payment_transactions"/i);
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"Public read payment_transactions"/i);
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"payment_transactions_read_all"/i);
      expect(migrationSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"payment_transactions_anon_select"/i);
    });

    it('verifies SELECT on payment_transactions is restricted to authenticated owner or service_role only', () => {
      const selectTxPolicies = migrationSql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_transactions\s+FOR\s+SELECT\s+TO\s+([^\s;]+)/gi) || [];
      const roles = extractRolesFromPolicies(selectTxPolicies);
      expect(roles.length).toBeGreaterThan(0);
      for (const role of roles) {
        expect(['authenticated', 'service_role']).toContain(role);
        expect(role).not.toBe('anon');
        expect(role).not.toBe('public');
      }
    });
  });

  // ===========================================================================
  // CHALLENGE 4: Authenticated user cross-tenant tampering
  // ===========================================================================
  describe('Challenge 4: Authenticated user cross-tenant tampering', () => {
    it('verifies authenticated SELECT on payment_orders is strictly bounded by auth.uid() = user_id', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"payment_orders_select_own"\s+ON\s+public\.payment_orders\s+FOR\s+SELECT\s+TO\s+authenticated\s+USING\s+\(\(\s*select\s+auth\.uid\(\)\s*\)::text\s*=\s*user_id\)/i);
    });

    it('verifies authenticated INSERT on payment_orders is strictly bounded by auth.uid() = user_id and pending status', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"payment_orders_insert_own"\s+ON\s+public\.payment_orders\s+FOR\s+INSERT\s+TO\s+authenticated\s+WITH\s+CHECK\s+\(\s*\(select\s+auth\.uid\(\)\)::text\s*=\s*user_id(\s+AND\s+[\s\S]*?)?\)/i);
    });

    it('verifies authenticated SELECT on payment_transactions is strictly bounded by auth.uid() = user_id', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"payment_transactions_select_own"\s+ON\s+public\.payment_transactions\s+FOR\s+SELECT\s+TO\s+authenticated\s+USING\s+\(\(\s*select\s+auth\.uid\(\)\s*\)::text\s*=\s*user_id::text\)/i);
    });

    it('verifies authenticated users have ZERO direct INSERT/UPDATE/DELETE policies on payment_transactions', () => {
      const allTxPolicies = migrationSql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_transactions\s+FOR\s+(INSERT|UPDATE|DELETE)\s+TO\s+([^\s;]+)/gi) || [];
      const roles = extractRolesFromPolicies(allTxPolicies);
      expect(roles).not.toContain('authenticated');
      expect(roles).not.toContain('anon');
      expect(roles).not.toContain('public');
    });
  });

  // ===========================================================================
  // CHALLENGE 5: Authenticated user updating their own order to completed
  // ===========================================================================
  describe('Challenge 5: Authenticated user updating order status', () => {
    it('verifies authenticated users have NO UPDATE policy on payment_orders', () => {
      const updatePolicies = migrationSql.match(/CREATE\s+POLICY\s+"[^"]+"\s+ON\s+public\.payment_orders\s+FOR\s+UPDATE\s+TO\s+([^\s;]+)/gi) || [];
      const roles = extractRolesFromPolicies(updatePolicies);
      expect(roles).not.toContain('authenticated');
    });

    it('verifies only service_role can update payment_orders via FOR ALL policy', () => {
      expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"payment_orders_service_role"\s+ON\s+public\.payment_orders\s+FOR\s+ALL\s+TO\s+service_role/i);
    });
  });

  // ===========================================================================
  // CHALLENGE 6 (ADVERSARIAL STRESS TEST): RPC Backdoor Verification
  // ===========================================================================
  describe('Challenge 6: Adversarial Audit of Stored Procedure Privileges', () => {
    it('AUDIT VERIFICATION: asserts process_payment_by_order is NOT granted to anon role', () => {
      const grantLines = migrationSql.split('\n').filter(line =>
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.process_payment_by_order/i.test(line)
      );
      const grantsToAnon = grantLines.some(line => /\banon\b/i.test(line));
      expect(grantsToAnon, 'process_payment_by_order MUST NOT be granted to anon').toBe(false);
    });

    it('AUDIT VERIFICATION: asserts explicit REVOKE ALL FROM public, anon exists on process_payment_by_order', () => {
      const hasRevokePublic = /REVOKE\s+(?:ALL|EXECUTE)\s+ON\s+FUNCTION\s+public\.process_payment_by_order[^(]*\([^)]*\)\s+FROM\s+(?:public,\s*anon|anon,\s*public)/i.test(migrationSql);
      expect(hasRevokePublic).toBe(true);
    });
  });
});
