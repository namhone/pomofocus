import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { StudyRoomData } from '../../api/rooms';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader: vi.fn((k: string, v: string) => {
      res.headers[k] = v;
      return res;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data: any) => {
      res.body = data;
      return res;
    }),
    end: vi.fn(() => res)
  };
  return res;
}

describe('Serverless API: /api/rooms Postgres Schema Compatibility & Robustness', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. POST /api/rooms: Strict Schema Column Protection', () => {
    it('chỉ gửi các cột tồn tại trong public.study_rooms (title, status, capacity_limit, host_user_id, id) lên Supabase', async () => {
      const capturedFetches: Array<{ url: string; options: any }> = [];
      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedFetches.push({ url, options });
        return {
          ok: true,
          status: 201,
          json: async () => ({ success: true }),
          text: async () => ''
        } as any;
      });

      const validUuid = '12345678-1234-1234-1234-123456789abc';
      const req = {
        method: 'POST',
        body: {
          roomId: validUuid,
          slug: 'custom-slug-abc',
          owner_id: 'usr_owner_123',
          title: 'Phòng Thử Nghiệm Schema',
          hostUserId: '00000000-0000-0000-0000-000000000001',
          hostEmail: 'host@pomodoro.app',
          status: 'active',
          maxParticipants: 12,
          settings: { allow_mic: true, allow_screen_share: false }
        }
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Xác minh fetch gửi lên Supabase
      const supabasePost = capturedFetches.find(f => f.url.includes('/rest/v1/study_rooms'));
      expect(supabasePost).toBeDefined();

      const sentBody = JSON.parse(supabasePost?.options?.body);
      // Các cột BẮT BUỘC có:
      expect(sentBody.title).toBe('Phòng Thử Nghiệm Schema');
      expect(sentBody.status).toBe('active');
      expect(sentBody.capacity_limit).toBe(12);
      expect(sentBody.host_user_id).toBe('00000000-0000-0000-0000-000000000001');
      expect(sentBody.id).toBe(validUuid);

      // Các cột KHÔNG TỒN TẠI trên Supabase Cloud TUYỆT ĐỐI KHÔNG ĐƯỢC GỬI:
      expect(sentBody.slug).toBeUndefined();
      expect(sentBody.owner_id).toBeUndefined();
      expect(sentBody.settings).toBeUndefined();
    });

    it('không gửi id lên Supabase nếu roomId không phải định dạng UUID', async () => {
      const capturedFetches: Array<{ url: string; options: any }> = [];
      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedFetches.push({ url, options });
        return {
          ok: true,
          status: 201,
          json: async () => ({ success: true }),
          text: async () => ''
        } as any;
      });

      const nonUuidRoom = 'math-exam-room-101';
      const req = {
        method: 'POST',
        body: {
          roomId: nonUuidRoom,
          title: 'Phòng Toán Học 101',
          hostUserId: '00000000-0000-0000-0000-000000000002',
          status: 'active'
        }
      };
      const res = createMockRes();

      await handler(req, res);
      expect(res.statusCode).toBe(200);

      const supabasePost = capturedFetches.find(f => f.url.includes('/rest/v1/study_rooms'));
      expect(supabasePost).toBeDefined();
      const sentBody = JSON.parse(supabasePost?.options?.body);
      expect(sentBody.id).toBeUndefined();
      expect(sentBody.slug).toBeUndefined();
    });
  });

  describe('2. GET /api/rooms: UUID Validation & Safe Query Filtering', () => {
    it('chỉ truy vấn id.eq khi rawId là UUID hợp lệ, không truy vấn slug.eq', async () => {
      const capturedUrls: string[] = [];
      const testUuid = 'abcdef01-2345-6789-abcd-ef0123456789';

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        capturedUrls.push(url);
        return {
          ok: true,
          status: 200,
          json: async () => [{
            id: testUuid,
            host_user_id: '00000000-0000-0000-0000-000000000003',
            title: 'Phòng Từ Supabase Cloud',
            status: 'active',
            capacity_limit: 10,
            created_at: new Date().toISOString(),
            closed_at: null
          }]
        } as any;
      });

      const req = {
        method: 'GET',
        query: { id: testUuid }
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.room.roomId).toBe(testUuid);

      const calledUrl = capturedUrls.find(u => u.includes('/rest/v1/study_rooms'));
      expect(calledUrl).toBeDefined();
      expect(calledUrl).toContain(`id=eq.${testUuid}`);
      expect(calledUrl).not.toContain('slug.eq');
    });

    it('không gửi truy vấn id.eq lên Supabase nếu ID không phải UUID (tránh lỗi 22P02 Postgres syntax)', async () => {
      const capturedUrls: string[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        capturedUrls.push(url);
        return {
          ok: false,
          status: 404,
          json: async () => ({})
        } as any;
      });

      const nonUuid = 'custom-slug-not-uuid';
      const req = {
        method: 'GET',
        query: { id: nonUuid }
      };
      const res = createMockRes();

      await handler(req, res);

      // Vì không phải UUID và không có trong cache -> Không gọi Supabase query id.eq để tránh 22P02, trả về 404
      const supabaseQuery = capturedUrls.find(u => u.includes('/rest/v1/study_rooms'));
      expect(supabaseQuery).toBeUndefined();
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('ROOM_NOT_FOUND');
    });
  });

  describe('3. DELETE /api/rooms: Safe Closing & Patch', () => {
    it('chỉ gửi PATCH theo id.eq khi rawId là UUID hợp lệ, không chứa slug.eq', async () => {
      const capturedFetches: Array<{ url: string; options: any }> = [];
      const testUuid = '98765432-1234-4321-9876-543210abcdef';

      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedFetches.push({ url, options });
        return {
          ok: true,
          status: 200,
          text: async () => ''
        } as any;
      });

      const req = {
        method: 'DELETE',
        query: { id: testUuid }
      };
      const res = createMockRes();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const patchCall = capturedFetches.find(f => f.url.includes('/rest/v1/study_rooms'));
      expect(patchCall).toBeDefined();
      expect(patchCall?.url).toContain(`id=eq.${testUuid}`);
      expect(patchCall?.url).not.toContain('slug.eq');
      expect(patchCall?.options?.method).toBe('PATCH');

      const patchBody = JSON.parse(patchCall?.options?.body);
      expect(patchBody.status).toBe('closed');
      expect(patchBody.closed_at).toBeDefined();
    });
  });
});
