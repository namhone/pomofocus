import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

interface CompletionProbe {
  sessionId: string | null;
  deadline: number | null;
  expiredTicks: number;
  completionTransactions: number;
  committedTransactions: number;
  databaseErrors: string[];
  chimes: number;
  notifications: number;
}

const createTask = (id: string) => {
  const now = Date.now();
  return {
    id,
    title: 'Completion integrity test',
    tagIds: [],
    priority: 'p2' as const,
    status: 'todo' as const,
    estimatedPomodoros: 1,
    completedPomodoros: 0,
    repeat: 'none' as const,
    orderIndex: now,
    createdAt: now,
    updatedAt: now
  };
};

async function installCompletionProbe(
  page: Page,
  barrier?: { channelName: string; participantId: string }
): Promise<void> {
  await page.bringToFront();
  await page.evaluate(async (completionBarrier) => {
    const target = window as any;
    const probe: CompletionProbe = {
      sessionId: null,
      deadline: null,
      expiredTicks: 0,
      completionTransactions: 0,
      committedTransactions: 0,
      databaseErrors: [],
      chimes: 0,
      notifications: 0
    };
    target.__completionProbe = probe;

    if (completionBarrier) {
      const channel = new BroadcastChannel(completionBarrier.channelName);
      const participants = new Set([completionBarrier.participantId]);
      let releaseBarrier!: () => void;
      const ready = new Promise<void>((resolve) => {
        releaseBarrier = resolve;
      });
      channel.onmessage = (event) => {
        if (event.data?.type !== 'completion-transaction-started') return;
        participants.add(event.data.participantId);
        if (participants.size === 2) releaseBarrier();
      };
      target.__completionBarrier = {
        enter: async () => {
          channel.postMessage({
            type: 'completion-transaction-started',
            participantId: completionBarrier.participantId
          });
          await ready;
        }
      };
    }

    const { TimerEngine } = await import('/src/services/timerEngine.ts');
    const originalTick = TimerEngine.prototype.tick;
    TimerEngine.prototype.tick = function (this: any) {
      const snapshot = this.getSnapshot();
      if (snapshot.status === 'running' && snapshot.targetEndTimeMs !== null) {
        probe.sessionId = snapshot.sessionId;
        probe.deadline = snapshot.targetEndTimeMs;
        if (Date.now() >= snapshot.targetEndTimeMs) {
          probe.expiredTicks += 1;
        }
      }
      return originalTick.call(this);
    };

    const database = target.db;
    const originalTransaction = database.transaction.bind(database);
    database.transaction = (...args: any[]) => {
      const isCompletionTransaction =
        args[0] === 'rw' &&
        Array.isArray(args[1]) &&
        args[1].some((table: { name: string }) => table.name === 'focus_sessions');
      if (isCompletionTransaction) {
        probe.completionTransactions += 1;
      }

      try {
        const transaction = Promise.resolve().then(async () => {
          if (isCompletionTransaction && target.__completionBarrier) {
            await target.__completionBarrier.enter();
          }
          return originalTransaction(...args);
        });
        return Promise.resolve(transaction).then(
          (result) => {
            if (isCompletionTransaction) {
              probe.committedTransactions += 1;
            }
            return result;
          },
          (error: unknown) => {
            if (isCompletionTransaction) {
              probe.databaseErrors.push(
                error && typeof error === 'object' && 'name' in error
                  ? String(error.name)
                  : 'UnknownError'
              );
            }
            throw error;
          }
        );
      } catch (error) {
        if (isCompletionTransaction) {
          probe.databaseErrors.push(
            error && typeof error === 'object' && 'name' in error
              ? String(error.name)
              : 'UnknownError'
          );
        }
        throw error;
      }
    };

    const { useAudioStore } = await import('/src/stores/useAudioStore.ts');
    useAudioStore.setState({
      playChime: async () => {
        probe.chimes += 1;
      }
    });

    const { NotificationService } = await import('/src/services/notificationService.ts');
    NotificationService.notify = () => {
      probe.notifications += 1;
    };
  }, barrier);
}

async function readProbe(page: Page): Promise<CompletionProbe> {
  await page.bringToFront();
  return page.evaluate(() => (window as any).__completionProbe);
}

async function readProbes(pageA: Page, pageB: Page): Promise<[CompletionProbe, CompletionProbe]> {
  const probeA = await readProbe(pageA);
  const probeB = await readProbe(pageB);
  return [probeA, probeB];
}

async function startSharedTimer(
  pageA: Page,
  pageB: Page,
  taskId: string,
  barrier?: { channelName: string; pageAId: string; pageBId: string }
): Promise<{ sessionId: string; deadline: number }> {
  const isLeader = async (page: Page): Promise<boolean> => {
    await page.bringToFront();
    return page.evaluate(() => (window as any).useTimerStore.getState().isLeader);
  };
  await expect.poll(async () => {
    const pageALeader = await isLeader(pageA);
    const pageBLeader = await isLeader(pageB);
    return Number(pageALeader) + Number(pageBLeader);
  }, { timeout: 15000 }).toBe(1);

  const pageALeader = await isLeader(pageA);
  const leaderPage = pageALeader ? pageA : pageB;
  const followerPage = pageALeader ? pageB : pageA;
  await leaderPage.bringToFront();
  await expect(leaderPage.getByTestId('leader-indicator')).toHaveText(/Leader Tab/);
  await followerPage.bringToFront();
  await expect(followerPage.getByTestId('leader-indicator')).toHaveText(/Follower Tab/);

  const task = createTask(taskId);
  await leaderPage.bringToFront();
  await leaderPage.evaluate((newTask) => (window as any).db.tasks.add(newTask), task);
  await leaderPage.evaluate(
    ({ id, title }) => (window as any).useTimerStore.getState().setLinkedTask(id, title),
    { id: task.id, title: task.title }
  );
  await followerPage.bringToFront();
  await expect.poll(() =>
    followerPage.evaluate(() => (window as any).useTimerStore.getState().linkedTaskId)
  ).toBe(task.id);

  await installCompletionProbe(
    pageA,
    barrier && { channelName: barrier.channelName, participantId: barrier.pageAId }
  );
  await installCompletionProbe(
    pageB,
    barrier && { channelName: barrier.channelName, participantId: barrier.pageBId }
  );

  await leaderPage.bringToFront();
  await leaderPage.getByTestId('timer-start-btn').click();
  await expect(leaderPage.getByTestId('status-indicator')).toHaveText(/running/i);
  await followerPage.bringToFront();
  await expect(followerPage.getByTestId('status-indicator')).toHaveText(/running/i);

  await expect.poll(async () => {
    const [probeA, probeB] = await readProbes(pageA, pageB);
    return Boolean(
      probeA.sessionId &&
        probeB.sessionId &&
        probeA.deadline !== null &&
        probeA.deadline === probeB.deadline &&
        probeA.sessionId === probeB.sessionId
    );
  }).toBe(true);

  const [probeA, probeB] = await readProbes(pageA, pageB);
  expect(probeA.sessionId).toBeTruthy();
  expect(probeA.sessionId).toBe(probeB.sessionId);
  expect(probeA.deadline).toBe(probeB.deadline);

  return { sessionId: probeA.sessionId!, deadline: probeA.deadline! };
}

async function expireTimer(pageA: Page, pageB: Page, deadline: number): Promise<void> {
  for (const page of [pageA, pageB]) {
    await page.bringToFront();
    await page.evaluate((targetEndTime) => {
      Date.now = () => targetEndTime + 1;
    }, deadline);
  }
}

test.describe('Timer completion integrity across tabs', () => {
  test('both timer callbacks race on one deadline and only the database winner performs effects', async ({
    context
  }) => {
    test.setTimeout(90000);
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await pageA.goto('/');
    await pageB.goto('/');

    const taskId = randomUUID();
    const barrier = {
      channelName: `completion-test-${randomUUID()}`,
      pageAId: randomUUID(),
      pageBId: randomUUID()
    };
    const { sessionId, deadline } = await startSharedTimer(pageA, pageB, taskId, barrier);
    await expireTimer(pageA, pageB, deadline);

    await expect.poll(async () => {
      const [probeA, probeB] = await readProbes(pageA, pageB);
      return [probeA.expiredTicks > 0, probeB.expiredTicks > 0];
    }, { timeout: 15000 }).toEqual([true, true]);

    await expect.poll(async () => {
      const [probeA, probeB] = await readProbes(pageA, pageB);
      return probeA.completionTransactions + probeB.completionTransactions;
    }, { timeout: 15000 }).toBe(2);

    await expect.poll(async () => {
      const [probeA, probeB] = await readProbes(pageA, pageB);
      return probeA.chimes + probeB.chimes === 1 &&
        probeA.notifications + probeB.notifications === 1;
    }, { timeout: 15000 }).toBe(true);

    const probes = await readProbes(pageA, pageB);
    expect(probes.map((probe) => probe.sessionId)).toEqual([sessionId, sessionId]);
    expect(probes.map((probe) => probe.deadline)).toEqual([deadline, deadline]);
    expect(probes.reduce((total, probe) => total + probe.committedTransactions, 0)).toBe(1);
    expect(probes.reduce((total, probe) => total + probe.databaseErrors.filter((name) => name === 'ConstraintError').length, 0)).toBe(1);
    expect(probes.reduce((total, probe) => total + probe.chimes, 0)).toBe(1);
    expect(probes.reduce((total, probe) => total + probe.notifications, 0)).toBe(1);

    await pageA.bringToFront();
    const result = await pageA.evaluate(async ({ id, linkedTaskId }) => {
      const sessions = await (window as any).db.focus_sessions.where('id').equals(id).toArray();
      const task = await (window as any).db.tasks.get(linkedTaskId);
      return { sessions, completedPomodoros: task?.completedPomodoros };
    }, { id: sessionId, linkedTaskId: taskId });
    expect(result.sessions).toHaveLength(1);
    expect(result.completedPomodoros).toBe(1);
  });

  test('a non-duplicate IndexedDB error on the real completion callback suppresses all effects', async ({
    page
  }) => {
    test.setTimeout(90000);
    await page.goto('/');
    await expect.poll(() =>
      page.evaluate(() => (window as any).useTimerStore.getState().isLeader)
    ).toBe(true);
    await expect(page.getByTestId('leader-indicator')).toHaveText(/Leader Tab/);
    const taskId = randomUUID();
    const task = createTask(taskId);
    await page.evaluate((newTask) => (window as any).db.tasks.add(newTask), task);
    await page.evaluate(
      ({ id, title }) => (window as any).useTimerStore.getState().setLinkedTask(id, title),
      { id: task.id, title: task.title }
    );
    await installCompletionProbe(page);

    await page.getByTestId('timer-start-btn').click();
    await expect(page.getByTestId('status-indicator')).toHaveText(/running/i);
    await expect.poll(async () => {
      const probe = await readProbe(page);
      return Boolean(probe.sessionId && probe.deadline !== null);
    }).toBe(true);

    const initialProbe = await readProbe(page);
    const sessionId = initialProbe.sessionId!;
    const deadline = initialProbe.deadline!;
    await page.evaluate(() => (window as any).db.close());
    await page.evaluate((targetEndTime) => {
      Date.now = () => targetEndTime + 1;
    }, deadline);
    await expect.poll(async () => {
      const probe = await readProbe(page);
      return probe.completionTransactions;
    }, { timeout: 15000 }).toBe(1);

    const probe = await readProbe(page);
    expect(probe.expiredTicks).toBeGreaterThan(0);
    expect(probe.databaseErrors).toContain('DatabaseClosedError');
    expect(probe.databaseErrors).not.toContain('ConstraintError');
    expect(probe.committedTransactions).toBe(0);
    expect(probe.chimes).toBe(0);
    expect(probe.notifications).toBe(0);

    const result = await page.evaluate(async ({ id, linkedTaskId }) => {
      const database = (window as any).db;
      await database.open();
      const sessions = await database.focus_sessions.where('id').equals(id).toArray();
      const task = await database.tasks.get(linkedTaskId);
      return { sessions, completedPomodoros: task?.completedPomodoros };
    }, { id: sessionId, linkedTaskId: taskId });
    expect(result.sessions).toHaveLength(0);
    expect(result.completedPomodoros).toBe(0);
  });
});
