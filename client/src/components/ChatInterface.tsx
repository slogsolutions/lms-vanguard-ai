import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import { useLocation } from 'react-router-dom';

type Model = {
  id: string;
  name: string;
  type: 'offline' | 'online' | string;
  provider: string;
  status: string;
  desc?: string;
};

type Activity = {
  id: string;
  title: string;
  body: string;
  type: string;
  duration?: string;
  difficulty?: string;
  category?: string;
};

type Message = {
  role: 'ai' | 'user';
  text: string;
};

type TaskMode = {
  key: string;
  accent: string;
  glow: string;
  icon: string;
  label: string;
  modelHint: string;
  placeholder: string;
  starter: string;
  quickPrompts: string[];
  deliverables: string[];
  modelKeywords: string[];
};

const defaultMode: TaskMode = {
  key: 'general',
  accent: '#1B3A6B',
  glow: 'rgba(27,58,107,0.18)',
  icon: 'AI',
  label: 'Guided AI Workspace',
  modelHint: 'Use a balanced model for step-by-step guidance.',
  placeholder: 'Describe what you want to complete for this task...',
  starter: 'I will keep this workspace focused on the selected activity. Tell me your input and I will guide you step by step.',
  quickPrompts: ['Explain the task steps', 'Show a good example', 'Review my answer'],
  deliverables: ['Understand the task', 'Create the output', 'Review and improve it'],
  modelKeywords: [],
};

const translationTargets = [
  { code: 'hi', label: 'Hindi' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
];

const readableFileTypes = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/html',
];

const isReadableFile = (file: File) => {
  const name = file.name.toLowerCase();
  return readableFileTypes.includes(file.type)
    || ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.log'].some(ext => name.endsWith(ext));
};

const taskModes: Array<{ match: string[]; mode: TaskMode }> = [
  {
    match: ['basic prompting', 'prompt design'],
    mode: {
      key: 'prompting', accent: '#B86B24', glow: 'rgba(184,107,36,0.20)', icon: 'P1', label: 'Prompt Builder',
      modelHint: 'Uses local Ollama for prompt generation, rewriting, and normal chat.',
      placeholder: 'Ask anything, or paste a rough prompt to improve it...',
      starter: 'Prompting mode active. Use this as a normal Ollama chat workspace for prompt writing, prompt improvement, examples, and direct answers.',
      quickPrompts: ['Create a prompt template', 'Improve my pasted prompt', 'Explain prompt structure'],
      deliverables: ['Direct answer', 'Ready-to-use prompt', 'Clear role/context', 'Output format'],
      modelKeywords: ['llama', 'mistral', 'gpt', 'claude'],
    },
  },
  {
    match: ['video', 'video generation'],
    mode: {
      key: 'video', accent: '#AA3A5D', glow: 'rgba(170,58,93,0.20)', icon: 'VD', label: 'Video Prompt Studio',
      modelHint: 'Best with online or multimodal-capable models for video planning and generation prompts.',
      placeholder: 'Describe the video idea, scene, duration, style, and audience...',
      starter: 'Video mode active. I will help convert your idea into a scene-by-scene video prompt with style, camera, and narration cues.',
      quickPrompts: ['Create video prompt', 'Make storyboard', 'Add camera shots'],
      deliverables: ['Video concept', 'Scene breakdown', 'Camera/style notes', 'Final generation prompt'],
      modelKeywords: ['gemini', 'gpt', 'claude', 'copilot'],
    },
  },
  {
    match: ['voice', 'voice generation'],
    mode: {
      key: 'voice', accent: '#1F7A6D', glow: 'rgba(31,122,109,0.20)', icon: 'VO', label: 'Voice Script Lab',
      modelHint: 'Best with models that can polish scripts, tone, pacing, and pronunciation notes.',
      placeholder: 'Paste the text you want converted into voice, or describe the narration...',
      starter: 'Voice mode active. I will shape text into a voice-ready script with tone, pauses, and delivery notes.',
      quickPrompts: ['Make it voice-ready', 'Add pauses and tone', 'Create narration script'],
      deliverables: ['Clean script', 'Tone direction', 'Pause/pronunciation notes', 'Voice-ready final'],
      modelKeywords: ['gpt', 'claude', 'gemini', 'mistral'],
    },
  },
  {
    match: ['summarize', 'summarization', 'excel', 'word', 'pdf'],
    mode: {
      key: 'summary', accent: '#4A5FA8', glow: 'rgba(74,95,168,0.20)', icon: 'SM', label: 'Document Summarizer',
      modelHint: 'Best with long-context models for extracting key points from documents or tables.',
      placeholder: 'Paste the Excel/Word/PDF text or describe the document contents...',
      starter: 'Summarization mode active. Share the data and I will produce concise key points, action items, and a clean summary.',
      quickPrompts: ['Summarize in bullets', 'Extract action points', 'Make executive summary'],
      deliverables: ['Key points', 'Important facts', 'Action items', 'Short final summary'],
      modelKeywords: ['claude', 'gemini', 'gpt', 'llama'],
    },
  },
  {
    match: ['quiz', 'assessment'],
    mode: {
      key: 'quiz', accent: '#7B4AA8', glow: 'rgba(123,74,168,0.20)', icon: 'QZ', label: 'Quiz Maker',
      modelHint: 'Best with structured-output models that can produce questions, options, and answer keys.',
      placeholder: 'Paste the study data or topic for the quiz...',
      starter: 'Quiz mode active. Give me the source data and I will create questions, options, answers, and difficulty balance.',
      quickPrompts: ['Make 5 MCQs', 'Add answer key', 'Create easy to hard quiz'],
      deliverables: ['Questions', 'Options', 'Correct answers', 'Difficulty labels'],
      modelKeywords: ['gpt', 'claude', 'llama', 'mistral'],
    },
  },
  {
    match: ['translation', 'translate'],
    mode: {
      key: 'translation', accent: '#22749B', glow: 'rgba(34,116,155,0.20)', icon: 'TR', label: 'Translation Desk',
      modelHint: 'Runs through local LibreTranslate for this task workspace.',
      placeholder: 'Enter or upload text to translate with local LibreTranslate...',
      starter: 'Translation mode active. This workspace will use local LibreTranslate for the selected target language.',
      quickPrompts: ['Translate typed text', 'Translate uploaded file', 'Keep formal tone'],
      deliverables: ['Source meaning preserved', 'Local translation output', 'Tone check', 'Review notes'],
      modelKeywords: ['gemini', 'gpt', 'claude', 'llama'],
    },
  },
  {
    match: ['convert', 'data conversion'],
    mode: {
      key: 'conversion', accent: '#5D6B2F', glow: 'rgba(93,107,47,0.20)', icon: 'CV', label: 'Format Converter',
      modelHint: 'Best with structured-output models that can format tables, reports, and document-ready text.',
      placeholder: 'Paste the data and mention the target format: Excel, PDF, or Word...',
      starter: 'Conversion mode active. I will organize your data into the requested format structure.',
      quickPrompts: ['Make Excel table', 'Make Word report', 'Make PDF outline'],
      deliverables: ['Clean data structure', 'Target format layout', 'Headers/sections', 'Final formatted output'],
      modelKeywords: ['gpt', 'claude', 'gemini', 'copilot'],
    },
  },
  {
    match: ['formal communication', 'communication'],
    mode: {
      key: 'communication', accent: '#8A5A00', glow: 'rgba(138,90,0,0.20)', icon: 'FC', label: 'Formal Communication Desk',
      modelHint: 'Best with writing models that can control tone, hierarchy, and clarity.',
      placeholder: 'Tell me the recipient, purpose, key points, and tone...',
      starter: 'Formal communication mode active. I will help draft a respectful, clear, and properly structured message.',
      quickPrompts: ['Draft formal email', 'Make it respectful', 'Shorten this message'],
      deliverables: ['Subject/purpose', 'Formal greeting', 'Clear body', 'Respectful closing'],
      modelKeywords: ['gpt', 'claude', 'mistral', 'llama'],
    },
  },
];

const getTaskMode = (activity?: Activity | null) => {
  if (!activity) return defaultMode;
  const haystack = `${activity.title} ${activity.category ?? ''} ${activity.body}`.toLowerCase();
  return taskModes.find(({ match }) => match.some(term => haystack.includes(term)))?.mode ?? defaultMode;
};

const scoreModelForTask = (model: Model, mode: TaskMode, activity?: Activity | null) => {
  const text = `${model.name} ${model.provider} ${model.desc ?? ''}`.toLowerCase();
  const keywordScore = mode.modelKeywords.reduce((score, keyword) => score + (text.includes(keyword) ? 3 : 0), 0);
  const taskType = activity?.type?.toLowerCase() ?? '';
  const typeScore = taskType.includes('online') && model.type === 'online' ? 4 : taskType === 'offline' && model.type === 'offline' ? 4 : model.type === 'offline' ? 1 : 0;
  const status = (model.status ?? '').toLowerCase();
  const statusScore = status.includes('down') || status.includes('inactive') || status.includes('error') ? -4 : 1;

  // Prompting work benefits from low-latency local models; nudge selection toward offline.
  const promptingBias = mode.key === 'prompting' && model.type === 'offline' ? 3 : 0;

  return keywordScore + typeScore + statusScore + promptingBias;
};

const ChatInterface: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [translateTarget, setTranslateTarget] = useState('hi');
  const [fileStatus, setFileStatus] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const activityId = new URLSearchParams(location.search).get('activity');
  const mode = useMemo(() => getTaskMode(activity), [activity]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const [modelRes, activityRes] = await Promise.all([
          api.get('/models'),
          activityId ? api.get(`/content/${activityId}`) : Promise.resolve(null),
        ]);

        const modelData: Model[] = modelRes.data.success ? modelRes.data.data : [];
        const activityData: Activity | null = activityRes?.data?.success ? activityRes.data.data : null;
        const activeMode = getTaskMode(activityData);
        const candidateModels = activeMode.key === 'translation' || activeMode.key === 'prompting'
          ? modelData.filter(model => model.type === 'offline')
          : modelData;
        const bestModel = [...(candidateModels.length ? candidateModels : modelData)]
          .sort((a, b) => scoreModelForTask(b, activeMode, activityData) - scoreModelForTask(a, activeMode, activityData))[0] ?? null;

        setModels(modelData);
        setActivity(activityData);
        setSelectedModel(bestModel);
        setChatId(null);
        setMessages([{ role: 'ai', text: activityData
          ? `${activeMode.starter}\n\nCurrent task: ${activityData.title}\nModel selected: ${bestModel?.name ?? 'No model available'}\n\nUse the quick actions or send your task material to begin.`
          : `Welcome to the Defence AI Lab. Select an activity first, or ask a general AI learning question.` }]);
      } catch (err) {
        console.error('Workspace init error:', err);
        setMessages([{ role: 'ai', text: 'Workspace could not load task/model data. Please refresh once the server is running.' }]);
      }
    };

    fetchWorkspace();
  }, [activityId]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = async (overrideText?: string) => {
    const q = (overrideText ?? inputVal).trim();
    if (!q || loading || !selectedModel) return;

    setMessages(m => [...m, { role: 'user', text: q }]);
    setInputVal('');
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        message: q,
        modelId: selectedModel.id,
        chatId,
        activityId,
        translateTarget: mode.key === 'translation' ? translateTarget : undefined,
      });

      if (res.data?.success) {
        setMessages(m => [...m, { role: 'ai', text: res.data.reply }]);
        if (res.data.chatId) setChatId(res.data.chatId);
      } else {
        const errText =
          res.data?.error
          || res.data?.message
          || 'AI request failed. Check backend logs and model configuration.';
        setMessages(m => [...m, { role: 'ai', text: errText }]);
      }

      if (activityId) {
        await api.post(`/content/${activityId}/progress`, {
          status: 'inprogress',
          modelUsed: selectedModel.name,
        });
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'ai', text: 'Error connecting to AI mission control. Verify your backend server and selected model status.' }]);
    } finally {
      setLoading(false);
    }
  };

  const switchModel = (m: Model) => {
    setSelectedModel(m);
    setMessages(prev => [...prev, { role: 'ai', text: `Switched to ${m.name}. ${m.type === 'offline' ? 'Offline mode active.' : 'Online mode active. Do not share sensitive or classified information.'}\n\nI will still stay focused on: ${activity?.title ?? 'the current workspace'}.` }]);
  };

  const handleFileUpload = async (file?: File | null) => {
    if (!file || mode.key !== 'translation') return;
    if (file.size > 1024 * 1024) {
      setFileStatus('Use a text file under 1 MB for this demo workspace.');
      return;
    }
    if (!isReadableFile(file)) {
      setFileStatus('Upload a readable text file such as TXT, MD, CSV, JSON, XML, HTML, or LOG.');
      return;
    }

    try {
      const text = await file.text();
      const cleaned = text.trim();
      if (!cleaned) {
        setFileStatus('The selected file has no readable text.');
        return;
      }

      setInputVal(cleaned);
      setFileStatus(`${file.name} loaded. Review the text, then run translation.`);
    } catch {
      setFileStatus('Could not read this file. Try saving it as plain text first.');
    }
  };

  if (!selectedModel) return <div className="text-center py-20">Initializing AI Environment...</div>;

  const offline = models.filter(m => m.type === 'offline');
  const online = models.filter(m => m.type === 'online');

  return (
    <div className={`ai-workspace task-${mode.key}`} style={{ ['--task-accent' as string]: mode.accent, ['--task-glow' as string]: mode.glow }}>
      <div className="ai-sidebar">
        <div className="task-model-card">
          <div className="task-orb">{mode.icon}</div>
          <div>
            <div className="task-model-title">{mode.label}</div>
            <div className="task-model-copy">{mode.modelHint}</div>
          </div>
        </div>

        <div className="ai-sidebar-hdr"><p>Offline Models</p></div>
        {offline.map(m => (
          <div key={m.id} className={`model-item${selectedModel.id === m.id ? ' selected' : ''}`} onClick={() => switchModel(m)}>
            <div className="model-dot online" />
            <div><div className="model-name">{m.name}</div><div className="model-type">{m.desc}</div></div>
          </div>
        ))}
        <div className="ai-sidebar-hdr"><p>Online Models</p></div>
        {online.map(m => (
          <div key={m.id} className={`model-item${selectedModel.id === m.id ? ' selected' : ''}`} onClick={() => switchModel(m)}>
            <div className="model-dot online" />
            <div><div className="model-name">{m.name}</div><div className="model-type">{m.desc}</div></div>
          </div>
        ))}
      </div>

      <div className="ai-main">
        <div className="task-hero">
          <div className="task-hero-main">
            <div className="task-kicker">Active Task Workspace</div>
            <h2>{activity?.title ?? 'General AI Workspace'}</h2>
            <p>{activity?.body ?? 'Choose an activity from the Activity List to load a dedicated workspace.'}</p>
            <div className="task-chip-row">
              <span>{activity?.category ?? 'General'}</span>
              <span>{activity?.duration ?? 'Self-paced'}</span>
              <span>{activity?.difficulty ?? 'Guided'}</span>
              <span>{activity?.type ?? 'Offline+Online'}</span>
            </div>
          </div>
          <div className="task-hero-side">
            <div className="task-orb large">{mode.icon}</div>
            <div className="selected-model-pill">{selectedModel.name}</div>
          </div>
        </div>

        <div className="task-console-grid">
          <div className="task-brief-card">
            <div className="task-panel-title">Mission Deliverables</div>
            {mode.deliverables.map(item => <div key={item} className="deliverable-item">{item}</div>)}
          </div>
          <div className="task-brief-card">
            <div className="task-panel-title">Quick Actions</div>
            <div className="quick-prompt-grid">
              {mode.quickPrompts.map(prompt => (
                <button key={prompt} type="button" onClick={() => sendMsg(prompt)} disabled={loading}>{prompt}</button>
              ))}
            </div>
          </div>
        </div>

        {mode.key === 'translation' && (
          <div className="translation-panel">
            <div className="translation-control">
              <label htmlFor="translate-target">Target Language</label>
              <select
                id="translate-target"
                value={translateTarget}
                onChange={e => setTranslateTarget(e.target.value)}
              >
                {translationTargets.map(target => (
                  <option key={target.code} value={target.code}>{target.label}</option>
                ))}
              </select>
            </div>
            <div className="translation-control file-control">
              <label htmlFor="translate-file">Upload Text File</label>
              <input
                id="translate-file"
                type="file"
                accept=".txt,.md,.csv,.json,.xml,.html,.log,text/plain,text/markdown,text/csv,application/json"
                onChange={e => handleFileUpload(e.target.files?.[0])}
              />
              {fileStatus && <span className="file-status">{fileStatus}</span>}
            </div>
          </div>
        )}

        <div className="ai-chat-hdr">
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)' }}>{mode.label}</div>
            <div style={{ fontSize: 11, color: 'var(--silver)' }}>{selectedModel.provider} - {selectedModel.desc}</div>
          </div>
          <span className={`badge ${selectedModel.type}`}>{selectedModel.type === 'offline' ? 'Offline' : 'Online'}</span>
        </div>
        <div className="ai-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className={`msg-avatar ${m.role}`}>{m.role === 'ai' ? mode.icon : 'U'}</div>
              <div className="msg-bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            </div>
          ))}
          <div ref={msgEndRef} />
        </div>
        <div className="ai-input-area">
          <textarea
            className="ai-textarea"
            rows={2}
            placeholder={mode.placeholder}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          />
          <button className="send-btn" onClick={() => sendMsg()} disabled={loading}>{loading ? 'Working...' : 'Run Task'}</button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
