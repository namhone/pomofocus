import { test, expect } from '@playwright/test';
import * as path from 'path';

test('Chụp màn hình Logo PomoFocus mới trên Header và Landing', async ({ page }) => {
  const artifactDir = 'C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2';

  // 1. Chụp Landing Page với Logo PomoFocus
  await page.goto('/landing');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(artifactDir, 'pomofocus-landing-brand.png'), fullPage: false });

  // 2. Chụp Workspace Header với Logo PomoFocus
  await page.goto('/app');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(artifactDir, 'pomofocus-workspace-header.png'), fullPage: false });

  // 3. Chụp Auth View với Logo PomoFocus
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(artifactDir, 'pomofocus-auth-screen.png'), fullPage: false });
});
