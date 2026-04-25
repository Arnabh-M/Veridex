import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react"; // ✅ ADDED

import NavBar from "./components/NavBar";
import HistoryView from "./views/HistoryView";
import UploadView from "./views/UploadView";
import AnalysisView from "./views/AnalysisView";
import DisInfoGraph from "./components/DisInfoGraph"; // already present

function App() {

  const [graphData, setGraphData] = useState(null); // ✅ ADDED

  // ✅ ADDED: function to fetch graph from backend
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
      style={{
        "--green": "#00ff88",
        "--bg": "#080a0d",
        "--bg2": "#0e1015",
        "--border": "#1c2030",
        "--text": "#d4dae8",
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        fontFamily: 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <NavBar />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 18px" }}>
        <Routes>
          <Route path="/" element={<UploadView />} />

          {/* ✅ UPDATED: passing props WITHOUT removing anything */}
          <Route 
            path="/analysis" 
            element={
              <AnalysisView 
                graphData={graphData}            // ✅ ADDED
                setGraphData={setGraphData}      // ✅ ADDED
                fetchGraph={fetchGraph}          // ✅ ADDED
              />
            } 
          />

          <Route path="/history" element={<HistoryView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* ✅ ADDED: render graph globally (safe, does not break anything) */}
        {graphData && (
          <div style={{ marginTop: "40px" }}>
            <DisInfoGraph graphData={graphData} />
          </div>
        )}

      </main>

      <style>{`
        @keyframes veridexPulse {
          0% { box-shadow: 0 0 0 0 rgba(0,255,136,0.7); }
          70% { box-shadow: 0 0 0 12px rgba(0,255,136,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,255,136,0); }
        }
      `}</style>
    </div>
  );
}

export default App;