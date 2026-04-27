import React, { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { useLocation } from 'react-router-dom';

const ChatInterface: React.FC = () => {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const activityId = new URLSearchParams(location.search).get('activity');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await api.get('/models');
        if (res.data.success) {
          setModels(res.data.data);
          setSelectedModel(res.data.data[0]);
          setMessages([{ role: "ai", text: `Welcome to the Defense AI Lab. I am running on ${res.data.data[0].name}. Select an activity or ask me anything.` }]);
        }
      } catch (err) {
        console.error('Fetch models error:', err);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async () => {
    if (!inputVal.trim() || loading) return;
    const q = inputVal.trim();
    setMessages(m => [...m, { role: "user", text: q }]);
    setInputVal("");
    setLoading(true);

    try {
      const res = await api.post('/chat', { 
          message: q, 
          modelId: selectedModel.id, 
          chatId: chatId,
          activityId 
      });
      
      if (res.data.success) {
          setMessages(m => [...m, { role: "ai", text: res.data.reply }]);
          if (res.data.chatId) setChatId(res.data.chatId);
      }
      
      // If there's an activity, update progress
      if (activityId) {
          await api.post(`/content/${activityId}/progress`, { 
              status: 'inprogress', 
              modelUsed: selectedModel.name 
          });
      }
    } catch (err) {
      setMessages(m => [...m, { role: "ai", text: "Error connecting to AI mission control. Verify your network or local AI server status." }]);
    } finally {
      setLoading(false);
    }
  };

  const switchModel = (m: any) => {
    setSelectedModel(m);
    setMessages(prev => [...prev, { role: "ai", text: `Switched to ${m.name}. ${m.type === "offline" ? "✅ Offline mode active." : "⚠️ Online mode — use open source data only."}` }]);
  };

  if (!selectedModel) return <div className="text-center py-20">Initializing AI Environment...</div>;

  const offline = models.filter(m => m.type === "offline");
  const online = models.filter(m => m.type === "online");

  return (
    <div className="ai-workspace">
      {/* Model sidebar */}
      <div className="ai-sidebar">
        <div className="ai-sidebar-hdr"><p>🔒 Offline Models</p></div>
        {offline.map(m => (
          <div key={m.id} className={`model-item${selectedModel.id === m.id ? " selected" : ""}`} onClick={() => switchModel(m)}>
            <div className={`model-dot online`} />
            <div><div className="model-name">{m.name}</div><div className="model-type">{m.desc}</div></div>
          </div>
        ))}
        <div className="ai-sidebar-hdr" style={{ marginTop: 0 }}><p>🌐 Online Models</p></div>
        {online.map(m => (
          <div key={m.id} className={`model-item${selectedModel.id === m.id ? " selected" : ""}`} onClick={() => switchModel(m)}>
            <div className={`model-dot online`} />
            <div><div className="model-name">{m.name}</div><div className="model-type">{m.desc}</div></div>
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div className="ai-main">
        <div className="ai-chat-hdr">
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>{selectedModel.name}</div>
            <div style={{ fontSize: 11, color: "var(--silver)" }}>{selectedModel.provider} • {selectedModel.desc}</div>
          </div>
          <span className={`badge ${selectedModel.type}`}>{selectedModel.type === "offline" ? "🔒 Offline" : "🌐 Online"}</span>
        </div>
        <div className="ai-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className={`msg-avatar ${m.role}`}>{m.role === "ai" ? "AI" : "U"}</div>
              <div className="msg-bubble" style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          ))}
          <div ref={msgEndRef} />
        </div>
        <div className="ai-input-area">
          <textarea
            className="ai-textarea"
            rows={2}
            placeholder={`Ask ${selectedModel.name}…`}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          />
          <button className="send-btn" onClick={sendMsg} disabled={loading}>{loading ? "..." : "Send ▶"}</button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
