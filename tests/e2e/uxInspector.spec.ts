import { test } from '@playwright/test';

test('UX Inspector: Đo lường chi tiết cấu trúc DOM, padding, nesting và touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="workspace-root"]');

  // Kiểm tra cấu trúc lồng nhau trong TasksWidget và NotesWidget
  const nestedCardInfo = await page.evaluate(() => {
    const tasksContainer = document.querySelector('[data-testid="widget-container-tasks"]');
    const tasksInnerCard = tasksContainer ? tasksContainer.querySelector('.rounded-3xl') : null;

    const timerContainer = document.querySelector('[data-testid="widget-container-timer"]');
    const timerInnerCard = timerContainer ? timerContainer.querySelector('.rounded-3xl') : null;

    const notesContainer = document.querySelector('[data-testid="widget-container-notes"]');
    const notesInnerCard = notesContainer ? notesContainer.querySelector('.rounded-3xl') : null;

    const audioContainer = document.querySelector('[data-testid="widget-container-sounds"]');

    return {
      tasksHasInnerCard: !!tasksInnerCard,
      timerHasInnerCard: !!timerInnerCard,
      notesHasInnerCard: !!notesInnerCard,
      tasksInnerClasses: tasksInnerCard?.className,
      timerInnerClasses: timerInnerCard?.className,
      notesInnerClasses: notesInnerCard?.className,
    };
  });

  console.log('Nested Card Structure Inspection:', JSON.stringify(nestedCardInfo, null, 2));

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
        isSmall: rect.width < 32 || rect.height < 32,
      };
    });
    return results.filter(r => r.width > 0 && r.height > 0);
  });

  const smallTargets = mobileTargets.filter(t => t.isSmall);
  console.log(`Mobile Small Touch Targets (<32px) count: ${smallTargets.length}`, smallTargets);
});
