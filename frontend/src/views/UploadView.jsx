import { useState } from "react";
import UploadZone from "../components/UploadZone";

function Pipeline() {
  const steps = ['Upload','Preprocess','Analyze','Score','Report'];

  return (
    <div style={{
      display: 'flex',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      marginTop: 20,
      background: 'var(--surface)'
    }}>
      {steps.map((s, i) => (
        <div key={i} style={{
          flex: 1,
          padding: 10,
          fontSize: '0.7rem',
          color: 'var(--muted)',
          textAlign: 'center',
          borderRight: i !== steps.length - 1 ? '1px solid var(--border)' : 'none'
        }}>
          {s.toUpperCase()}
        </div>
      ))}
    </div>
  );
}

function LogPanel({ uploadState }) {
  const isError = uploadState?.status === 'error';
  const isSuccess = uploadState?.status === 'success';
  const isProcessing = uploadState?.status === 'loading';
  
  let statusText = 'IDLE';
  let statusColor = 'var(--green)';
  if (isError) { statusText = 'ERROR'; statusColor = 'var(--red)'; }
  else if (isProcessing) { statusText = 'PROCESSING'; statusColor = '#ffaa00'; }
  else if (isSuccess) { statusText = 'SUCCESS'; statusColor = 'var(--green)'; }

  let msg = 'Awaiting media input';
  if (uploadState?.error) msg = uploadState.error;
  else if (isSuccess) msg = 'Upload complete. Redirecting...';
  else if (isProcessing) msg = 'Uploading file...';

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      background: 'var(--surface)',
      marginTop: 20,
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--muted)'
        }}>
          SYSTEM LOG
        </span>

        <span style={{
          fontSize: '0.65rem',
          padding: '2px 6px',
          border: `1px solid ${isProcessing ? 'rgba(255,170,0,0.2)' : isError ? 'rgba(255,68,102,0.2)' : 'rgba(0,255,136,0.2)'}`,
          color: statusColor
        }}>
          {statusText}
        </span>
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ color: 'var(--muted)' }}>{msg}</div>
        <div style={{ color: 'var(--muted)' }}>Face mesh network: {isProcessing || isSuccess ? 'active' : 'standby'}</div>
        <div style={{ color: 'var(--muted)' }}>GAN analysis: {isProcessing || isSuccess ? 'active' : 'standby'}</div>
      </div>
    </div>
  );
}

function UploadView() {
  const [uploadState, setUploadState] = useState({
    status: "idle",
    error: "",
    result: null,
    file: null,
  });

  return (
    // Change 2 — centered layout wrapper
    <div style={{
      maxWidth: 720,
      margin: "0 auto",
      padding: "40px 20px",
    }}>
      {/* Change 1.1 — hero header */}
      <div style={{
        textAlign: "center",
        marginBottom: 28,
      }}>
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "#e0e6f0",
          marginBottom: 6,
          margin: "0 0 6px 0",
        }}>
          Deepfake Detection
        </h1>
        <p style={{
          color: "#5a6070",
          fontSize: "0.95rem",
          margin: 0,
        }}>
          Upload media and get AI-powered authenticity analysis
        </p>
      </div>

      {/* Upload zone */}
      <UploadZone onUploadStateChange={setUploadState} />

      <Pipeline />
      <LogPanel uploadState={uploadState} />
    </div>
  );
}

export default UploadView;
