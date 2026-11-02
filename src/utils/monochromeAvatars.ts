/**
 * KHO 6 AVATAR TỐI GIẢN HÌNH HỌC (MONOCHROME GEOMETRIC AVATARS)
 * Chuẩn phong cách thiết kế Dark Mode cao cấp (Linear.app / Raycast / Vercel).
 * Sử dụng định dạng SVG siêu nhẹ, sắc nét ở mọi độ phân giải Retina và không phụ thuộc mạng ngoài.
 */

export interface GeometricAvatar {
  id: string;
  name: string;
  svgDataUri: string;
}

export const MONOCHROME_GEOMETRIC_AVATARS: GeometricAvatar[] = [
  {
    id: 'zen-rings',
    name: 'Vòng Tròn Tĩnh Lặng (Zen Rings)',
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="%2309090b"/><circle cx="50" cy="50" r="40" stroke="%2327272a" stroke-width="2"/><circle cx="50" cy="50" r="30" stroke="%233f3f46" stroke-width="2.5"/><circle cx="50" cy="50" r="20" stroke="%2371717a" stroke-width="3"/><circle cx="50" cy="50" r="10" stroke="%23d4d4d8" stroke-width="3.5"/><circle cx="50" cy="50" r="3.5" fill="%23ffffff"/></svg>`
  },
  {
    id: 'cyber-hex',
    name: 'Lục Giác Công Nghệ (Cyber Hex)',
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="%2309090b"/><polygon points="50,15 82,33 82,67 50,85 18,67 18,33" stroke="%2352525b" stroke-width="2.5"/><polygon points="50,26 72,39 72,61 50,74 28,61 28,39" stroke="%23a1a1aa" stroke-width="2"/><polygon points="50,37 62,44 62,56 50,63 38,56 38,44" fill="%23ffffff"/></svg>`
  },
  {
    id: 'hyper-cube',
    name: 'Khối Đa Chiều (Isometric Cube)',
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="%2309090b"/><polygon points="50,20 80,36 50,52 20,36" fill="%2327272a" stroke="%23e4e4e7" stroke-width="2"/><polygon points="50,52 80,36 80,68 50,84" fill="%2318181b" stroke="%23a1a1aa" stroke-width="2"/><polygon points="20,36 50,52 50,84 20,68" fill="%230f0f11" stroke="%2371717a" stroke-width="2"/><circle cx="50" cy="52" r="3" fill="%23ffffff"/></svg>`
  },
  {
    id: 'prism-diamond',
    name: 'Kim Cương Tối Giản (Prism Diamond)',
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="%2309090b"/><polygon points="50,12 85,50 50,88 15,50" stroke="%233f3f46" stroke-width="2"/><polygon points="50,22 75,50 50,78 25,50" stroke="%2371717a" stroke-width="2.5"/><polygon points="50,33 65,50 50,67 35,50" stroke="%23e4e4e7" stroke-width="2.5"/><polygon points="50,42 58,50 50,58 42,50" fill="%23ffffff"/></svg>`
  },
  {
    id: 'orbital-pulse',
    name: 'Xung Quỹ Đạo (Orbital Pulse)',
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="%2309090b"/><circle cx="50" cy="50" r="38" stroke="%2327272a" stroke-width="1.5" stroke-dasharray="4 4"/><circle cx="50" cy="50" r="26" stroke="%2371717a" stroke-width="2"/><circle cx="50" cy="50" r="14" stroke="%23d4d4d8" stroke-width="2.5"/><circle cx="50" cy="50" r="6" fill="%23ffffff"/><circle cx="50" cy="12" r="3" fill="%23e4e4e7"/><circle cx="76" cy="50" r="2.5" fill="%23a1a1aa"/></svg>`
  },
  {
    id: 'abstract-monolith',
    name: 'Đài Tinh Thể (Abstract Monolith)',
    svgDataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="50" fill="%2309090b"/><line x1="28" y1="28" x2="28" y2="72" stroke="%233f3f46" stroke-width="5" stroke-linecap="round"/><line x1="42" y1="20" x2="42" y2="80" stroke="%23a1a1aa" stroke-width="6" stroke-linecap="round"/><line x1="58" y1="16" x2="58" y2="84" stroke="%23ffffff" stroke-width="6" stroke-linecap="round"/><line x1="72" y1="28" x2="72" y2="72" stroke="%2371717a" stroke-width="5" stroke-linecap="round"/></svg>`
  }
];
