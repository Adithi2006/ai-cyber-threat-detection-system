import psutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize network tracking states
last_io = psutil.net_io_counters()
last_time = time.time()

@app.get("/api/network")
def get_network_stats():
    global last_io, last_time
    
    current_io = psutil.net_io_counters()
    current_time = time.time()
    
    dt = current_time - last_time
    if dt == 0: dt = 1
    
    # Calculate difference
    packets_sec = (current_io.packets_sent - last_io.packets_sent + current_io.packets_recv - last_io.packets_recv) / dt
    bytes_sec = (current_io.bytes_sent - last_io.bytes_sent + current_io.bytes_recv - last_io.bytes_recv) / dt
    
    last_io = current_io
    last_time = current_time
    
    # Grab a handful of active connections to feed to the "AI engine" pool of suspicious IPs
    connections = []
    try:
        active_conns = psutil.net_connections(kind='inet')
        for c in active_conns:
            if c.raddr: # Only pick established or outward bound connects
                connections.append({
                    "remote_ip": c.raddr.ip,
                    "remote_port": c.raddr.port,
                    "status": c.status,
                    "local_port": c.laddr.port if c.laddr else None,
                    "family": "IPv4" if c.family.name == "AF_INET" else "IPv6"
                })
    except Exception:
        pass
        
    # Return actual OS metrics
    return {
        "packets_per_sec": int(packets_sec),
        "bytes_per_sec": int(bytes_sec),
        "total_packets": current_io.packets_sent + current_io.packets_recv,
        "total_bytes": current_io.bytes_sent + current_io.bytes_recv,
        "active_connections_count": len(connections),
        "connections": connections[:50]  # Limit raw data sent over the wire 
    }
