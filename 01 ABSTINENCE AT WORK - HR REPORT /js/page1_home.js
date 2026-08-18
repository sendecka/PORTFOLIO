/* -------------------------------------------------------
   Lekki system cząsteczek/kropli na canvas 2D — bez
   zależności od zewnętrznego Three.js (unpkg), żeby
   działało niezawodnie w każdej przeglądarce.
------------------------------------------------------- */
try {
  const canvas = document.getElementById('bgc');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const stage = document.querySelector('.stage');
  const MAX_DROPLETS = 46;
  let W, H, dpr;
  let particles = [];
  let lastTime = performance.now();
  const reduceMotion = (typeof window.matchMedia === 'function')
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth;
    H = stage.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle() {
    const r = 1 + Math.random() * 2.6;
    return {
      x: Math.random() * W,
      y: H + Math.random() * H * 0.4,
      r,
      speed: 0.12 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.15,
      alpha: 0.15 + Math.random() * 0.35,
      hue: Math.random() > 0.5 ? '160,190,255' : '210,225,255',
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: MAX_DROPLETS }, makeParticle);
  }

  function step(now) {
    const dt = Math.min(now - lastTime, 100);
    lastTime = now;
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      p.y -= p.speed * (dt / 16);
      p.x += p.drift * (dt / 16);
      p.twinklePhase += 0.01 * (dt / 16);

      if (p.y < -10) Object.assign(p, makeParticle(), { y: H + 10 });
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      const twinkle = 0.7 + 0.3 * Math.sin(p.twinklePhase);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grad.addColorStop(0, `rgba(${p.hue}, ${p.alpha * twinkle})`);
      grad.addColorStop(1, `rgba(${p.hue}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${Math.min(p.alpha * twinkle * 1.4, 0.9)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(step);
  }

  window.addEventListener('resize', resize);
  init();
  if (!reduceMotion) requestAnimationFrame(step);
} catch (e) {
  // Animacja tla jest dekoracyjna - jej brak nie moze blokowac reszty strony (np. przycisku)
  console.warn('Animacja tla wylaczona:', e.message);
}

const enterBtn = document.getElementById('enterBtn');
enterBtn.addEventListener('click', () => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'navigate', page: 'summary' }, '*');
  }
});

function reportHeight() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'resize', height: document.documentElement.scrollHeight, fixed: true }, '*');
  }
}
window.addEventListener('load', reportHeight);
setTimeout(reportHeight, 50);
