import { useState } from "react";

// E6 — module-scope style constants
const thStyle = {
  padding: "9px 14px",
  textAlign: "left",
  color: "#5a6070",
  fontWeight: 600,
  fontSize: "0.75rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderBottom: "1px solid #1c2030",
};

const tdStyle = {
  padding: "10px 14px",
  verticalAlign: "middle",
};

// E1 — props signature with defaults
function HistoryView({ jobHistory = [], onSelectJob, onClear }) {
  // E2 — sort state
  const [sortAsc, setSortAsc] = useState(false);

  // E3 — derived sorted data
  const sortedHistory = [...jobHistory].sort((a, b) =>
    sortAsc ? a.confidence - b.confidence : b.confidence - a.confidence
  );

  return (
    <>
      {/* E4 — keyframes / row hover styles */}
      <style>{`
        .veridex-history-row:hover {
          background: #13161c !important;
          cursor: pointer;
        }
        .veridex-history-row {
          transition: background 0.15s ease;
        }
      `}</style>

      {/* E5 — full table UI */}
      <div style={{
        background: "#0e1015",
        border: "1px solid #1c2030",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #1c2030",
        }}>
          <span style={{ color: "#e0e6f0", fontWeight: 600, fontSize: "0.9rem" }}>
            Analysis History
          </span>
          <button
            onClick={onClear}
            style={{
              background: "transparent",
              border: "1px solid #2a2f3e",
              color: "#5a6070",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            Clear History
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.82rem",
          }}>
            <thead>
              <tr style={{ background: "#0a0d12" }}>
                <th style={thStyle}>Verdict</th>
                <th style={thStyle}>Filename</th>
                <th style={thStyle}>Time</th>
                <th
                  style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                  onClick={() => setSortAsc(prev => !prev)}
                >
                  Confidence {sortAsc ? "▲" : "▼"}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: "#3a4050",
                    fontSize: "0.8rem",
                  }}>
                    No history yet
                  </td>
                </tr>
              ) : (
                sortedHistory.map(job => (
                  <tr
                    key={job.jobId}
                    className="veridex-history-row"
                    onClick={() => onSelectJob?.(job)}
                    style={{ borderBottom: "1px solid #1c2030", background: "#0e1015" }}
                  >
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        background: job.verdict?.toUpperCase() === "FAKE"
                          ? "rgba(255,71,87,0.15)" : "rgba(0,255,136,0.12)",
                        color: job.verdict?.toUpperCase() === "FAKE" ? "#ff4757" : "#00ff88",
                        border: `1px solid ${job.verdict?.toUpperCase() === "FAKE"
                          ? "rgba(255,71,87,0.3)" : "rgba(0,255,136,0.25)"}`,
                      }}>
                        {job.verdict?.toUpperCase() ?? "—"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 180, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#c0c8d8" }}>
                      {job.filename}
                    </td>
                    <td style={{ ...tdStyle, color: "#5a6070" }}>
                      {new Date(job.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ ...tdStyle, color: "#e0e6f0", fontVariantNumeric: "tabular-nums" }}>
                      {job.confidence != null ? `${job.confidence}%` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default HistoryView;
