import React, { useEffect, useRef } from 'react';
import { useBackgroundStore } from '../stores/useBackgroundStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  rotation?: number;
  rotationSpeed?: number;
}

export const AmbientOverlay: React.FC = () => {
  const ambientEffect = useBackgroundStore((s) => s.ambientEffect);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (ambientEffect === 'none') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isPaused = false;

    // Kích thước canvas đồng bộ với viewport
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Kiểm tra prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      isPaused = true;
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isPaused = e.matches;
    };
    mediaQuery.addEventListener?.('change', handleMotionChange);

    // Tạm dừng khi tab ẩn để tiết kiệm pin / CPU
    const handleVisibilityChange = () => {
      isPaused = document.hidden || mediaQuery.matches;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Khởi tạo các hạt theo hiệu ứng được chọn (tối đa 40-50 hạt nhẹ nhàng)
    const particleCount = ambientEffect === 'rain' ? 60 : ambientEffect === 'snow' ? 45 : 30;
    const particles: Particle[] = [];

    const initParticle = (): Particle => {
      const w = canvas.width;
      const h = canvas.height;

      if (ambientEffect === 'rain') {
        return {
          x: Math.random() * (w + 200) - 100,
          y: Math.random() * -h,
          vx: -1.5,
          vy: Math.random() * 8 + 12,
          size: Math.random() * 1.5 + 1,
          opacity: Math.random() * 0.35 + 0.15,
          color: '#93c5fd'
        };
      }

      if (ambientEffect === 'snow') {
        return {
          x: Math.random() * w,
          y: Math.random() * -h,
          vx: (Math.random() - 0.5) * 1,
          vy: Math.random() * 1.2 + 0.8,
          size: Math.random() * 2.5 + 1.5,
          opacity: Math.random() * 0.5 + 0.25,
          color: '#ffffff'
        };
      }

      if (ambientEffect === 'sakura') {
        return {
          x: Math.random() * (w + 100) - 50,
          y: Math.random() * -h,
          vx: Math.random() * 1.5 + 0.5,
          vy: Math.random() * 1.2 + 1,
          size: Math.random() * 4 + 3,
          opacity: Math.random() * 0.45 + 0.25,
          color: '#fbcfe8',
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.04
        };
      }

      // 'fireflies' (Đom đóm)
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.6 + 0.2,
        color: '#fef08a'
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(initParticle());
      // Phân bố đều trong viewport lúc bắt đầu
      particles[i].y = Math.random() * canvas.height;
    }

    // Animation Loop
    const render = () => {
      if (!isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;

          if (ambientEffect === 'rain') {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 2);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.lineWidth = p.size;
            ctx.stroke();

            if (p.y > canvas.height || p.x < -100) {
              particles[idx] = initParticle();
            }
          } else if (ambientEffect === 'snow') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.fill();

            if (p.y > canvas.height) {
              particles[idx] = initParticle();
            }
          } else if (ambientEffect === 'sakura') {
            if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
              p.rotation += p.rotationSpeed;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.fill();
            ctx.restore();

            if (p.y > canvas.height || p.x > canvas.width + 50) {
              particles[idx] = initParticle();
            }
          } else if (ambientEffect === 'fireflies') {
            p.opacity += (Math.random() - 0.5) * 0.05;
            p.opacity = Math.max(0.1, Math.min(0.8, p.opacity));

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#fef08a';
            ctx.fill();
            ctx.shadowBlur = 0;

            if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
              particles[idx] = initParticle();
            }
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      mediaQuery.removeEventListener?.('change', handleMotionChange);
    };
  }, [ambientEffect]);

  if (ambientEffect === 'none') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="ambient-canvas-overlay"
      className="fixed inset-0 pointer-events-none z-[1] w-full h-full"
      aria-hidden="true"
    />
  );
};
