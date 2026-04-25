import React, { useEffect, useMemo, useRef } from "react";

/**
 * DisInfoGraph
 * Renders a force-directed propagation graph using D3.js loaded from CDN.
 *
 * Props:
 *   - graphData: { nodes: [], edges: [], stats: {}, graph_summary: string }
 */
export default function DisInfoGraph({ graphData }) {
  const containerRef = useRef(null);

  const stats = graphData?.stats || {};
  const summary = graphData?.graph_summary || "";

  const safeNodes = useMemo(() => (graphData?.nodes ? [...graphData.nodes] : []), [graphData]);
  const safeEdges = useMemo(() => (graphData?.edges ? [...graphData.edges] : []), [graphData]);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;

    async function ensureD3() {
      if (window.d3) return window.d3;

      // If a script is already being loaded, wait for it.
      const existing = document.querySelector('script[data-d3-cdn="true"]');
      if (existing) {
        await new Promise((resolve, reject) => {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
        });
        return window.d3;
      }

      // Load D3 from CDN.
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js";
        script.async = true;
        script.defer = true;
        script.dataset.d3Cdn = "true";
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
      return window.d3;
    }

    async function render() {
      const el = containerRef.current;
      if (!el) return;

      // Clear previous render.
      el.innerHTML = "";

      if (!graphData || safeNodes.length === 0) {
        const empty = document.createElement("div");
        empty.style.padding = "14px";
        empty.style.color = "rgba(255,255,255,0.75)";
        empty.style.fontSize = "14px";
        empty.textContent = "No graph data available.";
        el.appendChild(empty);
        return;
      }

      const d3 = await ensureD3();
      if (cancelled || !d3) return;

      const width = el.clientWidth || 900;
      const height = 380;

      const wrapper = d3
        .select(el)
        .style("position", "relative")
        .style("width", "100%");

      const svg = wrapper
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .style("background", "#080a0d")
        .style("borderRadius", "12px")
        .style("display", "block");

      const tooltip = wrapper
        .append("div")
        .style("position", "absolute")
        .style("pointerEvents", "none")
        .style("opacity", 0)
        .style("background", "rgba(20, 24, 32, 0.96)")
        .style("border", "1px solid rgba(255,255,255,0.12)")
        .style("color", "rgba(255,255,255,0.92)")
        .style("padding", "10px 12px")
        .style("borderRadius", "10px")
        .style("fontSize", "12px")
        .style("lineHeight", "1.25")
        .style("boxShadow", "0 10px 30px rgba(0,0,0,0.35)")
        .style("maxWidth", "240px");

      function nodeColor(d) {
        if (d.type === "origin") return "#ff4757";
        if ((d.bot_score ?? 0) > 0.65) return "#ffb347";
        return "#4d9fff";
      }

      function nodeRadius(d) {
        if (d.type === "origin") return 14;
        if (d.type === "amplifier") return 9;
        if (d.type === "propagator") return 6;
        return 7;
      }

      // Build simulation.
      const sim = d3
        .forceSimulation(safeNodes)
        .force(
          "link",
          d3
            .forceLink(safeEdges)
            .id((d) => d.id)
            .distance(60)
            .strength(0.8)
        )
        .force("charge", d3.forceManyBody().strength(-120))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg
        .append("g")
        .attr("stroke", "#ffffff22")
        .attr("stroke-width", 1)
        .selectAll("line")
        .data(safeEdges)
        .join("line");

      const node = svg
        .append("g")
        .selectAll("circle")
        .data(safeNodes)
        .join("circle")
        .attr("r", (d) => nodeRadius(d))
        .attr("fill", (d) => nodeColor(d))
        .attr("stroke", "rgba(255,255,255,0.25)")
        .attr("stroke-width", 1)
        .style("cursor", "grab")
        .call(
          d3
            .drag()
            .on("start", (event, d) => {
              if (!event.active) sim.alphaTarget(0.25).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on("end", (event, d) => {
              if (!event.active) sim.alphaTarget(0);
              d.fx = null;
              d.fy = null;
            })
        );

      node
        .on("mouseover", (event, d) => {
          tooltip.style("opacity", 1);
          tooltip.html(
            `<div style="font-weight:600; margin-bottom:6px;">${d.label || d.id}</div>
             <div><span style="opacity:0.75;">id:</span> ${d.id}</div>
             <div><span style="opacity:0.75;">bot_score:</span> ${Number(d.bot_score ?? 0).toFixed(
               2
             )}</div>
             <div><span style="opacity:0.75;">country:</span> ${d.country ?? "unknown"}</div>
             <div><span style="opacity:0.75;">followers:</span> ${d.follower_count ?? 0}</div>`
          );
        })
        .on("mousemove", (event) => {
          const [x, y] = d3.pointer(event, el);
          tooltip.style("left", `${x + 12}px`).style("top", `${y + 12}px`);
        })
        .on("mouseout", () => {
          tooltip.style("opacity", 0);
        });

      sim.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      });

      cleanup = () => {
        try {
          sim.stop();
        } catch (_) {
          // ignore
        }
      };
    }

    render();

    return () => {
      cancelled = true;
      cleanup();
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [graphData, safeNodes, safeEdges]);

  const cardStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "10px 12px",
    minWidth: 140,
    color: "rgba(255,255,255,0.92)",
  };

  const labelStyle = { fontSize: 12, opacity: 0.75, marginBottom: 4 };
  const valueStyle = { fontSize: 16, fontWeight: 700 };

  return (
    <div style={{ width: "100%" }}>
      <div ref={containerRef} />

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <div style={cardStyle}>
          <div style={labelStyle}>Total nodes</div>
          <div style={valueStyle}>{stats.total_nodes ?? safeNodes.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Bot accounts</div>
          <div style={valueStyle}>{stats.bot_account_count ?? "-"}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Reach estimate</div>
          <div style={valueStyle}>{stats.reach_estimate ?? "-"}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Peak spread time</div>
          <div style={valueStyle}>
            {stats.peak_spread_minutes != null ? `${stats.peak_spread_minutes} min` : "-"}
          </div>
        </div>
      </div>

      {summary ? (
        <div
          style={{
            marginTop: 10,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.65)",
            fontSize: 13,
          }}
        >
          {summary}
        </div>
      ) : null}
    </div>
  );
}
