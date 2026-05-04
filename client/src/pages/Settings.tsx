function PageSettings() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          {
            title: "🤖 Ollama Configuration",
            fields: [
              { l: "Ollama Host URL", v: "http://localhost:11434", t: "input" },
              { l: "Default Model", v: "llama3.1:70b", t: "input" },
              { l: "Max Context Length", v: "4096", t: "input" },
              { l: "Temperature", v: "0.7", t: "input" },
            ],
          },
          {
            title: "🌐 Online API Keys",
            fields: [
              { l: "Google Gemini API Key", v: "••••••••••••••••••••", t: "input" },
              { l: "Anthropic (Claude) API Key", v: "••••••••••••••••••••", t: "input" },
              { l: "OpenAI API Key", v: "••••••••••••••••••••", t: "input" },
              { l: "Microsoft Copilot Token", v: "••••••••••••••••••••", t: "input" },
            ],
          },
          {
            title: "🏛️ Institution Settings",
            fields: [
              { l: "Lab Name", v: "Defence AI Lab — BEG Centre", t: "input" },
              { l: "Commanding Officer", v: "Col. Rajiv Mehta", t: "input" },
              { l: "Lab Location", v: "Roorkee, Uttarakhand", t: "input" },
              { l: "Academic Year", v: "2026", t: "input" },
            ],
          },
          {
            title: "🔒 Security Settings",
            fields: [
              { l: "Session Timeout (minutes)", v: "90", t: "input" },
              { l: "Data Classification", v: "Restricted", t: "input" },
              { l: "Audit Log Retention", v: "365 days", t: "input" },
              { l: "Allowed Networks (CIDR)", v: "10.0.0.0/8", t: "input" },
            ],
          },
        ].map((box, i) => (
          <div key={i} className="section-card">
            <div className="card-header">
              <div className="card-title">{box.title}</div>
            </div>
            <div className="card-body">
              <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                {box.fields.map((f, j) => (
                  <div key={j} className="form-group">
                    <label className="form-label">{f.l}</label>
                    <input
                      className="form-input"
                      defaultValue={f.v}
                      type={f.l.toLowerCase().includes("key") || f.l.toLowerCase().includes("token") ? "password" : "text"}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <button className="topbar-btn primary">Save</button>
                <button className="topbar-btn">Test Connection</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="section-card" style={{ marginTop: 0 }}>
        <div className="card-header">
          <div className="card-title">ℹ️ System Information</div>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              ["LMS Version", "v2.1.0"],
              ["Ollama Version", "0.4.1"],
              ["Server OS", "Ubuntu 22.04 LTS"],
              ["Last Backup", "27 Apr 2026 06:00"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "var(--mist)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--silver)", marginBottom: 4 }}>{k}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default PageSettings;

