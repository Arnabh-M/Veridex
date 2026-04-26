import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";

import NavBar from "./components/NavBar";
import HistoryView from "./views/HistoryView";
import UploadView from "./views/UploadView";
import AnalysisView from "./views/AnalysisView";
import DisInfoGraph from "./components/DisInfoGraph";

function App() {

  const [graphData, setGraphData] = useState(null);

  const fetchGraph = async (jobId) => {
    try {
      const res = await fetch(`http://localhost:8000/graph/${jobId}`);
      const data = await res.json();
      setGraphData(data.graph);
    } catch (err) {
      console.error("Graph fetch error:", err);
    }
  };

  return (
    <div
      className="veridex-root"
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        position: 'relative',
        fontFamily: 'Syne, sans-serif'
      }}
    >
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.015) 2px, rgba(0,255,136,0.015) 4px)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      {/* F3 — global mobile media query */}
      <style>{`
        @media (max-width: 640px) {
          .veridex-main-layout {
            flex-direction: column !important;
          }
          .veridex-panel {
            width: 100% !important;
            min-width: unset !important;
          }
          .veridex-upload-zone {
            min-height: 180px;
            padding: 20px 12px;
          }
          body, .veridex-root {
            font-size: 14px;
          }
          h1, h2, h3 {
            font-size: clamp(1rem, 5vw, 1.5rem);
          }
        }
        @keyframes veridexPulse {
          0% { box-shadow: 0 0 0 0 rgba(0,255,136,0.7); }
          70% { box-shadow: 0 0 0 12px rgba(0,255,136,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,255,136,0); }
        }
      `}</style>

      {/* Change 3 — background radial glow */}
      <div style={{
        position: "fixed",
        top: "-20%",
        left: "-20%",
        width: "140%",
        height: "140%",
        background: "radial-gradient(circle at center, rgba(0,255,136,0.06), transparent 60%)",
        zIndex: -1,
        pointerEvents: "none",
      }} />

      <NavBar />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 18px" }}>
        <Routes>
          <Route path="/" element={<UploadView />} />

          {/* F4 — layout class applied in AnalysisView route wrapper */}
          <Route
            path="/analysis"
            element={
              <AnalysisView
                graphData={graphData}
                setGraphData={setGraphData}
                fetchGraph={fetchGraph}
              />
            }
          />

          <Route path="/history" element={<HistoryView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {graphData && (
          <div style={{ marginTop: "40px" }}>
            <DisInfoGraph graphData={graphData} />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;