import { useEffect, useMemo, useState } from "react";

const SCORE_CARDS = [
  { key: "neural", label: "Neural Classifier" },
  { key: "gan", label: "GAN Artifact Scan" },
  { key: "audio", label: "Audio Authenticity" },
  { key: "metadata", label: "Metadata Forensics" },
];

const VERDICT_STYLES = {
  FAKE: {
    tint: "rgba(220, 38, 38, 0.18)",
    border: "rgba(248, 113, 113, 0.45)",
    label: "⚠ FAKE CONTENT DETECTED",
    text: "#fecaca",
    ring: "#ef4444",
  },
  REAL: {
    tint: "rgba(0, 255, 136, 0.14)",
    border: "rgba(0, 255, 136, 0.4)",
    label: "REAL CONTENT DETECTED",
    text: "#bbf7d0",
    ring: "var(--green)",
  },
  UNCERTAIN: {
    tint: "rgba(245, 158, 11, 0.16)",
    border: "rgba(251, 191, 36, 0.45)",
    label: "UNCERTAIN RESULT",
    text: "#fde68a",
    ring: "#f59e0b",
  },
};

function toReadableFlag(flag) {
  if (!flag || typeof flag !== "string") {
    return "Unknown Flag";
  }

  return flag
    .split("_")
    .map((token) => {
      if (token.toLowerCase() === "exif") {
        return "EXIF";
      }
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
}

function getRiskMeta(score) {
  if (score > 0.7) {
    return { label: "HIGH RISK", color: "#fca5a5" };
  }
  if (score >= 0.4) {
    return { label: "MODERATE", color: "#fcd34d" };
  }
  return { label: "LOW RISK", color: "#86efac" };
}

function ResultsPanel({ reportData }) {
  const result = reportData?.result ?? "UNCERTAIN";
  const confidence = Number(reportData?.confidence ?? 0);
  const boundedConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : 0;
  const verdictStyle = VERDICT_STYLES[result] ?? VERDICT_STYLES.UNCERTAIN;

  const ringRadius = 50;
  const ringCircumference = 2 * Math.PI * ringRadius;

  // C3 — animated counter state
  const [animatedValue, setAnimatedValue] = useState(0);

  // C4 — count-up effect
  useEffect(() => {
    if (boundedConfidence == null) return;
    const duration = 1200;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setAnimatedValue(Math.round(eased * boundedConfidence));
      if (t < 1) requestAnimationFrame(step);
    }

    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [boundedConfidence]);

  // C5 — animatedValue drives ring stroke
  const ringOffset = ringCircumference * (1 - animatedValue / 100);

  const flags = Array.isArray(reportData?.flags) ? reportData.flags : [];
  const componentScores = reportData?.component_scores ?? {};
  const fileType = reportData?.file_type ?? "image";

  const componentKeyByCard = {
    neural: "neural_score",
    gan: "gan_score",
    audio: "audio_score",
    metadata: "metadata_score",
  };

  const scoreCards = useMemo(
    () =>
      SCORE_CARDS.map((card) => {
        const rawScore = componentScores[componentKeyByCard[card.key]];
        const numericScore = typeof rawScore === "number" ? rawScore : null;
        const isAudioUnavailable = card.key === "audio" && fileType === "image";
        const isMissing = numericScore === null || Number.isNaN(numericScore);
        const notApplicable = isAudioUnavailable || isMissing;

        return {
          ...card,
          notApplicable,
          percent: notApplicable ? null : Math.max(0, Math.min(100, numericScore * 100)),
          risk: notApplicable ? null : getRiskMeta(numericScore),
        };
      }),
    [componentScores, fileType]
  );

  // D2 — verdict banner animation
  const isFake = result?.toUpperCase() === "FAKE";
  const bannerAnimation = isFake
    ? "fakePulse 1.5s ease-in-out infinite"
    : "realPulse 2.5s ease-in-out infinite";

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      {/* D1 — verdict banner keyframes */}
      <style>{`
        @keyframes fakePulse {
          0%, 100% { box-shadow: 0 0 0px #ff4757; }
          50%       { box-shadow: 0 0 24px rgba(255,71,87,0.7); }
        }
        @keyframes realPulse {
          0%, 100% { box-shadow: 0 0 0px #00ff88; }
          50%       { box-shadow: 0 0 16px rgba(0,255,136,0.4); }
        }
        @keyframes veridexRingFill {
          from { stroke-dashoffset: ${ringCircumference}; }
          to { stroke-dashoffset: var(--ring-target); }
        }
        @keyframes veridexBarFill {
          from { width: 0; }
          to { width: var(--target-width); }
        }
        .veridex-score-fill {
          width: 0;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(0,255,136,0.35), rgba(0,255,136,0.95));
          box-shadow: 0 0 10px rgba(0,255,136,0.55);
          animation: veridexBarFill 1.2s ease-out forwards;
        }
      `}</style>

      {/* D2 — verdict banner with animation */}
      <article
        style={{
          border: `1px solid ${verdictStyle.border}`,
          backgroundColor: verdictStyle.tint,
          borderRadius: "14px",
          padding: "18px",
          display: "flex",
          flexWrap: "wrap",
          gap: "18px",
          alignItems: "center",
          justifyContent: "space-between",
          animation: bannerAnimation,
        }}
      >
        <div>
          <p style={{ margin: 0, color: verdictStyle.text, fontWeight: 800, fontSize: "26px", letterSpacing: "0.02em" }}>{verdictStyle.label}</p>
          <p style={{ margin: "8px 0 0", color: "var(--text)" }}>
            Faces detected: {reportData?.faces_detected ?? 0} | File type: {fileType}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <svg width="136" height="136" viewBox="0 0 136 136" style={{ overflow: "visible" }}>
            <circle cx="68" cy="68" r={ringRadius} stroke="rgba(148, 163, 184, 0.35)" strokeWidth="10" fill="none" />
            <circle
              cx="68"
              cy="68"
              r={ringRadius}
              stroke={verdictStyle.ring}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              // C5 — use animatedValue for ring
              strokeDasharray={`${(animatedValue / 100) * ringCircumference} ${ringCircumference}`}
              strokeDashoffset={0}
              transform="rotate(-90 68 68)"
              style={{
                filter: `drop-shadow(0 0 8px ${verdictStyle.ring})`,
                transition: "stroke-dasharray 0.05s linear",
              }}
            />
          </svg>
          {/* C6 — numeric label uses animatedValue */}
          <p
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--text)",
              fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            }}
          >
            {animatedValue}% confidence
          </p>
        </div>
      </article>

      {/* F1 — score cards grid */}
      <article style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
      }}>
        {scoreCards.map((card) => (
          <div
            key={card.key}
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg2)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <p style={{ margin: 0, color: "var(--text)", fontWeight: 600 }}>{card.label}</p>
            {card.notApplicable ? (
              <p style={{ margin: "12px 0 0", color: "#9aa3b5", fontSize: "13px" }}>N/A - not applicable for this file type</p>
            ) : (
              <>
                <div
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    height: "10px",
                    borderRadius: "999px",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "#0b0e13",
                  }}
                >
                  <div
                    className="veridex-score-fill"
                    style={{
                      ["--target-width"]: `${card.percent}%`,
                    }}
                  />
                </div>
                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <span
                    style={{
                      color: "var(--text)",
                      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                    }}
                  >
                    {card.percent.toFixed(1)}%
                  </span>
                  <span
                    style={{
                      color: card.risk.color,
                      fontWeight: 700,
                      fontSize: "12px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {card.risk.label}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </article>

      <article style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div
          style={{
            border: "1px solid rgba(248, 113, 113, 0.4)",
            backgroundColor: "rgba(185, 28, 28, 0.12)",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#fecaca" }}>Flags</p>
          <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {flags.length > 0 ? (
              flags.map((flag) => (
                <span
                  key={flag}
                  style={{
                    border: "1px solid rgba(248, 113, 113, 0.45)",
                    backgroundColor: "rgba(127, 29, 29, 0.3)",
                    color: "#fecaca",
                    borderRadius: "999px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                  }}
                >
                  {toReadableFlag(flag)}
                </span>
              ))
            ) : (
              <p style={{ margin: 0, color: "#9aa3b5" }}>No explicit threat flags detected.</p>
            )}
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(251, 191, 36, 0.5)",
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            borderRadius: "12px",
            padding: "14px",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#fde68a" }}>Threat Summary</p>
          <p style={{ margin: "10px 0 0", color: "var(--text)", lineHeight: 1.5 }}>
            {reportData?.threat_summary ?? "No summary provided by the analysis service."}
          </p>
        </div>
      </article>
    </section>
  );
}

export default ResultsPanel;
