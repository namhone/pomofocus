import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cropAndCompressImage,
  fetchImageBlobSafe,
  dataUriToBlob,
  uploadAvatarToStorage,
  processAndSaveCustomAvatar,
  CORS_PROXIES
} from '../../src/services/avatarUploadService';
import { authService, isValidAvatarUrl } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { localProfileCache } from '../../src/services/profileService';
import { supabase } from '../../src/lib/supabase';

describe('Custom Avatar Cloud Sync & Compression Specification (All-in-One Avatar)', () => {
  const TEST_USER_ID = 'test-user-avatar-1234';
  const TEST_EMAIL = 'namho03052k9@gmail.com';

  beforeEach(() => {
    localStorage.clear();
    localProfileCache.clear();
    useAuthStore.getState().logout();
    vi.restoreAllMocks();
  });

  describe('1. Cắt vuông 1:1 và nén ảnh (Client-Side Cropping & Compression)', () => {
    it('chuyển đổi Data URI sang Blob an toàn và chính xác', () => {
      const sampleDataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD_TEST_DATA';
      const blob = dataUriToBlob(sampleDataUri);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/jpeg');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('nén ảnh và đưa về kích thước vuông chuẩn 256x256 pixel với dung lượng nhẹ (< 50KB)', async () => {
      const sampleBlob = new Blob(['sample-raw-image-bytes-very-large-content-simulate-multi-megabytes'.repeat(500)], {
        type: 'image/jpeg'
      });

      const result = await cropAndCompressImage(sampleBlob, {
        targetSize: 256,
        quality: 0.85
      });

      expect(result).toBeDefined();
      expect(result.width).toBe(256);
      expect(result.height).toBe(256);
      expect(result.sizeKb).toBeLessThanOrEqual(50);
      expect(result.dataUrl).toContain('data:image/');
      expect(isValidAvatarUrl(result.dataUrl)).toBe(true);
    });
  });

  describe('2. Cơ chế vượt tường lửa CORS & Proxy Fallback', () => {
    it('danh sách proxy CORS có đầy đủ Weserv và AllOrigins với mã hóa URI', () => {
      const testUrl = 'https://cdn.discordapp.com/avatars/123/abc.png?size=1024';
      const weservProxy = CORS_PROXIES[0](testUrl);
      const allOriginsProxy = CORS_PROXIES[1](testUrl);

      expect(weservProxy).toContain('images.weserv.nl');
      expect(weservProxy).toContain(encodeURIComponent(testUrl));
      expect(allOriginsProxy).toContain('api.allorigins.win');
      expect(allOriginsProxy).toContain(encodeURIComponent(testUrl));
    });

    it('tải dữ liệu từ Data URI trực tiếp không cần gọi mạng ngoài', async () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = await fetchImageBlobSafe(dataUri);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });

    it('tải từ URL ngoài qua proxy khi có phản hồi hợp lệ', async () => {
      const mockBlob = new Blob(['mock-image-data'], { type: 'image/jpeg' });
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      } as any);

      const resultBlob = await fetchImageBlobSafe('https://i.imgur.com/example123.jpg');
      expect(resultBlob).toBeInstanceOf(Blob);
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('3. Tải lên Supabase Storage bucket "avatars" & Fallback phòng thủ', () => {
    it('gọi storage.from("avatars").upload với đường dẫn chuẩn hóa gắn liền userId và lấy publicUrl', async () => {
      const mockBlob = new Blob(['avatar-image-binary'], { type: 'image/jpeg' });
      const uploadSpy = vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { Key: 'avatars/test/avatar.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://xyz.supabase.co/storage/v1/object/public/avatars/test_user/avatar_123.jpg' }
        })
      } as any);

      const publicUrl = await uploadAvatarToStorage('user_123', mockBlob, 'jpg');
      expect(publicUrl).toBe('https://xyz.supabase.co/storage/v1/object/public/avatars/test_user/avatar_123.jpg');
      expect(uploadSpy).toHaveBeenCalledWith('avatars');
    });

    it('fallback an toàn sang null khi Storage gặp lỗi mà không gây crash ứng dụng', async () => {
      const mockBlob = new Blob(['avatar-image-binary'], { type: 'image/jpeg' });
      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Bucket not found' } }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } })
      } as any);

      const result = await uploadAvatarToStorage('user_123', mockBlob);
      expect(result).toBeNull();
    });
  });

  describe('4. Quy trình toàn diện processAndSaveCustomAvatar & Đồng bộ Realtime', () => {
    it('xử lý ảnh từ File, tải lên Storage và cập nhật tức thì vào useAuthStore & profiles cache', async () => {
      // Khởi tạo user trong useAuthStore
      const testUser = await authService.signup(TEST_EMAIL, 'Password123!', 'Nam Ho Founder');
      useAuthStore.setState({ user: testUser, isAuthenticated: true });

      const mockPublicUrl = 'https://xyz.supabase.co/storage/v1/object/public/avatars/test_user_id/avatar_live.jpg';
      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { Key: 'avatars/key' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockPublicUrl } })
      } as any);

      const file = new File(['fake-image-bytes-5mb'], 'my-photo.jpg', { type: 'image/jpeg' });
      const res = await processAndSaveCustomAvatar(testUser.id, file, testUser.email);

      expect(res.success).toBe(true);
      expect(res.isCloudStorage).toBe(true);
      expect(res.avatarUrl).toBe(mockPublicUrl);
      expect(res.sizeKb).toBeLessThan(100);

      // BẢO CHỨNG BẤT BIẾN 1: State của useAuthStore được cập nhật tức thì (0ms, không cần F5)
      const currentUser = useAuthStore.getState().user;
      expect(currentUser?.avatarUrl).toBe(mockPublicUrl);
      expect(currentUser?.customAvatarUrl).toBe(mockPublicUrl);
      expect(currentUser?.hasCustomAvatar).toBe(true);

      // BẢO CHỨNG BẤT BIẾN 2: Cache Supabase profiles được cập nhật
      const cached = localProfileCache.get(testUser.id);
      expect(cached?.avatar_url).toBe(mockPublicUrl);
      expect(cached?.custom_avatar_url).toBe(mockPublicUrl);
      expect(cached?.has_custom_avatar).toBe(true);
    });

    it('fallback an toàn khi Storage bucket chưa kích hoạt: lưu Base64 Data URI tối ưu và vẫn sync 100%', async () => {
      const testUser = await authService.signup('student@gmail.com', 'Pass12345!', 'Student Test');
      useAuthStore.setState({ user: testUser, isAuthenticated: true });

      // Giả lập storage upload thất bại (ví dụ bucket chưa bật công khai trên Cloud)
      vi.spyOn(supabase.storage, 'from').mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Storage bucket offline' } }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } })
      } as any);

      const sampleDataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD_STUDENT_AVATAR';
      const res = await processAndSaveCustomAvatar(testUser.id, sampleDataUri, testUser.email);

      expect(res.success).toBe(true);
      expect(res.isCloudStorage).toBe(false);
      // Vẫn có avatar URL hợp lệ dạng Data URI nén
      expect(res.avatarUrl.startsWith('data:image/')).toBe(true);
      expect(isValidAvatarUrl(res.avatarUrl)).toBe(true);

      // State Zustand vẫn nhận diện ngay avatar mới
      expect(useAuthStore.getState().user?.avatarUrl).toBe(res.avatarUrl);
      expect(useAuthStore.getState().user?.hasCustomAvatar).toBe(true);
    });

    it('từ chối xử lý khi userId rỗng', async () => {
      const res = await processAndSaveCustomAvatar('', 'https://example.com/avatar.jpg');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });
});
