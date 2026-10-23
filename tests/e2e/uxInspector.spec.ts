import { test, expect } from '@playwright/test';

test('UX Inspector: Đo lường chi tiết cấu trúc DOM, padding, nesting và touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="workspace-root"]');

  // Kiểm tra cấu trúc lồng nhau trong TasksWidget, TimerTestInterface và NotesWidget
  const nestedCardInfo = await page.evaluate(() => {
    const tasksContainer = document.querySelector('[data-testid="widget-container-tasks"]');
    const tasksInnerCard = tasksContainer ? tasksContainer.querySelector('.rounded-3xl') : null;

    const timerContainer = document.querySelector('[data-testid="widget-container-timer"]');
    const timerInnerCard = timerContainer ? timerContainer.querySelector('.rounded-3xl') : null;

    const notesContainer = document.querySelector('[data-testid="widget-container-notes"]');
    const notesInnerCard = notesContainer ? notesContainer.querySelector('.rounded-3xl') : null;

    return {
      tasksHasInnerCard: !!tasksInnerCard,
      timerHasInnerCard: !!timerInnerCard,
      notesHasInnerCard: !!notesInnerCard,
    };
  });

  console.log('Nested Card Structure Inspection:', JSON.stringify(nestedCardInfo, null, 2));

  // Assertion: Khử hoàn toàn thẻ card lồng nhau thừa thãi
  expect(nestedCardInfo.tasksHasInnerCard).toBe(false);
  expect(nestedCardInfo.timerHasInnerCard).toBe(false);
  expect(nestedCardInfo.notesHasInnerCard).toBe(false);

  // Kiểm tra touch target sizes trên mobile (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);

  const mobileTargets = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const results = buttons.map(btn => {
      const rect = btn.getBoundingClientRect();
      const text = btn.innerText.trim().slice(0, 20);
      return {
        text,
        testId: btn.getAttribute('data-testid'),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        isSmall: rect.width < 28 || rect.height < 28,
      };
    });
    return results.filter(r => r.width > 0 && r.height > 0);
  });

  const verySmallTargets = mobileTargets.filter(t => t.isSmall);
  console.log(`Mobile Very Small Touch Targets (<28px) count: ${verySmallTargets.length}`, verySmallTargets);

  // Assertion: Không có nút bấm thao tác chính nào có kích thước dưới 28px
  expect(verySmallTargets.length).toBe(0);
});

