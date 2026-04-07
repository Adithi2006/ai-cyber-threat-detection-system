/**
 * CyberShield AI – Circuit Network Background Video
 * Generates a smooth, professional animated video background suitable for a cybersecurity dashboard.
 * Simulates live network activity using a navy blue palette with gentle pulsing nodes and flowing data lines.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('circuit-video-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, cx, cy;

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
    cx = W / 2;
    cy = H / 2;
  }
  resize();
  window.addEventListener('resize', () => { resize(); buildScene(); });

  /* ─── helpers ─────────────────────────────── */
  const rnd  = (a, b) => a + Math.random() * (b - a);
  const rndI = (a, b) => Math.floor(rnd(a, b));
  const TAU  = Math.PI * 2;

  /* ─── circuit path builder ─────────────────── */
  function buildPaths(count) {
    const paths = [];
    for (let i = 0; i < count; i++) {
      const angle = rnd(0, TAU);
      const segs  = rndI(2, 6);
      const pts   = [{ x: cx, y: cy }];
      let   x = cx, y = cy;
      let   dir = angle;

      for (let s = 0; s < segs; s++) {
        const len = rnd(60, 250);
        // snap direction to nearest 45°
        dir = Math.round(dir / (Math.PI / 4)) * (Math.PI / 4);
        x += Math.cos(dir) * len;
        y += Math.sin(dir) * len;

        x = Math.max(-100, Math.min(W + 100, x));
        y = Math.max(-100, Math.min(H + 100, y));
        pts.push({ x, y });

        dir += (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4) * rndI(1, 2);
      }

      const last = pts[pts.length - 1];
      paths.push({
        pts,
        endX : last.x,
        endY : last.y,
        totalDist: pathLength(pts),
        pulses: Array.from({ length: rndI(1, 2) }, () => ({
          t    : rnd(0, 1),
          // Slower speed for calm, professional look
          speed: rnd(0.0008, 0.002),
          size : rnd(2, 4),
          alpha: rnd(0.4, 0.8),
        })),
        alpha: rnd(0.05, 0.25), // Subtly transparent lines
        width: rnd(1, 1.5),
      });
    }
    return paths;
  }

  function pathLength(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i-1].x;
      const dy = pts[i].y - pts[i-1].y;
      d += Math.sqrt(dx*dx + dy*dy);
    }
    return d || 1;
  }

  function pointAlongPath(pts, t) {
    const total = pathLength(pts);
    let target = t * total;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i-1].x;
      const dy = pts[i].y - pts[i-1].y;
      const seg = Math.sqrt(dx*dx + dy*dy);
      if (target <= seg) {
        const f = target / seg;
        return { x: pts[i-1].x + dx * f, y: pts[i-1].y + dy * f };
      }
      target -= seg;
    }
    return pts[pts.length - 1];
  }

  /* ─── bokeh particles ──────────────────────── */
  function buildParticles(count) {
    return Array.from({ length: count }, () => ({
      x    : rnd(0, W),
      y    : rnd(0, H),
      r    : rnd(1, 5),
      alpha: rnd(0.02, 0.2),
      // Very slow movement
      vx   : rnd(-0.1, 0.1),
      vy   : rnd(-0.1, 0.1),
      color: ['#0077b6', '#00b4d8', '#90e0ef', '#00ffcc'][rndI(0, 4)],
    }));
  }

  let paths, particles;
  function buildScene() {
    paths     = buildPaths(45);
    particles = buildParticles(70);
  }
  buildScene();

  const RAY_COUNT = 12;
  let frame = 0;

  /* ─── main draw ────────────────────────────── */
  function draw() {
    frame++;
    const t = frame * 0.005; // Slower time evolution

    /* 1. Deep navy blue base background */
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 1.2);
    bg.addColorStop(0,   '#051024'); // Dark navy center
    bg.addColorStop(0.5, '#020713'); // Deeper navy
    bg.addColorStop(1,   '#010308'); // Almost black edges
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* 2. Circuit traces (flowing data lines) */
    for (const p of paths) {
      const pts = p.pts;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = `rgba(0,180,255,${p.alpha})`;
      ctx.lineWidth   = p.width;
      ctx.stroke();

      // Terminal pad
      const ex = p.endX, ey = p.endY, ps = 3;
      ctx.beginPath();
      ctx.rect(ex - ps/2, ey - ps/2, ps, ps);
      ctx.fillStyle = `rgba(0,200,255,${p.alpha * 1.5})`;
      ctx.fill();

      // Gentle pulsing joints
      const jointPulse = 0.8 + 0.2 * Math.sin(t * 2 + p.pts[0].x);
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.5, 0, TAU);
        ctx.fillStyle = `rgba(0,255,220,${p.alpha * jointPulse})`;
        ctx.fill();
      }
    }

    /* 3. Moving energy pulses */
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of paths) {
      for (const pulse of p.pulses) {
        pulse.t += pulse.speed;
        if (pulse.t > 1) pulse.t -= 1;

        const pos = pointAlongPath(p.pts, pulse.t);
        
        // Soft glow for pulse
        const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pulse.size * 3);
        g.addColorStop(0,   `rgba(0,255,230,${pulse.alpha * 0.8})`);
        g.addColorStop(0.5, `rgba(0,150,255,${pulse.alpha * 0.3})`);
        g.addColorStop(1,   'transparent');
        
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulse.size * 3, 0, TAU);
        ctx.fill();

        // Inner solid dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulse.size * 0.4, 0, TAU);
        ctx.fillStyle = `rgba(200,255,255,${pulse.alpha})`;
        ctx.fill();
      }
    }
    ctx.restore();

    /* 4. Slow moving bokeh particles */
    for (const pk of particles) {
      pk.x += pk.vx;
      pk.y += pk.vy;
      if (pk.x < -20) pk.x = W + 20;
      if (pk.x > W+20) pk.x = -20;
      if (pk.y < -20) pk.y = H + 20;
      if (pk.y > H+20) pk.y = -20;

      const pkPulse = 0.5 + 0.5 * Math.sin(t + pk.x * 0.01);
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.r, 0, TAU);
      ctx.fillStyle = pk.color.replace(')', `,${pk.alpha * pkPulse})`).replace('rgb', 'rgba');
      ctx.fill();
    }

    /* 5. Subdued central light source */
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const centerPulse = 0.9 + 0.1 * Math.sin(t * 1.5);

    // Reduced wide glow so it's not distracting
    const wideGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.5 * centerPulse);
    wideGlow.addColorStop(0,   'rgba(0,120,255,0.15)');
    wideGlow.addColorStop(0.5, 'rgba(0,80,180,0.05)');
    wideGlow.addColorStop(1,   'transparent');
    ctx.fillStyle = wideGlow;
    ctx.fillRect(0, 0, W, H);

    // Subtle horizontal beam
    const beamAlpha = 0.15 + 0.05 * Math.sin(t * 2);
    const beam = ctx.createLinearGradient(0, cy, W, cy);
    beam.addColorStop(0,    'transparent');
    beam.addColorStop(0.4,  `rgba(0,150,255,${beamAlpha})`);
    beam.addColorStop(0.5,  `rgba(150,220,255,${beamAlpha + 0.1})`);
    beam.addColorStop(0.6,  `rgba(0,150,255,${beamAlpha})`);
    beam.addColorStop(1,    'transparent');
    ctx.fillStyle = beam;
    ctx.fillRect(0, cy - 1, W, 2);

    // Subdued lens flares
    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = (TAU / RAY_COUNT) * i + t * 0.02;
      const len   = (i % 2 === 0 ? 0.6 : 0.3) * Math.min(W, H);
      const alpha = (i % 2 === 0 ? 0.05 : 0.02) * centerPulse;
      
      const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle)*len, cy + Math.sin(angle)*len);
      grad.addColorStop(0,   `rgba(100,200,255,${alpha * 2})`);
      grad.addColorStop(0.2, `rgba(0,120,255,${alpha})`);
      grad.addColorStop(1,   'transparent');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      const spread = 0.008;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle - spread)*len, cy + Math.sin(angle - spread)*len);
      ctx.lineTo(cx + Math.cos(angle + spread)*len, cy + Math.sin(angle + spread)*len);
      ctx.closePath();
      ctx.fill();
    }

    // Inner core - brighter cyan and white
    const coreSize = 45 + 10 * Math.sin(t * 3);
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
    coreGrad.addColorStop(0,   'rgba(255,255,255,1)');
    coreGrad.addColorStop(0.2, 'rgba(0,255,255,0.7)');
    coreGrad.addColorStop(1,   'transparent');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, W, H);

    /* 6. Deep Professional Overlay */
    // Instead of darkening the screen, we apply a subtle bright blue/navy tint to harmonize colours 
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(0, 100, 255, 0.05)';
    ctx.fillRect(0, 0, W, H);

    ctx.restore();

    requestAnimationFrame(draw);
  }

  draw();
})();
