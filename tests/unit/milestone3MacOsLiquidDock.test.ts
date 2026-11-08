import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Milestone 3: macOS Apple Liquid Glass Dockbar & Magnification Physics', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const dockCssPath = path.join(rootDir, 'src/styles/liquidDock.css');
  const dockBarPath = path.join(rootDir, 'src/components/DockBar.tsx');
  const indexCssPath = path.join(rootDir, 'src/index.css');

  const dockCss = fs.readFileSync(dockCssPath, 'utf-8');
  const dockCode = fs.readFileSync(dockBarPath, 'utf-8');
  const indexCss = fs.readFileSync(indexCssPath, 'utf-8');

  it('liquidDock.css được liên kết chính thức trong src/index.css', () => {
    expect(indexCss).toContain("@import './styles/liquidDock.css';");
  });

  describe('Feature 7: Thấu kính Liquid Glass & Phản xạ Specular (.dock::before)', () => {
    it('sở hữu độ mờ sâu blur(20px) và độ bão hòa saturate(150%)', () => {
      expect(dockCss).toContain('blur(20px) saturate(150%)');
    });

    it('nền kính sâu rgba(30, 30, 35, 0.75) kết hợp gradient ánh sáng 180deg', () => {
      expect(dockCss).toContain('rgba(30, 30, 35, 0.75)');
      expect(dockCss).toContain('rgba(255, 255, 255, 0.13)');
    });

    it('lớp phản xạ Specular Highlight vi mô .dock::before', () => {
      expect(dockCss).toContain('.dock::before');
      expect(dockCss).toContain('linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0))');
      expect(dockCode).toContain('dock');
    });
  });

  describe('Feature 8: Hiệu ứng Magnification kế cận chuẩn macOS (Pure CSS)', () => {
    it('icon hover phóng đại cực đại --max: 1.75', () => {
      expect(dockCss).toContain('--max: 1.75');
      expect(dockCss).toContain('.dock__item:hover');
    });

    it('icon liền kề 1 nấc phóng to 56% theo đường concosine (scale 1.42x)', () => {
      expect(dockCss).toContain('calc(1 + (var(--max) - 1) * 0.56)');
    });

    it('icon liền kề 2 nấc khẽ nảy 5% (scale 1.04x)', () => {
      expect(dockCss).toContain('calc(1 + (var(--max) - 1) * 0.05)');
    });

    it('nhấc bổng lên trên translateY(-8px) khi bấm giữ (active)', () => {
      expect(dockCss).toContain('translateY(max(-8px, calc(var(--s) * -0.15)))');
    });
  });

  describe('Feature 9: Tooltip Thủy Tinh (Glass Tooltip 14px blur 18px)', () => {
    it('tooltip nổi phía trên 14px với backdrop-filter: blur(18px)', () => {
      expect(dockCss).toContain('bottom: calc(100% + 14px)');
      expect(dockCss).toContain('blur(18px) saturate(160%)');
    });

    it('mỗi nút dock đều có nhãn tooltip kính mờ riêng biệt', () => {
      expect(dockCode).toContain('dock__tooltip');
    });
  });

  describe('Feature 10: Chấm Đèn Hoạt Động Trắng Ngọc 3px (.dock__dot)', () => {
    it('chấm sáng tròn 3px trắng ngọc tỏa hào quang phía dưới icon khi widget mở', () => {
      expect(dockCss).toContain('.dock__dot');
      expect(dockCss).toContain('rgba(255, 255, 255, 0.95)');
      expect(dockCode).toContain('dock__dot');
    });
  });

  describe('Feature 11: Bảo Tồn 100% 18 Thuộc Tính data-testid Cốt Lõi', () => {
    const requiredTestIds = [
      'dockbar',
      'dock-btn-timer',
      'dock-btn-focus',
      'dock-btn-zen',
      'dock-btn-tasks',
      'dock-btn-notes',
      'dock-btn-calendar',
      'dock-btn-spaces',
      'dock-btn-sounds',
      'dock-btn-media',
      'dock-btn-ai',
      'dock-btn-presets',
      'dock-quick-menu',
      'dock-position-left'
    ];

    for (const testId of requiredTestIds) {
      it(`bảo toàn data-testid="${testId}"`, () => {
        expect(dockCode).toContain(testId);
      });
    }
  });

  describe('Responsive & Motion Accessibility', () => {
    it('hỗ trợ thu nhỏ kích thước icon trên mobile/tablet (40px/48px)', () => {
      expect(dockCss).toContain('@media (max-width: 767px)');
    });

    it('tôn trọng cấu hình prefers-reduced-motion của hệ thống', () => {
      expect(dockCss).toContain('@media (prefers-reduced-motion: reduce)');
      expect(dockCss).toContain('transition: none !important');
    });
  });
});
