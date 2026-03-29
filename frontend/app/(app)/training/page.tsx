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
      <style>{`
.tr-container { padding: 32px; background: transparent; min-height: 100vh; box-sizing: border-box; }
.tr-header { margin-bottom: 32px; text-align: center; }
.tr-header h1 { font-size: 1.75rem; font-weight: 700; color: white; display: inline-flex; align-items: center; gap: 12px; margin: 0 0 6px; text-shadow: 0 1px 4px rgba(0,0,0,0.5); }
.tr-header p { color: rgba(255,255,255,0.9); margin: 0; text-shadow: 0 1px 3px rgba(0,0,0,0.4); font-size: 0.9rem; }
.tr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 24px; }
.tr-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); overflow: hidden; position: relative; }
.tr-video-placeholder { background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); height: 200px; display: flex; align-items: center; justify-content: center; position: relative; }
.tr-badge { position: absolute; top: 12px; right: 12px; background: #007890; color: #fff; font-size: 0.7rem; font-weight: 600; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.05em; text-transform: uppercase; }
.tr-card-body { padding: 20px 24px; }
.tr-card-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.tr-card-title { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin: 0; }
.tr-card-desc { color: #64748b; font-size: 0.9rem; margin: 0; line-height: 1.5; }

@media (max-width: 768px) {
  .tr-container { padding: 16px 12px; }
  .tr-header { margin-bottom: 20px; }
  .tr-header h1 { font-size: 1.25rem; }
  .tr-header p { font-size: 0.8rem; }
  .tr-grid { grid-template-columns: 1fr; gap: 16px; }
  .tr-video-placeholder { height: 160px; }
  .tr-card-body { padding: 14px 16px; }
  .tr-card-title { font-size: 1rem; }
  .tr-card-desc { font-size: 0.8rem; }
}
@media (max-width: 480px) {
  .tr-container { padding: 12px 8px; }
  .tr-header h1 { font-size: 1.1rem; }
  .tr-video-placeholder { height: 140px; }
}
      `}</style>

      <div className="tr-container">
        {/* Header */}
        <div className="tr-header">
          <h1>
            <i className="fas fa-video" style={{ color: "#5ee8ff" }} />
            Training Videos
          </h1>
          <p>
            Watch these videos to learn how to use the FSA Management Platform effectively.
          </p>
        </div>

        {/* Grid */}
        <div className="tr-grid">
          {videos.map((v) => (
            <div key={v.title} className="tr-card">
              {/* Video Placeholder */}
              <div className="tr-video-placeholder">
                <i className="fas fa-play-circle" style={{ fontSize: "3.5rem", color: "#94a3b8" }} />
                <div className="tr-badge">Coming Soon</div>
              </div>

              {/* Card Body */}
              <div className="tr-card-body">
                <div className="tr-card-title-row">
                  <i className={`fas ${v.icon}`} style={{ color: "#007890", fontSize: "1.1rem" }} />
                  <h3 className="tr-card-title">{v.title}</h3>
                </div>
                <p className="tr-card-desc">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
