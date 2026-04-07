const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// AI / Network Engine Simulator (Backend logic)
const THREAT_TYPES = {
  safe: [
    { name: 'Normal HTTP', protocol: 'TCP', weight: 40 },
    { name: 'DNS Query', protocol: 'UDP', weight: 25 },
    { name: 'HTTPS Traffic', protocol: 'TLS', weight: 30 },
    { name: 'ICMP Echo', protocol: 'ICMP', weight: 10 },
  ],
  suspicious: [
    { name: 'Port Scan', protocol: 'TCP', weight: 20, action: 'Monitoring Source' },
    { name: 'Brute Force Attempt', protocol: 'SSH', weight: 15, action: 'Rate Throttling' },
    { name: 'Unusual Beacon', protocol: 'UDP', weight: 10, action: 'Packet Logging' },
    { name: 'Anomalous Traffic', protocol: 'TCP', weight: 12, action: 'Deep Inspection' },
  ],
  attack: [
    { name: 'DDoS Attack', protocol: 'UDP', weight: 15, severity: 'CRITICAL', action: 'IP Blocked', response: 'Traffic null-routed' },
    { name: 'SQL Injection', protocol: 'HTTP', weight: 12, severity: 'CRITICAL', action: 'Connection Terminated', response: 'WAF rules applied' },
    { name: 'Ransomware C2', protocol: 'TCP', weight: 8, severity: 'CRITICAL', action: 'Host Isolated', response: 'Quarantined segment' },
    { name: 'Botnet Traffic', protocol: 'TCP', weight: 10, severity: 'HIGH', action: 'IP Blacklisted', response: 'Sink-holed' },
  ],
};

const IP_PREFIXES = ['192.168.', '10.0.', '64.233.', '185.33.', '91.108.', '45.32.'];

function randomIP() {
  const prefix = IP_PREFIXES[Math.floor(Math.random() * IP_PREFIXES.length)];
  return `${prefix}${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function weightedRandom(items) {
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

let cachedStats = {
  packets_per_sec: 0,
  bytes_per_sec: 0,
  total_packets: 1250000,
  total_bytes: 4500000000,
  events: [] // New events generated since last poll
};

// Generate connections in the background
setInterval(() => {
  const pkts = Math.floor(Math.random() * 1000) + 200;
  cachedStats.packets_per_sec = pkts;
  cachedStats.bytes_per_sec = pkts * 1200;
  cachedStats.total_packets += pkts * 2;
  cachedStats.total_bytes += pkts * 1200 * 2;

  // Generate 1-3 new network events (safe or threats)
  let newEvents = [];
  const count = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let category = 'safe';
    let threatData = weightedRandom(THREAT_TYPES.safe);
    let confidence = 0.90 + Math.random() * 0.08;

    // 15% chance of suspicious, 5% chance of attack
    if (roll < 0.05) {
      category = 'attack';
      threatData = weightedRandom(THREAT_TYPES.attack);
      confidence = 0.85 + Math.random() * 0.14;
    } else if (roll < 0.20) {
      category = 'suspicious';
      threatData = weightedRandom(THREAT_TYPES.suspicious);
      confidence = 0.65 + Math.random() * 0.20;
    }

    newEvents.push({
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      category: category,
      threat: threatData,
      sourceIP: randomIP(),
      destIP: randomIP(),
      port: [80, 443, 22, 53, 3389, 8080][Math.floor(Math.random() * 6)],
      confidence: Math.round(confidence * 100),
      packetCount: Math.floor(Math.random() * 1500) + 1
    });
  }
  
  cachedStats.events = newEvents;

}, 2000);

app.get('/api/network', (req, res) => {
    res.json(cachedStats);
});

const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Backend API Server running on port ${PORT}`);
});
