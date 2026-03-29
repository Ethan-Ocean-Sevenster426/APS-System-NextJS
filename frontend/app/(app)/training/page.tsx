"use client";

const videos = [
  {
    title: "System Overview",
    description: "Learn how to navigate the FSA Management Platform",
    icon: "fa-desktop",
  },
  {
    title: "Inspection Records",
    description: "How to manage and upload inspection documents",
    icon: "fa-clipboard-check",
  },
  {
    title: "Client Management",
    description: "Managing client allocations and contact details",
    icon: "fa-users",
  },
  {
    title: "Export & Reporting",
    description: "Generating export sheets and reports",
    icon: "fa-file-export",
  },
];

export default function TrainingPage() {
  return (
    <>
    <div style={{ padding: "32px", background: "transparent", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "white", display: "inline-flex", alignItems: "center", gap: 12, margin: "0 0 6px", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          <i className="fas fa-video" style={{ color: "#5ee8ff" }} />
          Training Videos
        </h1>
        <p style={{ color: "rgba(255,255,255,0.9)", margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
          Watch these videos to learn how to use the FSA Management Platform effectively.
        </p>
      </div>

      {/* 2x2 Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
          gap: 24,
        }}
      >
        {videos.map((v) => (
          <div
            key={v.title}
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Video Placeholder */}
            <div
              style={{
                background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <i
                className="fas fa-play-circle"
                style={{ fontSize: "3.5rem", color: "#94a3b8" }}
              />
              {/* Coming Soon Badge */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "#007890",
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 9999,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Coming Soon
              </div>
            </div>

            {/* Card Body */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <i className={`fas ${v.icon}`} style={{ color: "#007890", fontSize: "1.1rem" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", margin: 0 }}>
                  {v.title}
                </h3>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.9rem", margin: 0, lineHeight: 1.5 }}>
                {v.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
