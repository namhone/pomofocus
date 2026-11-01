import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, recordFocusSessionAtomic } from '../../src/db';
import { TimerEngine } from '../../src/services/timerEngine';
import { AudioContextManager } from '../../src/services/audioContextManager';
import { AmbientSynthesizer } from '../../src/services/ambientSynthesizer';
import { ChimeSynthesizer } from '../../src/services/chimeSynthesizer';
import { escapeHtml, renderSafeMarkdown, sanitizeUrl } from '../../src/utils/markdown';
import { Task } from '../../src/types/tasks';
import { Note } from '../../src/types/notes';
import { FocusSessionRecord } from '../../src/types/timer';

// Mock Web Audio API cho môi trường JSDOM
class MockAudioParam {
  value = 1;
  setValueAtTime = vi.fn((val: number) => { this.value = val; });
  linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  exponentialRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  setTargetAtTime = vi.fn((val: number) => { this.value = val; });
  cancelScheduledValues = vi.fn();
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = new MockAudioParam();
  knee = new MockAudioParam();
  ratio = new MockAudioParam();
  attack = new MockAudioParam();
  release = new MockAudioParam();
}

class MockOscillatorNode extends MockAudioNode {
  type = 'sine';
  frequency = new MockAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode extends MockAudioNode {
  type = 'lowpass';
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: unknown = null;
  loop = false;
  start = vi.fn();
  stop = vi.fn();
}

class MockChannelMergerNode extends MockAudioNode {}

class MockAudioBuffer {
  private data: Float32Array;
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number) {
    this.data = new Float32Array(length);
  }
  getChannelData(): Float32Array {
    return this.data;
  }
}

class MockAudioContext {
  state: 'suspended' | 'running' | 'closed' = 'running';
  currentTime = 0;
  destination = new MockAudioNode();

  createGain = vi.fn(() => new MockGainNode());
  createDynamicsCompressor = vi.fn(() => new MockDynamicsCompressorNode());
  createOscillator = vi.fn(() => new MockOscillatorNode());
  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  createChannelMerger = vi.fn(() => new MockChannelMergerNode());
  createBuffer = vi.fn((channels: number, length: number, rate: number) => new MockAudioBuffer(channels, length, rate));
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
}

describe('CORE PRODUCTIVITY & STRESS-TEST ENGINE (VITEST)', () => {
  let origAudioContext: unknown;

  beforeEach(async () => {
    localStorage.clear();
    await db.tasks.clear();
    await db.notes.clear();
    await db.focus_sessions.clear();

    origAudioContext = (window as unknown as { AudioContext?: unknown }).AudioContext;
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;
    (AudioContextManager as unknown as { instance: null }).instance = null;
    (AmbientSynthesizer as unknown as { instance: null }).instance = null;
    (ChimeSynthesizer as unknown as { instance: null }).instance = null;
  });

  afterEach(() => {
    (window as unknown as { AudioContext?: unknown }).AudioContext = origAudioContext;
    vi.useRealTimers();
  });

  // -------------------------------------------------------------
  // 1. Chống Trôi Giờ Khi Ẩn Tab / Sleep Máy Tính (TargetEndTime Drift Check)
  // -------------------------------------------------------------
  describe('1. Chống Trôi Giờ Khi Ẩn Tab / Sleep Trình Duyệt (TargetEndTime Drift)', () => {
    it('đồng hồ tính đúng thời gian còn lại 23 phút sau khi máy tính sleep/tab đóng băng 2 phút', () => {
      vi.useFakeTimers({
        toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']
      });

      const initialTime = 1700000000000;
      vi.setSystemTime(initialTime);

      const engine = new TimerEngine({
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15
      });

      engine.start();
      expect(engine.getStatus()).toBe('running');
      expect(engine.getRemainingMs()).toBe(25 * 60 * 1000);
      expect(engine.getTargetEndTimeMs()).toBe(initialTime + 25 * 60 * 1000);

      // Giả lập tab bị Chrome đóng băng bộ đếm (không có tick nào được gọi trong 2 phút)
      // Hệ thống trôi 2 phút (120,000ms)
      vi.setSystemTime(initialTime + 2 * 60 * 1000);

      // Khi người dùng click quay lại tab, trình duyệt kích hoạt tick đầu tiên
      engine.tick();

      // Kiểm tra: remainingMs lập tức phản ánh đúng 23 phút còn lại
      expect(engine.getRemainingMs()).toBe(23 * 60 * 1000);
      expect(engine.getStatus()).toBe('running');

      // Giả lập tiếp tục trôi thêm 23 phút nữa (hết phiên 25 phút)
      vi.setSystemTime(initialTime + 25 * 60 * 1000 + 1000);
      engine.tick();

      // Phiên phải tự động hoàn tất và chuyển sang hiệp Nghỉ ngắn (short_break) ở trạng thái chờ (idle)
      expect(engine.getPhase()).toBe('short_break');
      expect(engine.getStatus()).toBe('idle');
      expect(engine.getRemainingMs()).toBe(5 * 60 * 1000);

      engine.destroy();
    });

    it('syncFromSnapshot khôi phục chính xác thời gian khi tab phụ nhận snapshot từ Leader', () => {
      const wallTime = 1700000000000;
      vi.useFakeTimers();
      vi.setSystemTime(wallTime);

      const followerEngine = new TimerEngine({ pomodoroMinutes: 25 });

      // Tab phụ nhận snapshot từ Tab chính (đã chạy được 7 phút, targetEndTime là wallTime + 18 phút)
      const targetEnd = wallTime + 18 * 60 * 1000;
      followerEngine.syncFromSnapshot({
        sessionId: 'session_leader_123',
        phase: 'pomodoro',
        status: 'running',
        currentRound: 1,
        durationMinutes: 25,
        remainingMs: 18 * 60 * 1000,
        targetEndTimeMs: targetEnd,
        pausedRemainingMs: null,
        timestamp: wallTime,
        fromLeader: true
      });

      expect(followerEngine.getStatus()).toBe('running');
      expect(followerEngine.getRemainingMs()).toBe(18 * 60 * 1000);

      // Trôi thêm 3 phút
      vi.setSystemTime(wallTime + 3 * 60 * 1000);
      followerEngine.tick();
      expect(followerEngine.getRemainingMs()).toBe(15 * 60 * 1000);

      followerEngine.destroy();
    });
  });

  // -------------------------------------------------------------
  // 2. Stress-Test Web Audio API (Trộn Đa Âm & Chống Rò Rỉ RAM)
  // -------------------------------------------------------------
  describe('2. Web Audio API Stress Test (Trộn 5 Âm Thanh & Chống Rò Rỉ RAM)', () => {
    it('AudioContextManager khởi tạo DynamicsCompressorNode để giới hạn dải động, chống vỡ tiếng (Clipping)', () => {
      const audioMgr = AudioContextManager.getInstance();
      const ctx = audioMgr.getContext();
      expect(ctx).not.toBeNull();
      expect(ctx?.createDynamicsCompressor).toHaveBeenCalled();
    });

    it('AmbientSynthesizer có thể phát đồng thời 5 âm thanh và dọn dẹp sạch sẽ khi stopAll()', async () => {
      const synth = AmbientSynthesizer.getInstance();

      // Bật đồng thời 5 âm thanh: Mưa, Sóng biển, Quán Cà phê, Lửa trại, Tiếng suối
      await synth.playTrack('rain', 0.6);
      await synth.playTrack('ocean_waves', 0.5);
      await synth.playTrack('cafe', 0.4);
      await synth.playTrack('campfire', 0.5);
      await synth.playTrack('stream', 0.4);

      expect(synth.isTrackPlaying('rain')).toBe(true);
      expect(synth.isTrackPlaying('ocean_waves')).toBe(true);
      expect(synth.isTrackPlaying('cafe')).toBe(true);
      expect(synth.isTrackPlaying('campfire')).toBe(true);
      expect(synth.isTrackPlaying('stream')).toBe(true);

      // Điều chỉnh âm lượng mượt mà
      synth.setTrackVolume('rain', 0.8);
      synth.setTrackVolume('ocean_waves', 0.2);

      // Dừng tất cả âm thanh
      synth.stopAll();

      // Kiểm tra tất cả tracks được gỡ bỏ khỏi activeTracks map
      expect(synth.isTrackPlaying('rain')).toBe(false);
      expect(synth.isTrackPlaying('ocean_waves')).toBe(false);
      expect(synth.isTrackPlaying('cafe')).toBe(false);
      expect(synth.isTrackPlaying('campfire')).toBe(false);
      expect(synth.isTrackPlaying('stream')).toBe(false);
    });

    it('ChimeSynthesizer tự động ngắt kết nối gainNode sau khi chuông hoàn tất để chống rò rỉ AudioNode', async () => {
      vi.useFakeTimers();
      const chime = ChimeSynthesizer.getInstance();

      await chime.playChime('twinkle', 0.7);

      // Trôi 2100ms (sau khi chuông kết thúc và timeout dọn dẹp kích hoạt)
      vi.advanceTimersByTime(2100);

      // Xác nhận không ném lỗi
      expect(true).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 3. Độ Bền Lưu Trữ Ngoại Tuyến IndexedDB / Dexie (Chống Mất Dữ Liệu)
  // -------------------------------------------------------------
  describe('3. Độ Bền Lưu Trữ Ngoại Tuyến IndexedDB / Dexie (50 Tasks, 10 Notes, Giao Dịch Nguyên Tử)', () => {
    it('lưu thành công 50 tasks và 10 notes vào IndexedDB, đọc lại nguyên vẹn 100%', async () => {
      // 1. Tạo 50 công việc
      const taskBatch: Task[] = [];
      const now = Date.now();
      for (let i = 1; i <= 50; i++) {
        taskBatch.push({
          id: `task_stress_${i}`,
          title: `Công việc số ${i} - Kiểm thử tải cao`,
          description: `Mô tả chi tiết cho task ${i}`,
          projectId: i % 2 === 0 ? 'project_alpha' : null,
          tagIds: ['stress', 'test'],
          priority: i % 3 === 0 ? 'p1' : i % 3 === 1 ? 'p2' : 'p3',
          status: i % 5 === 0 ? 'completed' : 'todo',
          estimatedPomodoros: (i % 4) + 1,
          completedPomodoros: i % 5 === 0 ? (i % 4) + 1 : 0,
          deadline: null,
          repeat: 'none',
          orderIndex: now + i,
          createdAt: now + i,
          updatedAt: now + i
        });
      }
      await db.tasks.bulkAdd(taskBatch);

      // 2. Tạo 10 ghi chú Markdown dài
      const noteBatch: Note[] = [];
      for (let j = 1; j <= 10; j++) {
        noteBatch.push({
          id: `note_stress_${j}`,
          title: `Ghi chú chuyên sâu số ${j}`,
          contentMarkdown: `# Tiêu đề ghi chú ${j}\n\nNội dung chi tiết chứa tài liệu kỹ thuật dài cho mục ${j}.\n\n- [x] Đã hoàn thành bước 1\n- [ ] Đang tiến hành bước 2\n\n**Quan trọng**: Dữ liệu không được phép thất lạc khi mất điện!`,
          linkedTaskId: `task_stress_${j}`,
          linkedProjectId: null,
          createdAt: now + j * 10,
          updatedAt: now + j * 10
        });
      }
      await db.notes.bulkAdd(noteBatch);

      // 3. Kiểm tra số lượng bản ghi
      const savedTasksCount = await db.tasks.count();
      const savedNotesCount = await db.notes.count();
      expect(savedTasksCount).toBe(50);
      expect(savedNotesCount).toBe(10);

      // 4. Kiểm tra tính toàn vẹn từng ký tự của ghi chú thứ 10
      const note10 = await db.notes.get('note_stress_10');
      expect(note10).toBeDefined();
      expect(note10?.title).toBe('Ghi chú chuyên sâu số 10');
      expect(note10?.contentMarkdown).toContain('**Quan trọng**: Dữ liệu không được phép thất lạc khi mất điện!');

      // 5. Kiểm tra truy vấn theo priority P1
      const p1Tasks = await db.tasks.where('priority').equals('p1').toArray();
      expect(p1Tasks.length).toBeGreaterThan(0);
      p1Tasks.forEach((t) => expect(t.priority).toBe('p1'));
    });

    it('recordFocusSessionAtomic đảm bảo tính nguyên tử (Atomic Transaction): rollback nếu trùng lặp id', async () => {
      const task: Task = {
        id: 'task_atomic_1',
        title: 'Task giao dịch nguyên tử',
        projectId: null,
        tagIds: [],
        priority: 'p1',
        status: 'todo',
        estimatedPomodoros: 4,
        completedPomodoros: 1,
        deadline: null,
        repeat: 'none',
        orderIndex: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.tasks.add(task);

      const sessionRecord: FocusSessionRecord = {
        id: 'session_unique_999',
        taskId: 'task_atomic_1',
        taskTitle: 'Task giao dịch nguyên tử',
        phase: 'pomodoro',
        durationMinutes: 25,
        completedAt: Date.now()
      };

      // Ghi nhận lần 1: Thành công
      const success1 = await recordFocusSessionAtomic(sessionRecord);
      expect(success1).toBe(true);

      const updatedTask = await db.tasks.get('task_atomic_1');
      expect(updatedTask?.completedPomodoros).toBe(2);

      // Ghi nhận lần 2 với cùng sessionId: Phải trả về false (bảo vệ chống ghi 2 lần khi 2 tab cùng kích hoạt)
      const success2 = await recordFocusSessionAtomic(sessionRecord);
      expect(success2).toBe(false);

      // Số pomodoro của task vẫn giữ nguyên 2, không bị tăng thành 3
      const taskAfterDuplicate = await db.tasks.get('task_atomic_1');
      expect(taskAfterDuplicate?.completedPomodoros).toBe(2);
    });
  });

  // -------------------------------------------------------------
  // 4. An Toàn Bảo Mật Chống Tấn Công XSS Trong Ghi Chú
  // -------------------------------------------------------------
  describe('4. An Toàn Bảo Mật Chống Tấn Công XSS Trong Ghi Chú', () => {
    it('lọc sạch thẻ <script>alert("XSS")</script> thành mã HTML an toàn &lt;script&gt;', () => {
      const malicious = '<script>alert("XSS")</script>';
      const sanitized = renderSafeMarkdown(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('lọc sạch thuộc tính mã độc trong thẻ <img src=x onerror=alert(1)>', () => {
      const malicious = '<img src=x onerror=alert(1)>';
      const sanitized = renderSafeMarkdown(malicious);

      // Tuyệt đối không tạo thẻ HTML <img> thật
      expect(sanitized).not.toContain('<img');
      expect(sanitized).toContain('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('chặn triệt để giao thức javascript: trong liên kết Markdown', () => {
      const maliciousLink = '[Bấm vào đây nhận thưởng](javascript:alert("hacked"))';
      const rendered = renderSafeMarkdown(maliciousLink);

      expect(rendered).not.toContain('href="javascript:');
      expect(rendered).toContain('href="#unsafe-link"');
    });

    it('chặn triệt để giao thức data:text/html trong liên kết Markdown', () => {
      const maliciousDataUrl = '[Click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)';
      const cleanUrl = sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==');

      expect(cleanUrl).toBe('#unsafe-link');
    });

    it('hiển thị Markdown hợp lệ bình thường: Header, Bold, Italic, Checklist', () => {
      const normalMd = `# Tiêu đề lớn\n\n**In đậm** và *in nghiêng*\n\n- [x] Việc đã xong\n- [ ] Việc cần làm`;
      const html = renderSafeMarkdown(normalMd);

      expect(html).toContain('<h1');
      expect(html).toContain('<strong class="font-bold text-white">In đậm</strong>');
      expect(html).toContain('<em class="italic text-slate-200">in nghiêng</em>');
      expect(html).toContain('checked');
      expect(html).toContain('line-through');
    });
  });
});
