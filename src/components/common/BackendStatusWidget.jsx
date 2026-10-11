import { useState, useEffect, useCallback, useRef } from "react";
import { Server, Zap, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../../config/apiConfig";
import "./backendStatus.css";

export default function BackendStatusWidget({ compact = false, showDetails = false }) {
  // status: "checking" | "awake" | "asleep" | "waking"
  const [status, setStatus] = useState("checking");
  const [latency, setLatency] = useState(null);
  const [wakingSeconds, setWakingSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(showDetails);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // Ping backend to check health
  const pingBackend = useCallback(async () => {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${API_BASE_URL}/api/health`, {
        method: "GET",
        signal: controller.signal,
        headers: { "Cache-Control": "no-cache" },
      }).catch(async () => {
        // Fallback to root endpoint
        return await fetch(`${API_BASE_URL}/`, {
          method: "GET",
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        });
      });

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const roundTrip = Math.round(performance.now() - startTime);
        setLatency(roundTrip);
        setStatus("awake");
        setMessage("Server is active & responding");
        return true;
      } else {
        setStatus("asleep");
        setMessage("Server is asleep or unreachable");
        return false;
      }
    } catch {
      setStatus("asleep");
      setMessage("Server cold start / asleep");
      return false;
    }
  }, []);

  // Initial ping on mount
  useEffect(() => {
    pingBackend();
  }, [pingBackend]);

  // Handle waking state timer and retry polling loop
  useEffect(() => {
    if (status === "waking") {
      setWakingSeconds(0);
      timerRef.current = setInterval(() => {
        setWakingSeconds((s) => s + 1);
      }, 1000);

      // Poll every 3 seconds to check if server woke up
      pollRef.current = setInterval(async () => {
        const isAwake = await pingBackend();
        if (isAwake) {
          clearInterval(timerRef.current);
          clearInterval(pollRef.current);
        }
      }, 3000);

      return () => {
        clearInterval(timerRef.current);
        clearInterval(pollRef.current);
      };
    }
  }, [status, pingBackend]);

  // Trigger wake up packet
  const handleWakeUp = async () => {
    setStatus("waking");
    setMessage("Sending wake packets to Render...");
    // Immediately fire wake ping
    fetch(`${API_BASE_URL}/`, { method: "GET", mode: "no-cors" }).catch(() => {});
    fetch(`${API_BASE_URL}/api/health`, { method: "GET", mode: "no-cors" }).catch(() => {});
  };

  const handleManualCheck = async () => {
    setStatus("checking");
    await pingBackend();
  };

  return (
    <div className={`backend-status-widget ${compact ? "compact" : ""} status-${status}`}>
      <div className="status-pill" onClick={() => (status === "asleep" ? handleWakeUp() : setExpanded(!expanded))}>
        <span className={`status-indicator-dot dot-${status}`}>
          {status === "waking" || status === "checking" ? (
            <span className="dot-ripple" />
          ) : null}
        </span>

        <span className="status-label">
          {status === "checking" && "Checking Server..."}
          {status === "awake" && (compact ? "Backend Awake" : `Backend Awake (${latency ? `${latency}ms` : "Live"})`)}
          {status === "asleep" && (compact ? "Wake Server" : "Backend Asleep · Click to Wake")}
          {status === "waking" && `Waking Server (${wakingSeconds}s)...`}
        </span>

        {status === "asleep" && (
          <button
            type="button"
            className="wake-btn-action"
            onClick={(e) => {
              e.stopPropagation();
              handleWakeUp();
            }}
            title="Send wake packet to Render"
          >
            <Zap size={13} className="wake-icon" />
            <span>Wake</span>
          </button>
        )}

        {status === "waking" && (
          <Loader2 size={13} className="spin-icon" />
        )}

        {status === "awake" && (
          <button
            type="button"
            className="refresh-btn-action"
            onClick={(e) => {
              e.stopPropagation();
              handleManualCheck();
            }}
            title="Re-check server health"
          >
            <RefreshCw size={11} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="status-details-drawer">
          <div className="status-drawer-header">
            <div className="drawer-title">
              <Server size={14} />
              <span>Backend Service Status</span>
            </div>
            <button type="button" className="drawer-close" onClick={() => setExpanded(false)}>
              ×
            </button>
          </div>

          <div className="status-drawer-body">
            <div className="status-detail-row">
              <span className="detail-key">Endpoint:</span>
              <a href={API_BASE_URL} target="_blank" rel="noreferrer" className="detail-val endpoint-url">
                {API_BASE_URL}
              </a>
            </div>
            <div className="status-detail-row">
              <span className="detail-key">State:</span>
              <span className={`detail-val badge-${status}`}>
                {status === "awake" && "Online & Responsive"}
                {status === "asleep" && "Sleeping (Cold Start)"}
                {status === "waking" && `Spinning Up (${wakingSeconds}s)`}
                {status === "checking" && "Probing..."}
              </span>
            </div>
            {latency !== null && status === "awake" && (
              <div className="status-detail-row">
                <span className="detail-key">Latency:</span>
                <span className="detail-val">{latency} ms</span>
              </div>
            )}
            <p className="status-drawer-help">
              Render free tier instances spin down after 15 minutes of inactivity. Clicking <strong>Wake Server</strong> sends an HTTP ping to initialize the container (~30-50s).
            </p>
          </div>

          <div className="status-drawer-footer">
            {status !== "awake" ? (
              <button
                type="button"
                className="btn-drawer-wake"
                onClick={handleWakeUp}
                disabled={status === "waking"}
              >
                <Zap size={14} />
                <span>{status === "waking" ? `Waking up (${wakingSeconds}s)...` : "Send Wake Packet"}</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-drawer-refresh"
                onClick={handleManualCheck}
              >
                <RefreshCw size={13} />
                <span>Ping Server Again</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
