/**
 * CyberShield AI – Home Page Sections JS
 * Scroll-reveal animations + animated counters + stat bars
 * The home page now uses body scrolling (position:relative, height:auto)
 */

// ── Animated Counter ───────────────────────────────────
function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-target'), 10);
  if (isNaN(target)) return;

  const duration = 2000;
  const startTime = performance.now();

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(easeOutExpo(progress) * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString();
  }

  requestAnimationFrame(tick);
}

// widths for each of the 4 stat bars (in order)
const STAT_BAR_WIDTHS = ['87%', '72%', '95%', '60%'];

function animateStatCards() {
  document.querySelectorAll('.ustat-card').forEach((card, i) => {
    const numEl = card.querySelector('.ustat-num');
    const fill  = card.querySelector('.ustat-fill');
    
    if (numEl && !numEl.dataset.animated) {
      numEl.dataset.animated = 'true';
      setTimeout(() => { animateCounter(numEl); }, i * 150);
    }
    
    if (fill && !fill.dataset.animated) {
      fill.dataset.animated = 'true';
      const targetWidth = getComputedStyle(fill).getPropertyValue('--fill-end') || '75%';
      setTimeout(() => { 
        fill.style.width = targetWidth; 
      }, 500 + i * 100);
    }
  });
}

// ── Scroll Reveal Observer ──────────────────────────────
function initScrollReveal() {
  // body is the scroller when on home page
  let statsTriggered = false;

  // null root = viewport (body scroll)
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1,
  });

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsTriggered) {
        statsTriggered = true;
        animateStatCards();
      }
    });
  }, { root: null, threshold: 0.05 });

  document.querySelectorAll('.scroll-reveal').forEach(el => revealObserver.observe(el));
  const statsSection = document.getElementById('hs-stats');
  if (statsSection) statsObserver.observe(statsSection);

  // Safety fallback – force-reveal everything after 4s in case observer fails
  setTimeout(() => {
    document.querySelectorAll('.scroll-reveal:not(.visible)').forEach(el => el.classList.add('visible'));
    if (!statsTriggered) { statsTriggered = true; animateStatCards(); }
  }, 4000);
}

// ── Boot ────────────────────────────────────────────────
window.addEventListener('load', () => setTimeout(initScrollReveal, 300));
