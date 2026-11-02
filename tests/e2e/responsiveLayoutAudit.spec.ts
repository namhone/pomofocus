import { test, expect } from '@playwright/test';
import * as path from 'path';

const ARTIFACT_DIR = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

test.describe('Responsive Layout & Visual Harmony Audit', () => {
  test('1. Desktop 1920x1080 - Workspace với Background thông thoáng', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-desktop-1920-app.png'),
      fullPage: false
    });
  });

  test('2. Laptop 1366x768 - Workspace & Calendar & Rooms', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    // Workspace
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-laptop-1366-app.png'),
      fullPage: false
    });

    // Calendar
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-laptop-1366-calendar.png'),
      fullPage: false
    });

    // Rooms Lobby
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-laptop-1366-rooms.png'),
      fullPage: false
    });
  });

  test('3. Tablet 768x1024 - Workspace & Calendar Day View', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    // Workspace
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-tablet-768-app.png'),
      fullPage: false
    });

    // Calendar
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-tablet-768-calendar.png'),
      fullPage: false
    });
  });

  test('4. Mobile 390x844 - Workspace & Subnav Scrolling & Calendar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Workspace Single View Mode
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-mobile-390-app.png'),
      fullPage: false
    });

    // Billing Subnav
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-mobile-390-billing.png'),
      fullPage: false
    });

    // Security Subnav & ID Truncation
    await page.goto('/account/security');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof-mobile-390-security.png'),
      fullPage: false
    });
  });
});
