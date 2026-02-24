import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";

const NODE_COLORS = {
  paper: "#2563eb",
  section: "#16a34a",
  term: "#7c3aed",
  point: "#f59e0b",
  contribution: "#0891b2",
  limitation: "#dc2626",
  future: "#4f46e5",
};

function Graph3DView({ graphData, selectedNodeId, onNodeClick }) {
  const wrapperRef = useRef(null);
  const graphRef = useRef(null);
  const [size, setSize] = useState({ width: 900, height: 520 });

  useEffect(() => {
    const updateSize = () => {
      if (!wrapperRef.current) {
        return;
      }
      setSize({
        width: wrapperRef.current.clientWidth,
        height: Math.max(460, Math.min(640, window.innerHeight * 0.65)),
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (!graphRef.current || !graphData?.nodes?.length) {
      return;
    }

    graphRef.current.d3Force("charge").strength(-95);
    graphRef.current.d3Force("link").distance(58);
    graphRef.current.d3Force("center").strength(0.08);
  }, [graphData]);

  const decoratedGraph = useMemo(() => {
    if (!graphData) {
      return { nodes: [], links: [] };
    }

    return {
      nodes: graphData.nodes.map((node) => ({
        ...node,
        color:
          node.id === selectedNodeId
            ? "#f97316"
            : NODE_COLORS[node.type] || "#6b7280",
        val: node.value || 5,
      })),
      links: graphData.links,
    };
  }, [graphData, selectedNodeId]);

  if (!decoratedGraph.nodes.length) {
    return (
      <div className="h-[460px] flex items-center justify-center text-gray-500 bg-gray-100 rounded-lg border border-gray-200">
        3D graph will appear after analysis completes.
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full min-h-[460px] rounded-lg overflow-hidden border border-gray-200"
    >
      <ForceGraph3D
        ref={graphRef}
        width={size.width}
        height={size.height}
        graphData={decoratedGraph}
        backgroundColor="#f8fafc"
        nodeLabel={(node) => `${node.name} (${node.type})`}
        nodeAutoColorBy="type"
        nodeColor={(node) => node.color}
        nodeOpacity={0.92}
        linkColor={() => "rgba(30, 41, 59, 0.38)"}
        linkOpacity={0.55}
        linkWidth={0.8}
        onNodeClick={(node) => onNodeClick?.(node)}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />
    </div>
  );
}

export default Graph3DView;
