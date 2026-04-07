/**
 * CyberShield AI – Security Assessment & Reports Engine
 * Pulls live data from the shared State object every 30s,
 * computes a Security Score, Risk Level, and AI summary.
 * Provides Generate Report & Export (PDF / TXT) features.
 */

const ReportsEngine = (() => {

  /* ── internal chart instances ── */
  let reportTrendChart   = null;
  let reportSeverityChart = null;
  let reportInitialized  = false;
  let reportRefreshTimer = null;

  /* ── Threat-type category keys used by AIEngine ── */
  const THREAT_LABELS = ['DDoS Attack','Brute Force Attempt','Port Scan','SQL Injection',
    'Ransomware C2','Botnet Traffic','DNS Exfiltration','MITM Attack','Shellcode Inject',
    'Anomalous Traffic','Slow Scan','Unusual Beacon'];

  /* ═══════════════════════════════════════════
     DATA GATHERING – pulls from shared State
  ═══════════════════════════════════════════ */
  function gatherData() {
    const now = Date.now();
    const window30  = 30_000;
    const window300 = 300_000; // 5 min

    const allAlerts    = State.allAlerts || [];
    const allResponses = State.allResponses || [];

    // Core counters
    const totalTraffic     = State.totalTraffic  || 0;
    const totalThreats     = State.threatsDetected || 0;
    const resolvedThreats  = State.threatsResolved || 0;
    const unresolvedThreats= Math.max(0, totalThreats - resolvedThreats);
    const activeThreats    = allAlerts.filter(
      a => a.category !== 'safe' && (now - new Date(a.timestamp).getTime()) < window30
    ).length;

    // Severity breakdown from alerts
    const sevCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    allAlerts.forEach(a => {
      if (a.category === 'suspicious') {
        sevCounts.medium++;
      } else if (a.category === 'attack') {
        const name = (a.threat && a.threat.name) || '';
        if (['DDoS Attack','SQL Injection','MITM Attack','Shellcode Inject','Ransomware C2'].some(n => name.includes(n.split(' ')[0]))) {
          sevCounts.critical++;
        } else {
          sevCounts.high++;
        }
      } else {
        sevCounts.low++;
      }
    });

    // Threat type distribution
    const typeCounts = {};
    THREAT_LABELS.forEach(l => typeCounts[l] = 0);
    allAlerts.forEach(a => {
      if (a.threat && a.threat.name && typeCounts[a.threat.name] !== undefined) {
        typeCounts[a.threat.name]++;
      }
    });

    // Recent attacks timeline (last 20)
    const recentAttacks = allAlerts
      .filter(a => a.category !== 'safe')
      .slice(-20).reverse();

    // Trend data (last 10 intervals of 30s each)
    const trendData = buildTrendData(allAlerts, 10, window30);

    return {
      totalTraffic, totalThreats, resolvedThreats,
      unresolvedThreats, activeThreats,
      sevCounts, typeCounts, recentAttacks, trendData,
      reportTime: new Date(),
    };
  }

  /* Build last N buckets of 30s each */
  function buildTrendData(allAlerts, buckets, bucketMs) {
    const now = Date.now();
    const result = Array.from({ length: buckets }, (_, i) => ({
      label: formatBucketLabel(now - (buckets - 1 - i) * bucketMs),
      threats: 0,
      attacks: 0,
    }));
    allAlerts.forEach(a => {
      const age = now - new Date(a.timestamp).getTime();
      const idx = buckets - 1 - Math.floor(age / bucketMs);
      if (idx >= 0 && idx < buckets) {
        result[idx].threats++;
        if (a.category === 'attack') result[idx].attacks++;
      }
    });
    return result;
  }

  function formatBucketLabel(ts) {
    return new Date(ts).toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }

  /* ═══════════════════════════════════════════
     SCORE & RISK LEVEL CALCULATION
  ═══════════════════════════════════════════ */
  function calcScore(data) {
    let score = 100;

    // Deductions based on severity
    score -= Math.min(40, data.sevCounts.critical * 5);
    score -= Math.min(20, data.sevCounts.high     * 2);
    score -= Math.min(10, data.sevCounts.medium   * 0.5);

    // Active threats penalty
    score -= Math.min(20, data.activeThreats * 4);

    // Unresolved threats penalty
    if (data.totalThreats > 0) {
      const unresolvedRatio = data.unresolvedThreats / data.totalThreats;
      score -= Math.round(unresolvedRatio * 10);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function getRiskLevel(score) {
    if (score >= 75) return { label: 'SAFE',       color: '#00ff88', cls: 'risk-safe',     icon: '🟢' };
    if (score >= 45) return { label: 'MODERATE',   color: '#ffd60a', cls: 'risk-moderate', icon: '🟡' };
    return               { label: 'HIGH RISK',   color: '#ff3366', cls: 'risk-high',     icon: '🔴' };
  }

  /* ═══════════════════════════════════════════
     AI SUMMARY GENERATOR
  ═══════════════════════════════════════════ */
  function generateAISummary(data, score) {
    const risk = getRiskLevel(score);
    const topThreat = Object.entries(data.typeCounts).sort((a,b) => b[1]-a[1])[0];
    const topName   = topThreat && topThreat[1] > 0 ? topThreat[0] : null;

    if (score >= 85) {
      return `✅ The system is currently operating within safe parameters. All ${data.resolvedThreats.toLocaleString()} detected incidents have been mitigated. Automated response systems are performing optimally with no active threats in the current monitoring window.`;
    }
    if (score >= 65) {
      const hint = topName ? ` Recurring pattern of <strong>${topName}</strong> activity observed.` : '';
      return `🟡 The system is under <strong>moderate threat level</strong>. ${data.activeThreats} active incidents are being monitored.${hint} Automated containment is active. Recommend reviewing unresolved alerts and tightening firewall rules.`;
    }
    if (score >= 40) {
      const hint = topName ? ` Primary vector: <strong>${topName}</strong> (${data.typeCounts[topName]} detections).` : '';
      return `⚠️ Elevated risk detected across the network.${hint} ${data.sevCounts.critical} critical and ${data.sevCounts.high} high-severity threats are present. Immediate review of isolation policies is recommended. Auto-response has neutralized ${data.resolvedThreats} threats.`;
    }
    const hint = topName ? ` Dominant attack type: <strong>${topName}</strong>.` : '';
    return `🚨 <strong>CRITICAL THREAT LEVEL</strong> — The system is currently under active sustained attack.${hint} ${data.sevCounts.critical} critical severity events detected. ${data.unresolvedThreats} threats remain unresolved. Immediate manual intervention and incident escalation are strongly advised.`;
  }

  /* ═══════════════════════════════════════════
     UI – RENDER REPORT
  ═══════════════════════════════════════════ */
  function renderReport() {
    const data  = gatherData();
    const score = calcScore(data);
    const risk  = getRiskLevel(score);
    const aiSummary = generateAISummary(data, score);

    updateMetricCards(data);
    updateScoreDisplay(score, risk);
    updateThreatTypes(data.typeCounts);
    updateSeverityBars(data.sevCounts);
    updateRecentAttacksTable(data.recentAttacks);
    updateAISummaryBox(aiSummary, risk);
    updateCharts(data);
    updateAISummaryBox(aiSummary, risk);
    updateCharts(data);
    updateSystemUsageTable(State.allAlerts || []);
    updateLastRefreshTime();
  }

  function updateMetricCards(data) {
    setText('r-total-traffic',   data.totalTraffic.toLocaleString());
    setText('r-total-threats',   data.totalThreats.toLocaleString());
    setText('r-active-threats',  data.activeThreats.toLocaleString());
    setText('r-resolved',        data.resolvedThreats.toLocaleString());
    setText('r-unresolved',      data.unresolvedThreats.toLocaleString());

    // Mini stats in score card
    setText('rs-active',   data.activeThreats);
    setText('rs-critical', data.sevCounts.critical);
    const rate = data.totalThreats > 0
      ? Math.round((data.resolvedThreats / data.totalThreats) * 100) + '%'
      : '—';
    setText('rs-rate', rate);

    // Uptime from main State
    const secs = Math.floor((Date.now() - (State.startTime || Date.now())) / 1000);
    const h = String(Math.floor(secs / 3600)).padStart(2,'0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2,'0');
    const s = String(secs % 60).padStart(2,'0');
    setText('rs-uptime', `${h}:${m}:${s}`);
  }

  function updateScoreDisplay(score, risk) {
    const scoreEl  = document.getElementById('r-score-value');
    const labelEl  = document.getElementById('r-risk-label');
    const ringEl   = document.getElementById('r-score-ring');
    const iconEl   = document.getElementById('r-risk-icon');

    if (scoreEl) {
      scoreEl.textContent = score;
      scoreEl.style.color = risk.color;
    }
    if (labelEl) {
      labelEl.textContent = risk.label;
      labelEl.className   = `risk-label ${risk.cls}`;
    }
    if (iconEl) { iconEl.textContent = risk.icon; }

    // Animated ring
    if (ringEl) {
      const circumference = 2 * Math.PI * 54; // r=54
      const offset = circumference * (1 - score / 100);
      ringEl.style.strokeDasharray  = circumference;
      ringEl.style.strokeDashoffset = offset;
      ringEl.style.stroke = risk.color;
    }
  }

  function updateThreatTypes(typeCounts) {
    const container = document.getElementById('r-threat-types');
    if (!container) return;
    const entries = Object.entries(typeCounts).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
    if (entries.length === 0) {
      container.innerHTML = '<div class="r-empty">No threats detected yet</div>';
      return;
    }
    const max = entries[0][1];
    container.innerHTML = entries.map(([name, count]) => {
      const pct = Math.round((count / max) * 100);
      const color = getThreatColor(name);
      return `
        <div class="r-type-row">
          <div class="r-type-name">${name}</div>
          <div class="r-type-bar-wrap">
            <div class="r-type-bar" style="width:${pct}%;background:${color};box-shadow:0 0 8px ${color}40"></div>
          </div>
          <div class="r-type-count">${count}</div>
        </div>`;
    }).join('');
  }

  function getThreatColor(name) {
    const n = name.toLowerCase();
    if (n.includes('ddos') || n.includes('ransomware') || n.includes('sql') || n.includes('shellcode') || n.includes('mitm')) return '#ff3366';
    if (n.includes('brute') || n.includes('botnet') || n.includes('dns')) return '#a855f7';
    if (n.includes('port') || n.includes('slow') || n.includes('anomal') || n.includes('unusual')) return '#ffd60a';
    return '#00b4ff';
  }

  function updateSeverityBars(sevCounts) {
    const total = sevCounts.low + sevCounts.medium + sevCounts.high + sevCounts.critical || 1;
    const items = [
      { key: 'critical', label: 'Critical', color: '#ff3366' },
      { key: 'high',     label: 'High',     color: '#ff7c3c' },
      { key: 'medium',   label: 'Medium',   color: '#ffd60a' },
      { key: 'low',      label: 'Low',      color: '#00ff88' },
    ];
    items.forEach(({ key, label, color }) => {
      const count = sevCounts[key];
      const pct   = Math.round((count / total) * 100);
      setBar(`r-sev-${key}`, pct, color, count);
    });
  }

  function setBar(id, pct, color, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.sev-fill').style.width = `${pct}%`;
    el.querySelector('.sev-fill').style.background = color;
    el.querySelector('.sev-fill').style.boxShadow  = `0 0 8px ${color}50`;
    el.querySelector('.sev-count').textContent = count;
    el.querySelector('.sev-pct').textContent   = `${pct}%`;
  }

  function updateRecentAttacksTable(attacks) {
    const tbody = document.getElementById('r-attacks-tbody');
    if (!tbody) return;
    if (attacks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No threat data yet — monitoring is active.</td></tr>`;
      return;
    }
    tbody.innerHTML = attacks.map(a => {
      const sev    = a.category === 'attack' ? '<span class="sev-badge sev-critical">🔴 Critical</span>' : '<span class="sev-badge sev-warning">🟡 Medium</span>';
      const status = a.resolved
        ? '<span class="r-status-resolved">✅ Resolved</span>'
        : '<span class="r-status-active">⏳ Active</span>';
      const ts   = new Date(a.timestamp).toLocaleTimeString('en', { hour12: false });
      const name = (a.threat && a.threat.name) || 'Unknown';
      const ip   = a.sourceIP || '—';
      const act  = (a.threat && a.threat.action) || '—';
      return `<tr>
        <td class="mono">${ts}</td>
        <td><strong>${name}</strong></td>
        <td>${sev}</td>
        <td>${status}</td>
        <td class="mono" style="color:var(--neon-blue)">${ip}</td>
        <td style="font-size:12px;color:var(--text-muted)">${act}</td>
      </tr>`;
    }).join('');
  }

  function updateSystemUsageTable(allAlerts) {
    const tbody = document.getElementById('system-usage-tbody');
    const counterEl = document.getElementById('total-systems-count');
    if (!tbody) return;
    
    // Simulate unique system usage records based on history
    const systems = [
      { name: 'SEC-CORE-01', os: 'Linux Ubuntu', status: 'Active', risk: 'Low' },
      { name: 'DEV-WORKSTATION', os: 'Windows 11', status: 'Completed', risk: 'Low' },
      { name: 'WEB-SERVER-ALPHA', os: 'Linux CentOS', status: 'Active', risk: 'Medium' },
      { name: 'SOC-MONITOR-04', os: 'Windows 10', status: 'Offline', risk: 'Low' },
      { name: 'REMOTE-NODE-99', os: 'macOS Monterey', status: 'Completed', risk: 'High' }
    ];

    // Combine with real recent alerts to simulate current usage context
    const recentScans = [...allAlerts].reverse().slice(0, 15);
    
    // Total systems count simulation
    if (counterEl) {
      counterEl.textContent = (systems.length + Math.floor(recentScans.length / 3)).toString();
    }

    if (recentScans.length === 0 && systems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Awaiting deployment logs...</td></tr>`;
      return;
    }

    // Map real alerts to "System Usage" records for a live feel
    const usageHtml = recentScans.map((s, idx) => {
      const ts = new Date(s.timestamp).toLocaleTimeString('en', { hour12: false });
      const date = new Date(s.timestamp).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'});
      const ip = s.sourceIP || '—';
      
      // Cycle through some plausible OS types
      const osList = ['Linux Ubuntu', 'Windows 11', 'Windows Server', 'Linux Debian'];
      const os = osList[idx % osList.length];
      
      // Derive status from activity
      const status = s.category === 'attack' ? 'Active' : (idx % 3 === 0 ? 'Completed' : 'Active');
      
      let riskTag = '';
      if (s.category === 'safe') riskTag = '<span class="tag tag-green">🟢 Low</span>';
      else if (s.category === 'suspicious') riskTag = '<span class="tag tag-yellow">🟡 Medium</span>';
      else riskTag = '<span class="tag tag-red">🔴 High</span>';

      const statusClass = status.toLowerCase();
      
      return `<tr>
        <td>${date}, ${ts}</td>
        <td>NODE-${ip.split('.').pop() || '00'}</td>
        <td style="font-family: monospace; color: var(--neon-cyan);">${ip}</td>
        <td>${os}</td>
        <td><span class="status-tag status-${statusClass}">${status}</span></td>
        <td>${riskTag}</td>
      </tr>`;
    }).join('');

    // Prepend the base system records for richness
    const staticHtml = systems.map(sys => {
      const riskTag = sys.risk === 'Low' ? '<span class="tag tag-green">🟢 Low</span>' : 
                     (sys.risk === 'Medium' ? '<span class="tag tag-yellow">🟡 Medium</span>' : '<span class="tag tag-red">🔴 High</span>');
      const statusClass = sys.status.toLowerCase();
      return `<tr>
        <td>Today, 09:00:00</td>
        <td>${sys.name}</td>
        <td style="font-family: monospace; color: var(--neon-cyan);">Internal Network</td>
        <td>${sys.os}</td>
        <td><span class="status-tag status-${statusClass}">${sys.status}</span></td>
        <td>${riskTag}</td>
      </tr>`;
    }).join('');

    tbody.innerHTML = usageHtml + staticHtml;
  }

  function updateAISummaryBox(summary, risk) {
    const el = document.getElementById('r-ai-summary');
    if (el) {
      el.innerHTML = summary;
      el.className = `r-ai-summary-text ${risk.cls}`;
    }
  }

  function updateLastRefreshTime() {
    const el = document.getElementById('r-last-refresh');
    if (el) el.textContent = `Last updated: ${new Date().toLocaleTimeString('en', { hour12: false })}`;
  }

  function updateCharts(data) {
    updateTrendChart(data.trendData);
    updateSeverityChart(data.sevCounts);
  }

  /* ═══════════════════════════════════════════
     CHARTS
  ═══════════════════════════════════════════ */
  function initReportCharts() {
    initReportTrendChart();
    initReportSeverityChart();
  }

  function initReportTrendChart() {
    const canvas = document.getElementById('r-trend-chart');
    if (!canvas || reportTrendChart) return;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(0,180,255,0.25)');
    grad.addColorStop(1, 'rgba(0,180,255,0)');

    const grad2 = ctx.createLinearGradient(0, 0, 0, 200);
    grad2.addColorStop(0, 'rgba(255,51,102,0.2)');
    grad2.addColorStop(1, 'rgba(255,51,102,0)');

    reportTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Total Threats',
            data: [],
            borderColor: '#00b4ff',
            backgroundColor: grad,
            borderWidth: 2, fill: true, tension: 0.45,
            pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#00b4ff',
          },
          {
            label: 'Attacks',
            data: [],
            borderColor: '#ff3366',
            backgroundColor: grad2,
            borderWidth: 2, fill: true, tension: 0.45,
            pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#ff3366',
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { labels: { usePointStyle: true, font: { size: 12 }, color: '#94a3b8' } },
          tooltip: { backgroundColor: 'rgba(8,11,20,0.95)', borderColor: 'rgba(0,180,255,0.3)', borderWidth: 1, padding: 10 },
        },
        scales: {
          x: { ticks: { font: { size: 10 }, color: '#475569' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { font: { size: 10 }, color: '#475569' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
        },
      },
    });
  }

  function initReportSeverityChart() {
    const canvas = document.getElementById('r-severity-chart');
    if (!canvas || reportSeverityChart) return;
    const ctx = canvas.getContext('2d');

    reportSeverityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: [
            'rgba(255,51,102,0.75)', 'rgba(255,124,60,0.75)',
            'rgba(255,214,10,0.75)', 'rgba(0,255,136,0.65)',
          ],
          borderColor: ['#ff3366', '#ff7c3c', '#ffd60a', '#00ff88'],
          borderWidth: 2, hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 14, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 }, color: '#94a3b8' },
          },
          tooltip: { backgroundColor: 'rgba(8,11,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10 },
        },
        animation: { animateRotate: true, duration: 700 },
      },
    });
  }

  function updateTrendChart(trendData) {
    if (!reportTrendChart) return;
    reportTrendChart.data.labels                = trendData.map(d => d.label);
    reportTrendChart.data.datasets[0].data      = trendData.map(d => d.threats);
    reportTrendChart.data.datasets[1].data      = trendData.map(d => d.attacks);
    reportTrendChart.update();
  }

  function updateSeverityChart(sevCounts) {
    if (!reportSeverityChart) return;
    reportSeverityChart.data.datasets[0].data = [
      sevCounts.critical, sevCounts.high, sevCounts.medium, sevCounts.low
    ];
    reportSeverityChart.update();
  }

  /* ═══════════════════════════════════════════
     GENERATE REPORT BUTTON
  ═══════════════════════════════════════════ */
  function generateReport() {
    const btn = document.getElementById('r-generate-btn');
    if (btn) {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" class="r-spinner">
        <circle cx="12" cy="12" r="10" stroke="#00b4ff" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="0" style="animation: spin 1s linear infinite;" />
      </svg> Fetching raw logs…`;
      btn.disabled = true;
      btn.style.opacity = '0.8';
    }

    setTimeout(() => {
      renderReport();
      if (btn) {
        btn.innerHTML = '✅ Compilation Complete';
        btn.disabled = false;
        btn.style.opacity = '1';
        setTimeout(() => { btn.innerHTML = '⚡ Generate Full Report'; }, 3000);
      }
    }, 850); // slight artificial delay for effect
  }

  /* ═══════════════════════════════════════════
     EXPORT FUNCTIONS
  ═══════════════════════════════════════════ */
  function exportPDF() {
    const data  = gatherData();
    const score = calcScore(data);
    const risk  = getRiskLevel(score);
    const summary = generateAISummary(data, score).replace(/<[^>]+>/g, '');

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CyberShield Security Assessment Report</title>
  <style>
    body { font-family: Arial, sans-serif; background: #080b14; color: #e2e8f0; margin: 0; padding: 32px; }
    h1 { color: #00b4ff; font-size: 28px; border-bottom: 2px solid #00b4ff; padding-bottom: 12px; }
    h2 { color: #00ff88; font-size: 18px; margin-top: 28px; }
    .score { font-size: 60px; font-weight: 900; color: ${risk.color}; }
    .risk  { font-size: 22px; font-weight: 700; color: ${risk.color}; margin-bottom: 20px; }
    table  { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #1e2a3a; padding: 10px 14px; text-align: left; font-size: 13px; }
    th     { background: #0d1117; color: #00b4ff; font-weight: 700; }
    td     { color: #94a3b8; }
    .meta  { font-size: 13px; color: #475569; margin-top: 4px; }
    .summary { background: #0d1117; border-left: 3px solid ${risk.color}; padding: 16px; margin-top: 12px; border-radius: 6px; }
    .metric-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 16px; }
    .metric { background: #0d1117; border: 1px solid #1e2a3a; border-radius: 8px; padding: 16px; }
    .metric-val { font-size: 28px; font-weight: 800; color: #00b4ff; }
    .metric-lbl { font-size: 11px; color: #475569; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>⬡ CyberShield AI – Security Assessment Report</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()} | System: CyberShield AI v2.4.1</p>
  <h2>Security Score</h2>
  <div class="score">${score}/100</div>
  <div class="risk">${risk.icon} ${risk.label}</div>
  <h2>Key Metrics</h2>
  <div class="metric-grid">
    <div class="metric"><div class="metric-val">${data.totalTraffic.toLocaleString()}</div><div class="metric-lbl">Total Traffic Analyzed</div></div>
    <div class="metric"><div class="metric-val">${data.totalThreats.toLocaleString()}</div><div class="metric-lbl">Total Threats Detected</div></div>
    <div class="metric"><div class="metric-val">${data.activeThreats.toLocaleString()}</div><div class="metric-lbl">Active Threats</div></div>
    <div class="metric"><div class="metric-val">${data.resolvedThreats.toLocaleString()}</div><div class="metric-lbl">Resolved Threats</div></div>
    <div class="metric"><div class="metric-val">${data.unresolvedThreats.toLocaleString()}</div><div class="metric-lbl">Unresolved Threats</div></div>
    <div class="metric"><div class="metric-val">${data.sevCounts.critical}</div><div class="metric-lbl">Critical Severity</div></div>
  </div>
  <h2>AI Security Summary</h2>
  <div class="summary">${summary}</div>
  <h2>Recent Attacks</h2>
  <table>
    <thead><tr><th>Timestamp</th><th>Threat Type</th><th>Severity</th><th>Status</th><th>Source IP</th><th>Action Taken</th></tr></thead>
    <tbody>
      ${data.recentAttacks.map(a => `
        <tr>
          <td>${new Date(a.timestamp).toLocaleTimeString('en', { hour12: false })}</td>
          <td>${(a.threat && a.threat.name) || 'Unknown'}</td>
          <td>${a.category === 'attack' ? 'Critical' : 'Medium'}</td>
          <td>${a.resolved ? 'Resolved' : 'Active'}</td>
          <td>${a.sourceIP || '—'}</td>
          <td>${(a.threat && a.threat.action) || '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    setTimeout(() => win.print(), 800);
  }

  function exportTXT() {
    const data  = gatherData();
    const score = calcScore(data);
    const risk  = getRiskLevel(score);
    const summary = generateAISummary(data, score).replace(/<[^>]+>/g, '');
    const line = '─'.repeat(60);

    const lines = [
      '╔══════════════════════════════════════════════════════════╗',
      '║     CyberShield AI — Security Assessment Report          ║',
      '╚══════════════════════════════════════════════════════════╝',
      `Generated : ${new Date().toLocaleString()}`,
      `System    : CyberShield AI v2.4.1 | Model: CyberNet-7B`,
      '',
      line,
      `  SECURITY SCORE : ${score} / 100`,
      `  RISK LEVEL     : ${risk.label}`,
      line,
      '',
      '── KEY METRICS ─────────────────────────────────────────────',
      `  Total Traffic Analyzed : ${data.totalTraffic.toLocaleString()}`,
      `  Total Threats Detected : ${data.totalThreats.toLocaleString()}`,
      `  Active Threats         : ${data.activeThreats}`,
      `  Resolved Threats       : ${data.resolvedThreats}`,
      `  Unresolved Threats     : ${data.unresolvedThreats}`,
      '',
      '── SEVERITY BREAKDOWN ───────────────────────────────────────',
      `  Critical : ${data.sevCounts.critical}`,
      `  High     : ${data.sevCounts.high}`,
      `  Medium   : ${data.sevCounts.medium}`,
      `  Low      : ${data.sevCounts.low}`,
      '',
      '── AI SECURITY SUMMARY ──────────────────────────────────────',
      `  ${summary}`,
      '',
      '── RECENT ATTACKS ───────────────────────────────────────────',
      `  ${'Time'.padEnd(10)} ${'Threat Type'.padEnd(20)} ${'Sev'.padEnd(10)} ${'Status'.padEnd(12)} ${'Source IP'.padEnd(18)} Action`,
      `  ${'─'.repeat(80)}`,
      ...data.recentAttacks.map(a => {
        const ts   = new Date(a.timestamp).toLocaleTimeString('en', { hour12: false });
        const name = ((a.threat && a.threat.name) || 'Unknown').padEnd(20).slice(0, 20);
        const sev  = (a.category === 'attack' ? 'Critical' : 'Medium').padEnd(10);
        const stat = (a.resolved ? 'Resolved' : 'Active').padEnd(12);
        const ip   = (a.sourceIP || '—').padEnd(18);
        const act  = (a.threat && a.threat.action) || '—';
        return `  ${ts.padEnd(10)} ${name} ${sev} ${stat} ${ip} ${act}`;
      }),
      '',
      '═'.repeat(60),
      '  End of Report — CyberShield AI Security Platform',
      '═'.repeat(60),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `cybershield-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ═══════════════════════════════════════════
     INIT & AUTO-REFRESH
  ═══════════════════════════════════════════ */
  function initReports() {
    if (reportInitialized) {
      // Re-render if revisiting
      renderReport();
      return;
    }
    reportInitialized = true;
    initReportCharts();
    renderReport();

    // Auto-refresh every 30 seconds
    if (reportRefreshTimer) clearInterval(reportRefreshTimer);
    reportRefreshTimer = setInterval(() => {
      renderReport();
      startCountdown();
    }, 30_000);
    startCountdown();
  }

  /* Countdown timer in UI */
  let countdownValue = 30;
  let countdownTimer = null;
  function startCountdown() {
    countdownValue = 30;
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      countdownValue--;
      if (countdownValue <= 0) countdownValue = 30;
      const el = document.getElementById('r-countdown');
      if (el) el.textContent = `Auto-refresh in ${countdownValue}s`;
    }, 1000);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Public API ── */
  return { initReports, generateReport, exportPDF, exportTXT };

})();
