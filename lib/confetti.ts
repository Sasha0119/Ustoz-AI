interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string; size: number;
  rotation: number; rotationSpeed: number;
  alpha: number;
  shape: 'rect' | 'circle' | 'star';
  vy0: number;
}

const COLORS = ['#7C3AED', '#8B5CF6', '#10B981', '#F59E0B', '#0EA5E9', '#F43F5E', '#FCD34D', '#34D399'];

export function fireConfetti(originX?: number, originY?: number) {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:99999;width:100%;height:100%;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const ox = originX ?? canvas.width / 2;
  const oy = originY ?? canvas.height * 0.55;

  const particles: Particle[] = Array.from({ length: 130 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 14 + 4;
    return {
      x: ox, y: oy,
      vx: Math.cos(angle) * speed * 0.9,
      vy0: Math.sin(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 9 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.28,
      alpha: 1,
      shape: (['rect', 'rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 4)],
    };
  });

  let frame = 0;
  const maxFrames = 110;

  const drawStar = (ctx: CanvasRenderingContext2D, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + (2 * Math.PI) / 10;
      if (i === 0) ctx.moveTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r);
      else ctx.lineTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r);
      ctx.lineTo(Math.cos(innerAngle) * r * 0.45, Math.sin(innerAngle) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
  };

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    for (const p of particles) {
      p.x  += p.vx;
      p.vy += 0.35;
      p.y  += p.vy;
      p.vx *= 0.985;
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, 1 - frame / maxFrames);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawStar(ctx, p.size / 2);
      }
      ctx.restore();
    }

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(animate);
}
