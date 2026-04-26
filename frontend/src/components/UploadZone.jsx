import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadMedia } from "../services/api";

const ACCEPTED_FILE_TYPES = "image/*,video/*,audio/*";

// A6 — module-scope size formatter
function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function resolveMediaType(file) {
  if (!file?.type) {
    return "unknown";
  }
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type.startsWith("audio/")) {
    return "audio";
  }
  return "unknown";
}

function UploadZone({ onUploadStateChange }) {
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // A1 — drag state
  const [isDragging, setIsDragging] = useState(false);
  // A5 — file preview state
  const [filePreview, setFilePreview] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const previewUrl = useMemo(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      return "";
    }
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // A8 — cleanup object URL on filePreview change / unmount
  useEffect(() => {
    return () => {
      if (filePreview?.objectUrl) URL.revokeObjectURL(filePreview.objectUrl);
    };
  }, [filePreview]);

  const setState = (state) => {
    if (typeof onUploadStateChange === "function") {
      onUploadStateChange(state);
    }
  };

  const handleSelectedFile = (file) => {
    if (!file) {
      return;
    }
    setSelectedFile(file);
    setErrorMessage("");
    setProgress(0);
    setState({ status: "idle", error: "", result: null, file });

    // A7 — generate preview
    if (file) {
      setFilePreview({
        objectUrl: URL.createObjectURL(file),
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || "unknown",
      });
    }
  };

  // A2 — drop handler
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) {
      if (!selectedFile) {
        const message = "Please select a media file before uploading.";
        setErrorMessage(message);
        setState({ status: "error", error: message, result: null, file: null });
      }
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage("");
      setState({ status: "loading", error: "", result: null, file: selectedFile });

      const mediaType = resolveMediaType(selectedFile);
      const response = await uploadMedia(selectedFile, mediaType, (nextProgress) => {
        setProgress(nextProgress);
      });
      const jobId = response?.job_id ?? response?.jobId ?? "";

      setProgress(100);
      setState({ status: "success", error: "", result: response, file: selectedFile });
      navigate("/analysis", {
        state: {
          jobId,
          fileName: selectedFile.name,
          mediaType,
          previewUrl,
          analysis: response?.report ?? null,
          uploadedAt: new Date().toISOString(),
          status: "success",
        },
      });
    } catch (error) {
      const message = error?.response?.data?.detail || error?.message || "Upload failed. Please try again.";
      setErrorMessage(message);
      setState({ status: "error", error: message, result: null, file: selectedFile });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section style={{ width: "100%", boxSizing: "border-box" }}>
      {/* Change 4.1 + 4.2 — upgraded drop zone with hover lift */}
      <div
        role="button"
        tabIndex={0}
        className="veridex-upload-zone"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        // A2 — drag event handlers
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--green)';
          e.currentTarget.style.background = 'rgba(0,255,136,0.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'var(--surface)';
        }}
        style={{
          border: isDragging ? '1.5px solid var(--green)' : '1.5px dashed var(--border)',
          borderRadius: 12,
          background: isDragging ? 'rgba(0,255,136,0.03)' : 'var(--surface)',
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.04), transparent 70%)',
          pointerEvents: 'none'
        }} />
        {/* A4 — "DROP TO ANALYZE" overlay */}
        {isDragging && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            pointerEvents: "none",
            background: "rgba(0,255,136,0.04)",
            borderRadius: "inherit",
          }}>
            <span style={{
              color: "#00ff88",
              fontSize: "1.1rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}>
              DROP TO ANALYZE
            </span>
          </div>
        )}

        <>
          <div style={{
            width: 60,
            height: 60,
            margin: '0 auto 16px',
            border: '1.5px solid var(--border)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface2)'
          }}>
            ⬆️
          </div>

          <div style={{
            fontWeight: 700,
            fontSize: '1.1rem',
            color: 'var(--text)'
          }}>
            Drop media here
          </div>

          <div style={{
            fontSize: '0.75rem',
            color: 'var(--muted)',
            marginTop: 4
          }}>
            or click to browse files
          </div>

          <div style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'center',
            marginTop: 16,
            flexWrap: 'wrap'
          }}>
            {['JPG','PNG','MP4','MOV','WAV','MP3'].map(t => (
              <span key={t} style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                borderRadius: 4
              }}>
                {t}
              </span>
            ))}
          </div>
        </>
      </div>

      {/* A9 — file preview block */}
      {filePreview && (
        <div style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 14px",
          background: "#0e1015",
          border: "1px solid #1c2030",
          borderRadius: 8,
          transition: "all 0.2s ease",
        }}>
          <img
            src={filePreview.objectUrl}
            alt="preview"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            style={{
              width: 56,
              height: 56,
              objectFit: "cover",
              borderRadius: 6,
              background: "#1a1f2e",
              flexShrink: 0,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{
              color: "#e0e6f0",
              fontSize: "0.85rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {filePreview.name}
            </span>
            <span style={{ color: "#5a6070", fontSize: "0.75rem" }}>
              {filePreview.size}
            </span>
            <span style={{ color: "#3a4050", fontSize: "0.72rem", fontFamily: "monospace" }}>
              {filePreview.type}
            </span>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        style={{ display: "none" }}
        onChange={(event) => handleSelectedFile(event.target.files?.[0] ?? null)}
      />

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Change 4.4 removed "No file selected"; Change 4.5 shows "Awaiting input..." */}
        {selectedFile ? (
          <p style={{
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: '0.75rem',
            color: 'var(--muted)',
            fontFamily: 'Space Mono, monospace'
          }}>
            Selected: {selectedFile.name}
          </p>
        ) : (
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--muted)',
            fontFamily: 'Space Mono, monospace'
          }}>
            Awaiting input...
          </span>
        )}

        {previewUrl ? (
          <img src={previewUrl} alt="Upload preview" style={{ maxHeight: 208, width: "100%", borderRadius: 8, objectFit: "contain" }} />
        ) : null}

        {isUploading ? (
          <div>
            <div style={{ height: 8, width: "100%", overflow: "hidden", borderRadius: 999, background: "#1c2030" }}>
              <div style={{ height: "100%", borderRadius: 999, background: "#00ff88", transition: "width 0.3s ease", width: `${progress}%` }} />
            </div>
            <p style={{ marginTop: 4, fontSize: "0.75rem", color: "#5a6070" }}>Uploading... {progress}%</p>
          </div>
        ) : null}

        {errorMessage ? (
          <p style={{ margin: 0, borderRadius: 8, background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", padding: "8px 12px", fontSize: "0.85rem", color: "#ff8aa7" }}>
            {errorMessage}
          </p>
        ) : null}

        {/* Change 5 — upgraded upload button with hover handlers */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            style={{
              background: 'var(--green)',
              color: '#080b10',
              borderRadius: 6,
              padding: '10px 20px',
              fontWeight: 700,
              fontFamily: 'Space Mono, monospace',
              letterSpacing: '0.08em',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              border: 'none',
              transition: 'all 0.2s ease',
              opacity: isUploading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isUploading) {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(0,255,136,0.35)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = isUploading ? "none" : "0 0 12px rgba(0,255,136,0.2)";
            }}
          >
            {isUploading ? "Uploading..." : "Upload Media"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default UploadZone;
