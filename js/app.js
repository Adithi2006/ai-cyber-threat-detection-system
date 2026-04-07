/**
 * CyberShield AI – Main Application Controller
 * Handles page routing, simulation loop, UI updates, settings, and all state.
 */

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
const State = {
  // Counters
  totalTraffic: 0,
  threatsDetected: 0,
  threatsResolved: 0,
  safeCount: 0,
  suspiciousCount: 0,
  attackCount: 0,

  // Records
  allAlerts: [],       // Full alert objects
  allLogs: [],         // Log objects
  allResponses: [],    // Response objects

  // Settings
  alertsEnabled: true,
  critOnlyAlerts: false,
  autoResponse: true,
  scanInterval: 2000,
  currentSensitivity: 'medium',
  glowEnabled: true,

  // UI
  currentLogFilter: 'all',
  currentAlertFilter: 'all',
  scanIntervalId: null,
  startTime: Date.now(),
  dashboardInited: false,
  isRunning: true,
};

// ═══════════════════════════════════════════
// CANVAS ANIMATION (Hero Background)
// ═══════════════════════════════════════════
function initHeroCanvas() {
  const canvas = document.getElementById('home-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  const nodes = Array.from({ length: 60 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
    r: Math.random() * 2 + 1,
    color: ['#00b4ff', '#00ff88', '#a855f7', '#06b6d4'][Math.floor(Math.random() * 4)],
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(0,180,255,${0.15 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();

  window.addEventListener('resize', () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  });
}

// ═══════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════
function showPage(pageId) {
  const current = document.querySelector('.page.active');
  const targetId = `page-${pageId}`;
  
  // Set body overflow and reset scroll
  if (pageId === 'home' || pageId === 'about') {
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';
    window.scrollTo(0, 0); // Reset scroll to top

  } else {
    document.body.style.overflowY = 'hidden';
    document.body.style.height = '100vh';
  }

  const activate = () => {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
      p.style.opacity = '';
    });
    const target = document.getElementById(targetId);
    if (target) target.classList.add('active');
    document.body.setAttribute('data-page', pageId);

    if (pageId === 'dashboard' && !State.dashboardInited) {
      State.dashboardInited = true;
      initDashboard();
    }
  };

  if (current && current.id !== targetId) {
    current.style.opacity = '0';
    setTimeout(activate, 400);
  } else {
    activate();
  }
}

// ═══════════════════════════════════════════
// SIDEBAR VIEW SWITCHING
// ═══════════════════════════════════════════
function switchView(link) {
  event.preventDefault();
  const viewId = link.getAttribute('data-view');
  if (link.classList.contains('active')) return;

  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  link.classList.add('active');

  const currentView = document.querySelector('.view.active');
  
  const activateNewView = () => {
    if (currentView) {
      currentView.classList.remove('active');
      currentView.style.animation = ''; // Reset
    }
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      target.style.animation = 'viewFadeIn 0.3s ease-out forwards';
    }
    
    // Update Title
    const titles = {
      'view-dashboard':  'Dashboard Overview',
      'view-alerts':     'Threat Alerts',
      'view-analytics':  'Analytics & Insights',
      'view-logs':       'System Logs',
      'view-settings':   'Settings',
      'view-reports':    'Security Assessment',
    };
    const el = document.getElementById('dash-view-title');
    if (el) el.textContent = titles[viewId] || 'Dashboard';
  };

  if (currentView) {
    currentView.style.animation = 'viewFadeOut 0.2s ease-in forwards';
    setTimeout(activateNewView, 200);
  } else {
    activateNewView();
  }
}

// ═══════════════════════════════════════════
// DASHBOARD INITIALIZATION
// ═══════════════════════════════════════════
function initDashboard() {
  updateClock();
  setInterval(updateClock, 1000);
  ChartManager.init();
  startScanLoop();
  addBootLogs();
  updateUptimeDisplay();
  setInterval(updateUptimeDisplay, 1000);
}

function updateClock() {
  const el = document.getElementById('dash-time');
  if (el) el.textContent = new Date().toLocaleString('en', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
}

function updateUptimeDisplay() {
  const el = document.getElementById('sys-uptime');
  if (!el) return;
  const secs = Math.floor((Date.now() - State.startTime) / 1000);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  el.textContent = `${h}:${m}:${s}`;
}

function addBootLogs() {
  const bootMessages = [
    ['INFO', 'CyberShield AI v2.4.1 initialized'],
    ['INFO', 'Loading AI model CyberNet-7B...'],
    ['INFO', 'NSL-KDD feature extractor: READY'],
    ['INFO', 'CICIDS2017 signature database: LOADED (2.3M rules)'],
    ['INFO', 'Network interface eth0: bound successfully'],
    ['INFO', 'Packet capture engine: ACTIVE'],
    ['INFO', 'AI classification engine: ONLINE'],
    ['RESP', 'Real-time monitoring loop: STARTED'],
    ['INFO', 'Auto-response module: ARMED'],
    ['RESP', 'All systems operational — monitoring initiated'],
  ];
  bootMessages.forEach((m, i) => {
    setTimeout(() => addLog(m[0], m[1]), i * 120);
  });
}

// ═══════════════════════════════════════════
// MAIN SCAN LOOP
// ═══════════════════════════════════════════
function startScanLoop() {
  if (State.scanIntervalId) clearInterval(State.scanIntervalId);
  if (!State.isRunning) return;
  State.scanIntervalId = setInterval(runScanCycle, State.scanInterval);
}

function stopSimulation() {
  State.isRunning = false;
  if (State.scanIntervalId) { clearInterval(State.scanIntervalId); State.scanIntervalId = null; }
  addLog('WARN', '[SYSTEM] Simulation STOPPED by user — monitoring paused');
  updateToggleBtn();
  const badge = document.getElementById('monitor-label');
  if (badge) badge.textContent = 'Monitoring Paused';
  const dot = document.querySelector('.monitor-badge .pulse-dot');
  if (dot) { dot.style.background = 'var(--neon-yellow)'; dot.style.boxShadow = '0 0 6px var(--neon-yellow)'; }
}

function resumeSimulation() {
  State.isRunning = true;
  startScanLoop();
  addLog('RESP', '[SYSTEM] Simulation RESUMED — monitoring active');
  updateToggleBtn();
  const badge = document.getElementById('monitor-label');
  if (badge) badge.textContent = 'System Monitoring';
  const dot = document.querySelector('.monitor-badge .pulse-dot');
  if (dot) { dot.style.background = ''; dot.style.boxShadow = ''; }
}

function toggleSimulation() {
  State.isRunning ? stopSimulation() : resumeSimulation();
}

function updateToggleBtn() {
  const btn = document.getElementById('sim-toggle-btn');
  if (!btn) return;
  if (State.isRunning) {
    btn.textContent = '⏹ Stop';
    btn.classList.remove('btn-resume');
    btn.classList.add('btn-stop');
  } else {
    btn.textContent = '▶ Resume';
    btn.classList.remove('btn-stop');
    btn.classList.add('btn-resume');
  }
}

async function runScanCycle() {
  try {
    const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000/api/network' 
        : `http://${window.location.hostname}:8000/api/network`;
        
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("API Network error");
    const data = await res.json();
    
    // Update total traffic from real backend absolutes
    if (data.total_packets) {
        State.totalTraffic = data.total_packets;
    }

    // Process new events stream from real backend connections
    if (data.connections && data.connections.length > 0) {
      const eventCount = Math.min(Math.floor(Math.random() * 4) + 1, data.connections.length);
      const shuffled = data.connections.sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < eventCount; i++) {
        const conn = shuffled[i];
        const event = AIEngine.classify();
        
        // Inject real network connection data into AI classifier output
        event.sourceIP = conn.remote_ip || event.sourceIP;
        event.port = conn.remote_port || event.port;
        if (conn.local_port) {
            event.destIP = 'localhost:' + conn.local_port;
        }
        
        // Default safe connections instead of throwing random attacks for all local packets
        // Unless it rolls an attack, then use the simulated type
        processEvent(event, i * 150);
      }
    } else {
      // In case there are no active connections but system is running
      const event = AIEngine.classify();
      processEvent(event, 0);
    }

    // Override the generic delta to show the true backend rate
    const deltaEl = document.getElementById('m-traffic-delta');
    if (deltaEl) {
        deltaEl.textContent = `+${data.packets_per_sec.toLocaleString()}/s live`;
    }

  } catch (err) {
    console.warn("Backend API unavailable. Falling back to local AI simulator.");
    const eventCount = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < eventCount; i++) {
      State.totalTraffic++; // Fallback increment
      const event = AIEngine.classify();
      processEvent(event, i * 150);
    }
  }
}

function processEvent(event, delay = 0) {
  setTimeout(() => {
    // Note: State.totalTraffic is primarily managed by the backend Absolute values now.
    // So we don't increment it here. (Unless we fallback to simulated)

    if (event.category === 'safe') State.safeCount++;
    else if (event.category === 'suspicious') State.suspiciousCount++;
    else if (event.category === 'attack') State.attackCount++;

    // Update streams
    addStreamItem(event);

    if (event.category !== 'safe') {
      State.threatsDetected++;
      addAlertItem(event);
      addToAlertsTable(event);
      logThreat(event);

      if (State.autoResponse && event.category === 'attack') {
        setTimeout(() => autoRespond(event), 800 + Math.random() * 1200);
      }
    } else {
      addLog('INFO', `[${event.sourceIP}→${event.destIP}] ${event.threat.name} — ${event.threat.protocol} — ${event.packetCount} pkts — SAFE (${event.confidence}%)`);
    }

    // Update metrics
    updateMetrics();
    updateCharts(event);
    updateSystemStatus();
    updateHomeStats();
  }, delay);
}

// ═══════════════════════════════════════════
// STREAM MONITOR
// ═══════════════════════════════════════════
function addStreamItem(event) {
  const container = document.getElementById('monitor-stream');
  if (!container) return;

  const time = event.timestamp.toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const div = document.createElement('div');
  div.className = `stream-item ${event.category}`;

  const catLabel = { safe: '✓ SAFE', suspicious: '⚠ SUSP', attack: '✖ ATTK' }[event.category];
  div.innerHTML = `
    <span class="stream-time">${time}</span>
    <span>${catLabel}</span>
    <span>${event.threat.protocol}</span>
    <span style="font-size:10px;color:var(--text-muted)">${event.sourceIP}</span>
    <span style="font-size:10px;color:var(--text-muted);margin-left:auto">${event.threat.name}</span>
  `;
  container.prepend(div);
  while (container.children.length > 60) container.removeChild(container.lastChild);
}

// ═══════════════════════════════════════════
// ALERT FEED (Dashboard Panel)
// ═══════════════════════════════════════════
function addAlertItem(event) {
  const container = document.getElementById('alert-feed');
  if (!container) return;

  const div = document.createElement('div');
  const severityClass = event.category === 'attack' ? 'critical' : 'warning';
  const dotClass = event.category === 'attack' ? 'red' : 'yellow';
  div.className = `alert-item ${severityClass}`;
  div.innerHTML = `
    <div class="alert-dot ${dotClass}"></div>
    <div class="alert-text">
      <strong>${event.threat.name}</strong><br/>
      <span style="font-family:var(--font-mono);font-size:10px">${event.sourceIP}</span>
      <span style="font-size:10px;color:var(--text-muted)"> · ${event.confidence}% conf.</span>
    </div>
  `;
  container.prepend(div);
  while (container.children.length > 20) container.removeChild(container.lastChild);

  // Update badge
  const badge = document.getElementById('alert-badge');
  const count = document.getElementById('panel-alert-count');
  const activeCount = container.children.length;
  if (badge) { badge.textContent = State.threatsDetected; badge.setAttribute('data-count', State.threatsDetected); }
  if (count) count.textContent = activeCount;

  // Show toast
  if (State.alertsEnabled) {
    if (State.critOnlyAlerts && event.category !== 'attack') return;
    showToast(event);
  }
}

// ═══════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════
function showToast(event) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const typeMap = {
    attack:     { cls: 'toast-critical', icon: '🚨' },
    suspicious: { cls: 'toast-warning',  icon: '⚠️' },
    safe:       { cls: 'toast-success',  icon: '✅' },
  };
  const { cls, icon } = typeMap[event.category];

  const toast = document.createElement('div');
  toast.className = `toast ${cls}`;
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-title">${event.category === 'attack' ? '⚡ Attack Detected!' : '⚠ Suspicious Activity'}</div>
      <div class="toast-msg">${event.threat.name} · ${event.sourceIP} · ${event.confidence}% confidence</div>
    </div>
    <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 5000);

  // Max 5 toasts
  while (container.children.length > 5) container.removeChild(container.firstChild);
}

// ═══════════════════════════════════════════
// AUTO RESPONSE
// ═══════════════════════════════════════════
function autoRespond(event) {
  const threat = event.threat;
  const action = threat.action || 'IP Blocked';
  const response = threat.response || 'Threat neutralized';

  State.threatsResolved++;

  // Add to response feed
  const container = document.getElementById('response-feed');
  if (container) {
    const div = document.createElement('div');
    div.className = 'resp-item';
    div.innerHTML = `
      <div class="resp-icon">🛡️</div>
      <div>
        <div class="resp-action">${action}</div>
        <div class="resp-detail">${event.sourceIP} · ${response}</div>
      </div>
    `;
    container.prepend(div);
    while (container.children.length > 15) container.removeChild(container.lastChild);
  }

  // Log response
  addLog('RESP', `[AUTO-RESPONSE] ${action}: ${event.sourceIP} — ${threat.name} — ${response}`);

  // Update alerts table row status
  updateAlertRowStatus(event.id, 'RESOLVED');

  updateMetrics();
  updateAlertsPageCounts();
}

// ═══════════════════════════════════════════
// ALERTS TABLE (Full Page)
// ═══════════════════════════════════════════
function addToAlertsTable(event) {
  State.allAlerts.push(event);
  const tbody = document.getElementById('alerts-table-body');
  if (!tbody) return;
  renderAlertRow(event, tbody, true);
  updateAlertsPageCounts();
}

function renderAlertRow(event, tbody, prepend = false) {
  const tr = document.createElement('tr');
  tr.id = `alert-row-${event.id}`;
  tr.setAttribute('data-category', event.category);

  const sev = event.category === 'attack'
    ? `<span class="sev-badge sev-critical">🔴 CRITICAL</span>`
    : `<span class="sev-badge sev-warning">🟡 WARNING</span>`;
  const status = `<span class="status-detected" id="status-${event.id}">⏳ Detected</span>`;
  const action = event.threat.action ? `<span style="color:var(--text-muted);font-size:12px">${event.threat.action}</span>` : '—';

  tr.innerHTML = `
    <td class="mono">${event.timestamp.toLocaleTimeString()}</td>
    <td><strong>${event.threat.name}</strong></td>
    <td class="mono" style="color:var(--neon-blue)">${event.sourceIP}</td>
    <td>${sev}</td>
    <td>${status}</td>
    <td>${action}</td>
  `;
  if (prepend) tbody.insertBefore(tr, tbody.firstChild);
  else tbody.appendChild(tr);

  // Keep max 100 rows
  while (tbody.children.length > 100) tbody.removeChild(tbody.lastChild);
}

function updateAlertRowStatus(eventId, status) {
  const el = document.getElementById(`status-${eventId}`);
  if (el) {
    el.className = 'status-resolved';
    el.textContent = '✅ Resolved';
  }
}

function filterAlerts(filter, btn) {
  State.currentAlertFilter = filter;
  document.querySelectorAll('#view-alerts .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const rows = document.querySelectorAll('#alerts-table-body tr');
  rows.forEach(row => {
    const cat = row.getAttribute('data-category');
    const statusEl = row.querySelector('[id^="status-"]');
    const isResolved = statusEl && statusEl.classList.contains('status-resolved');

    let show = true;
    if (filter === 'critical') show = cat === 'attack';
    else if (filter === 'warning') show = cat === 'suspicious';
    else if (filter === 'resolved') show = isResolved;

    row.style.display = show ? '' : 'none';
  });
}

function updateAlertsPageCounts() {
  const critCount  = State.allAlerts.filter(a => a.category === 'attack').length;
  const warnCount  = State.allAlerts.filter(a => a.category === 'suspicious').length;
  const resCount   = State.threatsResolved;

  const c = document.getElementById('alerts-critical-count');
  const w = document.getElementById('alerts-warning-count');
  const r = document.getElementById('alerts-resolved-count');
  if (c) c.textContent = `${critCount} Critical`;
  if (w) w.textContent = `${warnCount} Warnings`;
  if (r) r.textContent = `${resCount} Resolved`;
}

// ═══════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════
function addLog(level, message) {
  const entry = { timestamp: new Date(), level, message };
  State.allLogs.push(entry);

  const container = document.getElementById('logs-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `log-entry`;
  div.setAttribute('data-level', level);

  const msgClass = level === 'CRIT' ? 'crit' : level === 'WARN' ? 'warn' : level === 'RESP' ? 'resp' : '';
  div.innerHTML = `
    <span class="log-ts">${entry.timestamp.toLocaleTimeString('en', { hour12: false })}</span>
    <span class="log-level ${level}">${level}</span>
    <span class="log-msg ${msgClass}">${message}</span>
  `;
  container.insertBefore(div, container.firstChild);

  while (container.children.length > 500) container.removeChild(container.lastChild);

  // Apply current filter
  if (State.currentLogFilter !== 'all' && level !== State.currentLogFilter) {
    div.style.display = 'none';
  }
}

function logThreat(event) {
  const level = event.category === 'attack' ? 'CRIT' : 'WARN';
  const msg = `[THREAT] ${event.category.toUpperCase()} – ${event.threat.name} | SRC:${event.sourceIP} → DST:${event.destIP} | Protocol:${event.threat.protocol} | Confidence:${event.confidence}% | Port:${event.port}`;
  addLog(level, msg);
}

function filterLogs(filter, btn) {
  State.currentLogFilter = filter;
  document.querySelectorAll('#view-logs .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const entries = document.querySelectorAll('.log-entry');
  entries.forEach(entry => {
    const lvl = entry.getAttribute('data-level');
    entry.style.display = (filter === 'all' || lvl === filter) ? '' : 'none';
  });
}

function clearLogs() {
  const container = document.getElementById('logs-container');
  if (container) container.innerHTML = '';
  State.allLogs = [];
  addLog('INFO', 'Log buffer cleared by user');
}

// ═══════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════
function updateMetrics() {
  setText('m-traffic', State.totalTraffic.toLocaleString());
  setText('m-threats', State.threatsDetected.toLocaleString());
  setText('m-resolved', State.threatsResolved.toLocaleString());

  const resolveRate = State.threatsDetected > 0
    ? Math.round((State.threatsResolved / State.threatsDetected) * 100) : 0;
  setText('m-traffic-delta', `+${Math.floor(State.totalTraffic / Math.max(1, (Date.now() - State.startTime) / 1000))}/s avg`);
  setText('m-threats-delta', `+${State.threatsDetected} total`);
  setText('m-resolved-delta', `${resolveRate}% rate`);
}

function updateSystemStatus() {
  const now = Date.now();
  const recentWindow = 30000; // 30 sec
  const recentAttacks = State.allAlerts.filter(
    a => a.category === 'attack' && (now - a.timestamp.getTime()) < recentWindow
  ).length;
  const recentSuspicious = State.allAlerts.filter(
    a => a.category === 'suspicious' && (now - a.timestamp.getTime()) < recentWindow
  ).length;

  const badge = document.getElementById('threat-level-badge');
  const statusText = document.getElementById('threat-level-text');
  const statusIcon = document.getElementById('status-icon');
  const mStatus = document.getElementById('m-status');
  const mStatusDelta = document.getElementById('m-status-delta');
  const statusCard = document.getElementById('system-status-card');
  const metricIcon = statusCard ? statusCard.querySelector('.metric-icon') : null;
  const sidebarStatus = document.getElementById('sidebar-status-dot');
  const sidebarStatusEl = document.querySelector('.sidebar-status');
  const sidebarTitle = document.getElementById('sidebar-status-title');
  const sidebarSub = document.getElementById('sidebar-status-sub');

  let status, statusClass;
  if (recentAttacks >= 3) {
    status = { label: 'UNDER ATTACK', icon: '🚨', class: 'danger', color: 'var(--neon-red)', sub: `${recentAttacks} active attacks`, levelClass: 'danger' };
  } else if (recentAttacks >= 1 || recentSuspicious >= 5) {
    status = { label: 'WARNING', icon: '⚠️', class: 'warning', color: 'var(--neon-yellow)', sub: 'Elevated threat level', levelClass: 'warning' };
  } else {
    status = { label: 'SECURE', icon: '✅', class: 'secure', color: 'var(--neon-green)', sub: 'All clear', levelClass: '' };
  }

  if (badge) { badge.className = `threat-level-badge ${status.levelClass}`; }
  if (statusText) statusText.textContent = status.label;
  if (statusIcon) { statusIcon.textContent = status.icon; statusIcon.className = `metric-icon ${status.class === 'danger' ? 'red' : status.class === 'warning' ? 'yellow' : 'green'}`; }
  if (mStatus) { mStatus.textContent = status.label; mStatus.style.color = status.color; }
  if (mStatusDelta) { mStatusDelta.textContent = status.sub; mStatusDelta.className = `metric-delta ${status.class === 'secure' ? 'positive' : 'negative'}`; }
  if (sidebarStatusEl) { sidebarStatusEl.className = `sidebar-status ${status.class === 'secure' ? '' : status.class}`; }
  if (sidebarTitle) { sidebarTitle.textContent = status.class === 'secure' ? 'Monitoring Active' : status.label; }
  if (sidebarSub) { sidebarSub.textContent = status.sub; }

  // Pulse dot color
  if (sidebarStatus) {
    sidebarStatus.style.background = status.color;
    sidebarStatus.style.boxShadow = `0 0 6px ${status.color}`;
  }
}

function updateCharts(event) {
  const value = Math.floor(Math.random() * 120) + 40;
  ChartManager.updateTrafficChart(value);
  ChartManager.updatePieChart(State.safeCount, State.suspiciousCount, State.attackCount);
  if (event.category !== 'safe') ChartManager.updateFreqChart(event.threat.name);
}

function updateHomeStats() {
  const t = document.getElementById('home-stat-traffic');
  const th = document.getElementById('home-stat-threats');
  if (t) t.textContent = State.totalTraffic.toLocaleString();
  if (th) th.textContent = State.threatsResolved.toLocaleString();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ═══════════════════════════════════════════
// SETTINGS HANDLERS
// ═══════════════════════════════════════════
function toggleTheme(checkbox) {
  document.body.setAttribute('data-theme', checkbox.checked ? 'dark' : 'light');
}
function toggleGlow(checkbox) {
  State.glowEnabled = checkbox.checked;
  document.body.style.setProperty('--shadow-glow-green', checkbox.checked ? '0 0 20px rgba(0,255,136,0.3)' : 'none');
  document.body.style.setProperty('--shadow-glow-red', checkbox.checked ? '0 0 20px rgba(255,51,102,0.3)' : 'none');
}
function toggleAlerts(checkbox) {
  State.alertsEnabled = checkbox.checked;
  addLog('INFO', `Toast alerts ${checkbox.checked ? 'enabled' : 'disabled'}`);
}
function toggleCritOnly(checkbox) {
  State.critOnlyAlerts = checkbox.checked;
  addLog('INFO', `Alert mode: ${checkbox.checked ? 'Critical only' : 'All threats'}`);
}
function toggleAutoResponse(checkbox) {
  State.autoResponse = checkbox.checked;
  addLog('RESP', `Auto-response ${checkbox.checked ? 'ARMED' : 'DISARMED'}`);
}
function setSensitivity(level) {
  State.currentSensitivity = level;
  AIEngine.setSensitivity(level);
  addLog('INFO', `AI detection sensitivity set to: ${level.toUpperCase()}`);
}
function setInterval_custom(ms) {
  State.scanInterval = parseInt(ms);
  startScanLoop();
  addLog('INFO', `Scan interval changed to ${ms}ms`);
}

// ═══════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════
window.addEventListener('load', () => {
  // initHeroCanvas() replaced by js/circuit-video.js (new canvas id: circuit-video-bg)
  
  // We've replaced particlesJS with a higher-fidelity custom circuit background (js/circuit-video.js)


  // Animate hero stats on home
  let counter = 0;
  const homeInterval = setInterval(() => {
    const el = document.getElementById('home-stat-traffic');
    if (el) el.textContent = (counter * 127).toLocaleString();
    counter++;
    if (counter > 20) clearInterval(homeInterval);
  }, 50);

  // Redundant scroll observer removed to prevent conflict with js/home-sections.js
});
