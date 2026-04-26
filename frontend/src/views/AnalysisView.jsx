import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getJobReport, getJobStatus } from "../services/api";
import ResultsPanel from "../components/ResultsPanel";
import ReportPanel from "../components/ReportPanel";

const moduleRows = ["Neural Classifier", "GAN Detector", "Audio Sync", "Metadata Forensics"];

// B2 — module labels for cycling highlight
const MODULES = ["Neural", "GAN", "Audio", "Metadata"];

function AnalysisView({ fetchGraph, thumbnailUrl = null, graphData, setGraphData }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeJob = location.state ?? null;
  const [statusData, setStatusData] = useState(null);
  const [reportData, setReportData] = useState(activeJob?.analysis ?? null);
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // B2 — active module state
  const [activeModule, setActiveModule] = useState(0);

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const jobId = activeJob?.jobId ?? "";

  const currentStatus = statusData?.status ?? "queued";
  const liveProgressText = statusData?.progress ?? "Initializing analysis pipeline";
  const isCompleted = currentStatus === "completed";
  const isProcessing = currentStatus === "queued" || currentStatus === "processing";

  // B3 — module cycling effect
  useEffect(() => {
    const id = setInterval(() => {
      setActiveModule(prev => (prev + 1) % MODULES.length);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!jobId) {
      return undefined;
    }

    let isAlive = true;

    const clearPollers = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const fetchReport = async () => {
      try {
        const reportJson = await getJobReport(jobId);
        if (isAlive) {
          setReportData(reportJson?.report ?? null);
          if (fetchGraph) {
            fetchGraph(jobId);
          }
        }
      } catch (error) {
        if (isAlive) {
          setErrorMessage(error.message || "Failed to fetch report data.");
        }
      }
    };

    const pollStatus = async () => {
      try {
        const statusJson = await getJobStatus(jobId);
        if (!isAlive) {
          return;
        }

        setStatusData(statusJson);

        if (statusJson.status === "failed") {
          clearPollers();
          setErrorMessage(statusJson.error || "Analysis failed on the server.");
          return;
        }

        if (statusJson.status === "completed") {
          clearPollers();
          await fetchReport();
        }
      } catch (error) {
        clearPollers();
        if (isAlive) {
          setErrorMessage(error.message || "Status polling failed.");
        }
      }
    };

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    pollStatus();
    pollRef.current = setInterval(pollStatus, 1500);

    return () => {
      isAlive = false;
      clearPollers();
    };
  }, [jobId]);

  const elapsedLabel = useMemo(() => `${elapsedSeconds}s`, [elapsedSeconds]);

  if (!jobId) {
    return (
      <section
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg2)",
          borderRadius: "14px",
          padding: "20px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px", color: "var(--green)" }}>No Active Analysis</h2>
        <p style={{ marginTop: "10px", color: "var(--text)" }}>
          Open this page from the upload flow so the selected job context is available.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            marginTop: "12px",
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--text)",
            borderRadius: "10px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Back to Upload
        </button>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section
        style={{
          border: "1px solid #5a1d2d",
          backgroundColor: "rgba(90, 29, 45, 0.15)",
          borderRadius: "14px",
          padding: "20px",
          color: "#ff8aa7",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px" }}>Analysis Error</h2>
        <p style={{ marginTop: "10px", color: "var(--text)" }}>{errorMessage}</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            marginTop: "12px",
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--text)",
            borderRadius: "10px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  if (isCompleted && reportData) {
    return (
      <section style={{ display: "grid", gap: "20px" }}>
        {/* Score cards from the raw analysis result */}
        <ResultsPanel reportData={reportData} />

        {/* LLM threat-intel brief */}
        <ReportPanel
          jobId={jobId}
          confidence={Number(reportData?.confidence ?? 0)}
        />

        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            alignSelf: "start",
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--text)",
            borderRadius: "10px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Back to Upload
        </button>
      </section>
    );
  }

  if (!isProcessing && !isCompleted) {
    return (
      <section
        style={{
          border: "1px solid #5a1d2d",
          backgroundColor: "rgba(90, 29, 45, 0.15)",
          borderRadius: "14px",
          padding: "20px",
          color: "#ff8aa7",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px" }}>Analysis Error</h2>
        <p style={{ marginTop: "10px", color: "var(--text)" }}>Unexpected status returned from API.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            marginTop: "12px",
            border: "1px solid var(--border)",
            backgroundColor: "transparent",
            color: "var(--text)",
            borderRadius: "10px",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  // B1 — keyframes injection + B5 — scanning block replaces old progress bar
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg2)",
        borderRadius: "14px",
        padding: "20px",
      }}
    >
      {/* B1 — scanLine keyframe */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>

      <h1 style={{ margin: 0, fontSize: "24px", color: "var(--green)" }}>
        Analyzing: {activeJob?.filename ?? activeJob?.fileName ?? "Unknown file"}
      </h1>
      <p
        style={{
          marginTop: "10px",
          marginBottom: "18px",
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
          color: "var(--text)",
        }}
      >
        {liveProgressText}
      </p>

      {/* B5 — scanning block */}
      <div style={{
        position: "relative",
        width: "100%",
        height: 200,
        background: "#0e1015",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #1c2030",
        marginBottom: "16px",
      }}>
        {/* Thumbnail background */}
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt="analyzing"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.35,
            }}
          />
        )}

        {/* Scan line */}
        <div style={{
          position: "absolute",
          left: 0,
          width: "100%",
          height: 2,
          background: "#00ff88",
          boxShadow: "0 0 8px rgba(0,255,136,0.6)",
          animation: "scanLine 1.2s linear infinite",
        }} />

        {/* Module list */}
        <div style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          {MODULES.map((mod, i) => (
            <span key={mod} style={{
              fontSize: "0.78rem",
              fontWeight: i === activeModule ? 700 : 400,
              color: i === activeModule ? "#00ff88" : "#3a4050",
              letterSpacing: "0.08em",
              transition: "color 0.3s ease",
            }}>
              {i === activeModule ? "▶ " : "  "}{mod.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "var(--text)",
          fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
        }}
      >
        Elapsed time: {elapsedLabel}
      </p>

      <style>{`
        @keyframes veridexScan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes veridexPulseDot {
          0% { box-shadow: 0 0 0 0 rgba(0,255,136,0.7); opacity: 1; }
          70% { box-shadow: 0 0 0 10px rgba(0,255,136,0); opacity: 0.6; }
          100% { box-shadow: 0 0 0 0 rgba(0,255,136,0); opacity: 1; }
        }
        .veridex-scan-bar {
          width: 35%;
          height: 100%;
          background: linear-gradient(90deg, rgba(0,255,136,0.05), rgba(0,255,136,0.65), rgba(0,255,136,0.05));
          box-shadow: 0 0 14px rgba(0,255,136,0.6);
          animation: veridexScan 1.8s linear infinite;
        }
        .veridex-pulse-dot {
          animation: veridexPulseDot 1.2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

export default AnalysisView;
