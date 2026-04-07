/**
 * CyberShield AI – Chart Manager
 * Manages all Chart.js instances with live data updates
 */

const ChartManager = (() => {
  let trafficChart, threatPieChart, trendChart, freqChart, compareChart, protocolChart;

  // ── Shared chart defaults ──
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Inter', sans-serif";

  const COLORS = {
    green:  { main: '#00ff88', bg: 'rgba(0,255,136,0.15)', border: 'rgba(0,255,136,0.35)' },
    red:    { main: '#ff3366', bg: 'rgba(255,51,102,0.15)', border: 'rgba(255,51,102,0.35)' },
    yellow: { main: '#ffd60a', bg: 'rgba(255,214,10,0.12)', border: 'rgba(255,214,10,0.3)' },
    blue:   { main: '#00b4ff', bg: 'rgba(0,180,255,0.12)', border: 'rgba(0,180,255,0.3)' },
    purple: { main: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)' },
    cyan:   { main: '#06b6d4', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.3)' },
  };

  function makeGradient(ctx, color, height = 200) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, color.bg);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    return g;
  }

  // ── Initial data ──
  const trafficLabels = Array.from({ length: 20 }, (_, i) => {
    const d = new Date(Date.now() - (19 - i) * 2000);
    return d.toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  const trafficData = Array.from({ length: 20 }, () => Math.floor(Math.random() * 150) + 50);

  // ══ TRAFFIC CHART (Line) ══
  function initTrafficChart() {
    const canvas = document.getElementById('trafficChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gradient = makeGradient(ctx, COLORS.blue, 220);

    trafficChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trafficLabels.slice(),
        datasets: [{
          label: 'Traffic (events/s)',
          data: trafficData.slice(),
          borderColor: COLORS.blue.main,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS.blue.main,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: 'rgba(8,11,20,0.95)',
          borderColor: 'rgba(0,180,255,0.3)', borderWidth: 1,
          titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 10,
        }},
        scales: {
          x: {
            ticks: { maxTicksLimit: 6, font: { size: 10 }, color: '#475569' },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            ticks: { font: { size: 10 }, color: '#475569' },
            grid: { color: 'rgba(255,255,255,0.04)' },
            beginAtZero: true,
          },
        },
      },
    });
  }

  // ══ THREAT PIE CHART ══
  function initThreatPieChart() {
    const canvas = document.getElementById('threatPieChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    threatPieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Safe', 'Suspicious', 'Attack'],
        datasets: [{
          data: [100, 0, 0],
          backgroundColor: [COLORS.green.bg, COLORS.yellow.bg, COLORS.red.bg],
          borderColor: [COLORS.green.border, COLORS.yellow.border, COLORS.red.border],
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } },
          },
          tooltip: {
            backgroundColor: 'rgba(8,11,20,0.95)',
            borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
            titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 10,
          },
        },
        animation: { animateRotate: true, duration: 400 },
      },
    });
  }

  // ══ TREND CHART (Analytics) ══
  function initTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
    const attackData = hours.map(() => Math.floor(Math.random() * 12));
    const suspData   = hours.map(() => Math.floor(Math.random() * 30) + 5);

    trendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Attacks',
            data: attackData,
            backgroundColor: COLORS.red.bg,
            borderColor: COLORS.red.border,
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Suspicious',
            data: suspData,
            backgroundColor: COLORS.yellow.bg,
            borderColor: COLORS.yellow.border,
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, font: { size: 11 } } },
          tooltip: { backgroundColor: 'rgba(8,11,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10 },
        },
        scales: {
          x: { stacked: false, ticks: { maxTicksLimit: 8, font: { size: 10 }, color: '#475569' }, grid: { display: false } },
          y: { ticks: { font: { size: 10 }, color: '#475569' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
        },
      },
    });
  }

  // ══ FREQUENCY CHART ══
  function initFreqChart() {
    const canvas = document.getElementById('freqChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    freqChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['DDoS', 'SQL Inj.', 'Port Scan', 'Brute Force', 'Botnet', 'DNS Exfil', 'Ransomware'],
        datasets: [{
          label: 'Detections',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: [
            COLORS.red.bg, COLORS.red.bg, COLORS.yellow.bg,
            COLORS.yellow.bg, COLORS.purple.bg, COLORS.purple.bg, COLORS.red.bg,
          ],
          borderColor: [
            COLORS.red.border, COLORS.red.border, COLORS.yellow.border,
            COLORS.yellow.border, COLORS.purple.border, COLORS.purple.border, COLORS.red.border,
          ],
          borderWidth: 1, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(8,11,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10 } },
        scales: {
          x: { ticks: { font: { size: 10 }, color: '#475569' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
          y: { ticks: { font: { size: 11 }, color: '#94a3b8' }, grid: { display: false } },
        },
        animation: { duration: 300 },
      },
    });
  }

  // ══ COMPARE CHART (Line) ══
  function initCompareChart() {
    const canvas = document.getElementById('compareChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2,'0')}:00`);

    compareChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Safe Traffic',
            data: labels.map(() => Math.floor(Math.random() * 200) + 100),
            borderColor: COLORS.green.main,
            backgroundColor: COLORS.green.bg,
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3,
          },
          {
            label: 'Threats',
            data: labels.map(() => Math.floor(Math.random() * 30)),
            borderColor: COLORS.red.main,
            backgroundColor: COLORS.red.bg,
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, font: { size: 11 } } },
          tooltip: { backgroundColor: 'rgba(8,11,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10 },
        },
        scales: {
          x: { ticks: { font: { size: 10 }, color: '#475569' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { font: { size: 10 }, color: '#475569' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
        },
      },
    });
  }

  // ══ PROTOCOL CHART (Doughnut) ══
  function initProtocolChart() {
    const canvas = document.getElementById('protocolChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    protocolChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['TCP', 'UDP', 'HTTP/S', 'DNS', 'ICMP', 'Other'],
        datasets: [{
          data: [42, 21, 18, 10, 5, 4],
          backgroundColor: [COLORS.blue.bg, COLORS.green.bg, COLORS.cyan.bg, COLORS.yellow.bg, COLORS.purple.bg, COLORS.red.bg],
          borderColor: [COLORS.blue.border, COLORS.green.border, COLORS.cyan.border, COLORS.yellow.border, COLORS.purple.border, COLORS.red.border],
          borderWidth: 2, hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } },
          tooltip: { backgroundColor: 'rgba(8,11,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 10 },
        },
      },
    });
  }

  // ══ Update Functions ══
  function updateTrafficChart(value) {
    if (!trafficChart) return;
    const now = new Date().toLocaleTimeString('en', { hour12: false });
    const data = trafficChart.data;
    if (data.labels.length > 25) { data.labels.shift(); data.datasets[0].data.shift(); }
    data.labels.push(now);
    data.datasets[0].data.push(value);
    trafficChart.update('none');
  }

  function updatePieChart(safe, suspicious, attack) {
    if (!threatPieChart) return;
    threatPieChart.data.datasets[0].data = [safe, suspicious, attack];
    threatPieChart.update('none');
  }

  function updateFreqChart(threatName, increment = 1) {
    if (!freqChart) return;
    const labels = freqChart.data.labels;
    const shortName = threatName.split(' ')[0];

    const labelMap = { DDoS: 0, SQL: 1, Port: 2, Brute: 3, Botnet: 4, DNS: 5, Ransomware: 6 };
    const key = Object.keys(labelMap).find(k => shortName.includes(k) || threatName.includes(k));
    if (key !== undefined) {
      freqChart.data.datasets[0].data[labelMap[key]] += increment;
      freqChart.update('none');
    }
  }

  // ══ Init all ══
  function init() {
    initTrafficChart();
    initThreatPieChart();
    initTrendChart();
    initFreqChart();
    initCompareChart();
    initProtocolChart();
  }

  return { init, updateTrafficChart, updatePieChart, updateFreqChart };

})();
