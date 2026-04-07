/**
 * CyberShield AI – AI Threat Detection Engine
 * Simulates a machine learning-based intrusion detection system
 * Inspired by NSL-KDD and CICIDS2017 dataset characteristics
 */

const AIEngine = (() => {

  // ── Threat taxonomy ──
  const THREAT_TYPES = {
    safe: [
      { name: 'Normal HTTP', protocol: 'TCP', weight: 40 },
      { name: 'DNS Query', protocol: 'UDP', weight: 25 },
      { name: 'HTTPS Traffic', protocol: 'TLS', weight: 30 },
      { name: 'ICMP Echo', protocol: 'ICMP', weight: 10 },
      { name: 'NTP Sync', protocol: 'UDP', weight: 8 },
      { name: 'SMTP Normal', protocol: 'TCP', weight: 7 },
    ],
    suspicious: [
      { name: 'Port Scan', protocol: 'TCP', weight: 20, action: 'Monitoring Source' },
      { name: 'Brute Force Attempt', protocol: 'SSH', weight: 15, action: 'Rate Throttling' },
      { name: 'Unusual Beacon', protocol: 'UDP', weight: 10, action: 'Packet Logging' },
      { name: 'Anomalous Traffic', protocol: 'TCP', weight: 12, action: 'Deep Inspection' },
      { name: 'Slow Scan', protocol: 'TCP', weight: 8, action: 'Watchlist Added' },
    ],
    attack: [
      { name: 'DDoS Attack', protocol: 'UDP', weight: 15, severity: 'CRITICAL', action: 'IP Blocked', response: 'Traffic null-routed at edge' },
      { name: 'SQL Injection', protocol: 'HTTP', weight: 12, severity: 'CRITICAL', action: 'Connection Terminated', response: 'WAF rule deployed' },
      { name: 'Ransomware C2', protocol: 'TCP', weight: 8, severity: 'CRITICAL', action: 'Host Isolated', response: 'Network segment quarantined' },
      { name: 'Botnet Traffic', protocol: 'TCP', weight: 10, severity: 'HIGH', action: 'IP Blacklisted', response: 'Sink-holed to honeypot' },
      { name: 'DNS Exfiltration', protocol: 'DNS', weight: 7, severity: 'HIGH', action: 'DNS Blocked', response: 'Resolver policy updated' },
      { name: 'MITM Attack', protocol: 'ARP', weight: 6, severity: 'CRITICAL', action: 'Session Reset', response: 'Dynamic ARP inspection enabled' },
      { name: 'Shellcode Inject', protocol: 'HTTP', weight: 5, severity: 'CRITICAL', action: 'Process Killed', response: 'Endpoint quarantined' },
    ],
  };

  // ── IP pools ──
  const IP_PREFIXES = [
    '192.168.', '10.0.', '172.16.', '203.0.', '185.220.', '91.108.',
    '45.32.', '198.51.', '104.21.', '162.158.'
  ];

  function randomIP() {
    const prefix = IP_PREFIXES[Math.floor(Math.random() * IP_PREFIXES.length)];
    return `${prefix}${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`;
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

  // ── Sensitivity modifier ──
  let sensitivity = 'medium';
  const SENSITIVITY_MAP = { low: 0.06, medium: 0.14, high: 0.24 };

  function setSensitivity(s) { sensitivity = s; }
  function getSensitivity() { return sensitivity; }

  // ── AI Classification Feature Simulation ──
  function simulateFeatures() {
    return {
      packetSize: Math.floor(Math.random() * 1500) + 64,
      duration: Math.random() * 10,
      srcBytes: Math.floor(Math.random() * 50000),
      dstBytes: Math.floor(Math.random() * 50000),
      landFlag: Math.random() < 0.01 ? 1 : 0,
      wrongFragment: Math.floor(Math.random() * 3),
      urgent: Math.floor(Math.random() * 2),
      numFailedLogins: Math.floor(Math.random() * 5),
      loggedIn: Math.random() > 0.3 ? 1 : 0,
      count: Math.floor(Math.random() * 512),
      srvCount: Math.floor(Math.random() * 512),
    };
  }

  // ── Core classification ──
  function classify() {
    const features = simulateFeatures();
    const attackProb = SENSITIVITY_MAP[sensitivity];
    const suspiciousProb = attackProb * 2.2;
    const roll = Math.random();

    let category, threatData, confidence;

    if (roll < attackProb) {
      category = 'attack';
      threatData = weightedRandom(THREAT_TYPES.attack);
      confidence = 0.87 + Math.random() * 0.12;
    } else if (roll < attackProb + suspiciousProb) {
      category = 'suspicious';
      threatData = weightedRandom(THREAT_TYPES.suspicious);
      confidence = 0.65 + Math.random() * 0.2;
    } else {
      category = 'safe';
      threatData = weightedRandom(THREAT_TYPES.safe);
      confidence = 0.92 + Math.random() * 0.07;
    }

    return {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      category,
      threat: threatData,
      sourceIP: randomIP(),
      destIP: randomIP(),
      port: [80, 443, 22, 3389, 53, 8080, 8443, 3306, 5900][Math.floor(Math.random() * 9)],
      features,
      confidence: Math.round(confidence * 100),
      packetCount: Math.floor(Math.random() * 5000) + 1,
    };
  }

  // ── Public API ──
  return { classify, setSensitivity, getSensitivity, THREAT_TYPES };

})();
