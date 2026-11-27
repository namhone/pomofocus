import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { sanitizeHtml, sanitizeSvg } from '../../src/utils/sanitize';
import { isAdmin, hasVipAccess, hasProEntitlement, isOwnerEmail, UserProfile } from '../../src/services/authService';
import { computeDerivedPlanState } from '../../src/stores/useAuthStore';
import { verifyAdminOrOwnerToken } from '../../api/ai/companion';

describe('Milestone 2 Security, PII & XSS Sanitization Test Suite', () => {
  // =========================================================================
  // 1. DOMPurify XSS Sanitization Tests (BUG-73)
  // =========================================================================
  describe('1. DOMPurify HTML & SVG Sanitization', () => {
    it('preserves the QR accessible name while stripping SVG event handlers', () => {
      const clean = sanitizeSvg('<svg role="img" aria-label="Mã QR" onload="alert(1)"><script>alert(2)</script><path d="M0 0" /></svg>');
      expect(clean).toContain('role="img"');
      expect(clean).toContain('aria-label="Mã QR"');
      expect(clean).not.toContain('onload');
      expect(clean).not.toContain('<script');
    });
    it('strips <script>alert(1)</script> tags completely', () => {
      const payload = '<div>Hello <script>alert("xss")</script>world</div>';
      const clean = sanitizeHtml(payload);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert("xss")');
      expect(clean).toContain('Hello');
      expect(clean).toContain('world');
    });

    it('strips inline event handlers like onerror, onload, onclick', () => {
      const payload = '<img src="invalid-image" onerror="alert(1)" /><div onclick="alert(2)">Click me</div>';
      const clean = sanitizeHtml(payload);
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('onclick');
      expect(clean).not.toContain('alert(1)');
      expect(clean).not.toContain('alert(2)');
    });

    it('strips javascript: pseudo-protocol URIs in anchors', () => {
      const payload = '<a href="javascript:alert(1)">Malicious Link</a>';
      const clean = sanitizeHtml(payload);
      expect(clean).not.toContain('javascript:');
      expect(clean).not.toContain('alert(1)');
      expect(clean).toContain('Malicious Link');
    });

    it('preserves legitimate rich text elements and styling', () => {
      const richText = '<h1>Chapter 1</h1><p><b>Bold statement</b> and <i>italic note</i></p><ul class="list"><li>Item 1</li></ul>';
      const clean = sanitizeHtml(richText);
      expect(clean).toContain('<h1>Chapter 1</h1>');
      expect(clean).toContain('<b>Bold statement</b>');
      expect(clean).toContain('<i>italic note</i>');
      expect(clean).toContain('<li>Item 1</li>');
    });

    it('handles empty, null, undefined and invalid inputs safely', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
    });

    it('sanitizes SVG vectors without breaking legitimate shapes', () => {
      const validSvg = '<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="black" /></svg>';
      const cleanSvg = sanitizeSvg(validSvg);
      expect(cleanSvg).toContain('<svg');
      expect(cleanSvg).toContain('<rect');

      const maliciousSvg = '<svg><script>alert("svg-xss")</script><circle cx="50" cy="50" r="40" /></svg>';
      const cleanMaliciousSvg = sanitizeSvg(maliciousSvg);
      expect(cleanMaliciousSvg).not.toContain('<script>');
      expect(cleanMaliciousSvg).not.toContain('alert("svg-xss")');
      expect(cleanMaliciousSvg).toContain('<circle');
    });
  });

  // =========================================================================
  // 2. PII Phone Number Complete Absence (BUG-04 & BUG-71)
  // =========================================================================
  describe('2. PII Phone Number Eradication', () => {
    const rootDir = path.resolve(__dirname, '../../');
    const checkedFiles = [
      'index.html',
      'src/components/LegalViews.tsx',
      'src/components/SharedFooter.tsx',
      'src/components/ContactView.tsx',
      'src/services/momoService.ts',
      'middleware.ts'
    ];

    it.each(checkedFiles)('ensures %s contains zero occurrences of 0704862629 or 0704 862 629', (relPath) => {
      const filePath = path.join(rootDir, relPath);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).not.toContain('0704862629');
      expect(content).not.toContain('0704 862 629');
      expect(content).not.toContain('+84-704-862-629');
    });

    it('ensures institutional support email support@pomofocus.vn is present in contact surfaces', () => {
      const contactView = fs.readFileSync(path.join(rootDir, 'src/components/ContactView.tsx'), 'utf-8');
      const sharedFooter = fs.readFileSync(path.join(rootDir, 'src/components/SharedFooter.tsx'), 'utf-8');
      const legalViews = fs.readFileSync(path.join(rootDir, 'src/components/LegalViews.tsx'), 'utf-8');
      const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

      expect(contactView).toContain('support@pomofocus.vn');
      expect(sharedFooter).toContain('support@pomofocus.vn');
      expect(legalViews).toContain('support@pomofocus.vn');
      expect(indexHtml).toContain('support@pomofocus.vn');
    });
  });

  // =========================================================================
  // 3. Admin Authorization & JWT Claims Migration (BUG-72)
  // =========================================================================
  describe('3. Admin Role & JWT Claims Verification', () => {
    it('denies admin privileges to unauthenticated users or users with regular untrusted emails', () => {
      const spoofedUser: UserProfile = {
        id: 'usr_spoofed_123',
        email: 'attacker@evil-domain.com',
        displayName: 'Attacker',
        plan: 'free',
        role: 'user',
        createdAt: Date.now()
      };

      expect(isAdmin(spoofedUser)).toBe(false);
      expect(isOwnerEmail(spoofedUser.email)).toBe(false);
      expect(hasVipAccess(spoofedUser)).toBe(false);

      const derivedState = computeDerivedPlanState(spoofedUser);
      expect(derivedState.isAdmin).toBe(false);
      expect(derivedState.isOwner).toBe(false);
      expect(derivedState.isPro).toBe(false);
    });

    it('denies isAdmin privileges even when user matches owner email if they lack verified JWT app_metadata admin claim', () => {
      const unverifiedUser: UserProfile = {
        id: 'usr_unverified_owner',
        email: 'namho03052k9@gmail.com',
        displayName: 'Unverified Owner Email',
        plan: 'free',
        role: 'user', // role in profile is user, not admin/founder
        createdAt: Date.now()
      };

      // Pure email string does NOT grant admin privileges (must have app_metadata.role === 'admin' or role === 'founder')
      expect(isAdmin(unverifiedUser)).toBe(false);
    });

    it('grants admin privileges to users with verified JWT app_metadata claim', () => {
      const adminUser: UserProfile = {
        id: 'usr_admin_real',
        email: 'verified.admin@domain.com',
        displayName: 'Verified Admin',
        plan: 'free',
        role: 'user',
        createdAt: Date.now(),
        app_metadata: { role: 'admin' }
      };

      expect(isAdmin(adminUser)).toBe(true);
      expect(hasVipAccess(adminUser)).toBe(true);

      const derivedState = computeDerivedPlanState(adminUser);
      expect(derivedState.isAdmin).toBe(true);
      expect(derivedState.isOwner).toBe(true);
      expect(derivedState.hasVipAccess).toBe(true);
    });

    it('grants admin privileges to users with verified role: founder in profile', () => {
      const founderUser: UserProfile = {
        id: 'usr_founder_real',
        email: 'founder@domain.com',
        displayName: 'Founder',
        plan: 'lifetime',
        role: 'founder',
        app_metadata: { role: 'founder' },
        createdAt: Date.now()
      };

      expect(isAdmin(founderUser)).toBe(true);
      expect(hasVipAccess(founderUser)).toBe(true);

      const derivedState = computeDerivedPlanState(founderUser);
      expect(derivedState.isAdmin).toBe(true);
      expect(derivedState.isOwner).toBe(true);
      expect(derivedState.isPro).toBe(true);
    });

    it('ensures hasProEntitlement enforces plan rules for untrusted users and validates pro tiers', () => {
      expect(hasProEntitlement('free', 'attacker@example.com')).toBe(false);
      expect(hasProEntitlement('free', null)).toBe(false);
      expect(hasProEntitlement(null, 'attacker@example.com')).toBe(false);
      expect(hasProEntitlement('pro', 'regular.user@domain.com')).toBe(true);
      expect(hasProEntitlement('lifetime', 'regular.user@domain.com')).toBe(true);
      expect(hasProEntitlement('pro_beta', 'regular.user@domain.com')).toBe(true);
    });
  });

  // =========================================================================
  // 4. Serverless API Authentication & Unauthenticated Exploit Elimination
  // =========================================================================
  describe('4. Serverless Companion API Token Gate', () => {
    it('rejects unauthenticated requests without Authorization header', async () => {
      const result = await verifyAdminOrOwnerToken(undefined);
      expect(result.isAdmin).toBe(false);
    });

    it('rejects requests with malformed Authorization header', async () => {
      expect((await verifyAdminOrOwnerToken('')).isAdmin).toBe(false);
      expect((await verifyAdminOrOwnerToken('Basic 123456')).isAdmin).toBe(false);
      expect((await verifyAdminOrOwnerToken('Bearer ')).isAdmin).toBe(false);
      expect((await verifyAdminOrOwnerToken('Bearer   ')).isAdmin).toBe(false);
    });
  });
});
