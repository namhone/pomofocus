/**
 * SERVERLESS ROOMS API ENDPOINT (/api/rooms)
 * ==============================================================================
 * Quản lý vòng đời và đồng bộ siêu nhẹ phòng học Meet đa thiết bị.
 * Hỗ trợ lưu trữ phòng trên Supabase Cloud (bảng public.study_rooms)
 * kết hợp bộ nhớ đệm toàn cục (Global Cloud Cache) cho môi trường Serverless.
 */

export interface StudyRoomData {
  roomId: string;
  slug?: string;
  owner_id?: string;
  title: string;
  hostUserId: string;
  hostEmail: string;
  createdAt: number;
  status: 'active' | 'closed';
  allowFreeGuests: boolean;
  maxParticipants?: number;
  isFreeRoom?: boolean;
  maxDurationMinutes?: number;
  passcode?: string | null;
  roomGoal?: string | null;
  roomCategory?: string | null;
  silentMode?: boolean;
  requireCam?: boolean;
  hostOnlyTimer?: boolean;
  settings?: {
    allow_mic?: boolean;
    allow_screen_share?: boolean;
    is_locked?: boolean;
  };
  activeInviteToken?: string | null;
  inviteTokens?: Record<string, any>;
  participants?: Record<string, any>;
  created_at?: number;
  updated_at?: number;
}

// Global In-Memory Cache (Persists across hot serverless lambdas and local dev)
const globalRoomCache = new Map<string, StudyRoomData>();

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://pgsgmmtpunuttspqcgof.supabase.co').replace(/\/+$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_vEKa2sV_9AW2CNIzxCzIKA_nzKo79b-';

  // 1. GET: Tra cứu phòng theo ID hoặc Slug
  if (req.method === 'GET') {
    const rawId = (req.query?.id || req.query?.roomId || req.query?.slug || '').trim().toLowerCase();
    if (!rawId) {
      // Trả về danh sách phòng active gần nhất
      const activeRooms = Array.from(globalRoomCache.values()).filter(r => r.status === 'active');
      return res.status(200).json({ success: true, rooms: activeRooms });
    }

    // 1.1. Kiểm tra cache
    let room = globalRoomCache.get(rawId) || null;
    if (!room) {
      for (const r of globalRoomCache.values()) {
        if (r.roomId.toLowerCase() === rawId || (r.slug && r.slug.toLowerCase() === rawId)) {
          room = r;
          break;
        }
      }
    }

    if (room) {
      return res.status(200).json({ success: true, room });
    }

    // 1.2. Tra cứu Supabase Cloud study_rooms
    if (supabaseUrl && supabaseKey) {
      try {
        const fetchUrl = `${supabaseUrl}/rest/v1/study_rooms?or=(id.eq.${encodeURIComponent(rawId)},slug.eq.${encodeURIComponent(rawId)})&status=eq.active&select=*&limit=1`;
        const sbRes = await fetch(fetchUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        });
        if (sbRes.ok) {
          const rows = await sbRes.json();
          if (Array.isArray(rows) && rows.length > 0) {
            const row = rows[0];
            const cloudRoom: StudyRoomData = {
              roomId: row.slug || row.id,
              slug: row.slug || row.id,
              owner_id: row.owner_id || row.host_user_id,
              title: row.title,
              hostUserId: row.host_user_id,
              hostEmail: '',
              createdAt: new Date(row.created_at).getTime(),
              status: row.status,
              allowFreeGuests: true,
              maxParticipants: row.capacity_limit || 10,
              isFreeRoom: false,
              settings: row.settings || { allow_mic: true, allow_screen_share: true, is_locked: false }
            };
            globalRoomCache.set(cloudRoom.roomId.toLowerCase(), cloudRoom);
            return res.status(200).json({ success: true, room: cloudRoom });
          }
        }
      } catch (err) {
        console.warn('[api/rooms] Supabase lookup error:', err);
      }
    }

    return res.status(404).json({ success: false, error: 'ROOM_NOT_FOUND', message: 'Phòng học không tồn tại hoặc đã đóng.' });
  }

  // 2. POST: Khởi tạo hoặc cập nhật phòng
  if (req.method === 'POST') {
    try {
      const body: StudyRoomData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const roomId = (body.roomId || body.slug || '').trim().toLowerCase();
      if (!roomId || roomId.length < 3) {
        return res.status(400).json({ success: false, error: 'INVALID_ROOM_ID', message: 'Mã phòng phải có ít nhất 3 ký tự.' });
      }

      const roomData: StudyRoomData = {
        roomId,
        slug: body.slug || roomId,
        owner_id: body.owner_id || body.hostUserId,
        title: body.title?.trim() || `Phòng Học #${roomId}`,
        hostUserId: body.hostUserId,
        hostEmail: body.hostEmail || '',
        createdAt: body.createdAt || Date.now(),
        status: body.status || 'active',
        allowFreeGuests: body.allowFreeGuests !== undefined ? body.allowFreeGuests : true,
        maxParticipants: body.maxParticipants || 10,
        isFreeRoom: body.isFreeRoom ?? false,
        maxDurationMinutes: body.maxDurationMinutes,
        passcode: body.passcode || null,
        roomGoal: body.roomGoal || null,
        roomCategory: body.roomCategory || null,
        silentMode: Boolean(body.silentMode),
        requireCam: Boolean(body.requireCam),
        hostOnlyTimer: Boolean(body.hostOnlyTimer),
        settings: body.settings || { allow_mic: true, allow_screen_share: true, is_locked: false },
        activeInviteToken: body.activeInviteToken || null,
        inviteTokens: body.inviteTokens || {},
        participants: body.participants || {},
        updated_at: Date.now()
      };

      // Lưu vào cache toàn cục
      globalRoomCache.set(roomId, roomData);
      if (roomData.slug) {
        globalRoomCache.set(roomData.slug.toLowerCase(), roomData);
      }

      // Đẩy lên Supabase study_rooms nếu cấu hình service key
      if (supabaseUrl && supabaseKey) {
        try {
          fetch(`${supabaseUrl}/rest/v1/study_rooms`, {
            method: 'POST',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              title: roomData.title,
              status: roomData.status,
              capacity_limit: roomData.maxParticipants
            })
          }).catch(() => {});
        } catch {}
      }

      return res.status(200).json({ success: true, room: roomData });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Server error' });
    }
  }

  // 3. DELETE: Đóng phòng
  if (req.method === 'DELETE') {
    const rawId = (req.query?.id || req.query?.roomId || '').trim().toLowerCase();
    if (rawId) {
      const existing = globalRoomCache.get(rawId);
      if (existing) {
        existing.status = 'closed';
        globalRoomCache.set(rawId, existing);
      }
    }
    return res.status(200).json({ success: true, message: 'Đã đóng phòng.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
