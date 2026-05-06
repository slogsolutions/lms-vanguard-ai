import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import { useLocation } from 'react-router-dom';
import { extractTextFromFile } from '../utils/documentExtractor';
import { downloadOriginalFile, exportPdfToWordLayout, exportToExcel, exportToPDF, exportToWord, mergeExcelFiles, mergePdfFiles } from '../utils/documentExporter';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, RadialLinearScale, Filler } from 'chart.js';
import { Pie, Doughnut, Bar, Line, PolarArea } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, RadialLinearScale, Filler);

type ChatHistoryItem = {
  id: string;
  createdAt: string;
  messages?: Message[];
};

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

type WorkspaceFile = {
  name: string;
  size: number;
  file: File;
  ext: string;
  text?: string;
};
type FormalCommType = 'Email' | 'Letter' | 'Message' | 'Notice' | 'Application' | 'Report';
type FormalCommLanguage = 'English' | 'Hindi';

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
  const readableExts = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.log', '.xlsx', '.xls', '.pdf', '.docx'];
  return readableFileTypes.includes(file.type) || readableExts.some(ext => name.endsWith(ext));
};

const getFileExt = (fileName: string) => fileName.toLowerCase().split('.').pop() ?? '';

const getOutputExt = (format: 'excel' | 'pdf' | 'word') => {
  if (format === 'excel') return 'xlsx';
  if (format === 'word') return 'docx';
  return 'pdf';
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
      key: 'voice', accent: '#1F7A6D', glow: 'rgba(31,122,109,0.20)', icon: 'VO', label: 'AI Voice Generator',
      modelHint: 'Uses the local Piper TTS service to generate playable WAV audio from text.',
      placeholder: 'Enter the exact text you want to generate as voice...',
      starter: 'Voice generation mode active. Enter text and I will prepare a clean TTS-ready response you can play as audio.',
      quickPrompts: ['Generate voice from this text', 'Clean this for TTS', 'Create short narration'],
      deliverables: ['Playable audio', 'Clean transcript', 'Single WAV output', 'Local TTS generation'],
      modelKeywords: ['llama', 'mistral', 'phi', 'gemma'],
    },
  },
  {
    match: ['summarize', 'summarization', 'excel', 'word', 'pdf'],
    mode: {
      key: 'summary', accent: '#4A5FA8', glow: 'rgba(74,95,168,0.20)', icon: 'SM', label: 'Document Summarizer',
      modelHint: 'Upload documents and ask any question. Supports charts, tables, and Hindi/Hinglish.',
      placeholder: 'Ask anything about the uploaded document... try "show pie chart" or "summarize karo"',
      starter: 'Document analysis mode active. Upload Excel, Word, or PDF files — then ask any question. I can summarize, extract data, generate charts (pie, bar, doughnut, line), and answer in English or Hindi/Hinglish.',
      quickPrompts: ['Summarize in bullets', 'Show data as pie chart', 'Key findings batao', 'Extract all numbers', 'Make bar chart', 'List action items'],
      deliverables: ['Key points & summary', 'Interactive charts', 'Data analysis', 'Hindi/Hinglish support', 'Follow-up Q&A'],
      modelKeywords: ['llama', 'mistral', 'phi', 'gemma'],
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
      modelHint: 'Uses local AI models for high-quality, structured translation.',
      placeholder: 'Enter or upload text to translate...',
      starter: 'Translation mode active. I will preserve the structure and layout of your documents while translating.',
      quickPrompts: ['Translate typed text', 'Translate uploaded file', 'Keep formal tone'],
      deliverables: ['Structure preserved', 'High-quality translation', 'Local processing'],
      modelKeywords: ['gemini', 'gpt', 'claude', 'llama'],
    },
  },
  {
    match: ['convert', 'data conversion'],
    mode: {
      key: 'conversion', accent: '#5D6B2F', glow: 'rgba(93,107,47,0.20)', icon: 'CV', label: 'Format Converter',
      modelHint: 'Offline file conversion, extraction, and merge tools run in this workspace.',
      placeholder: 'Paste the data and mention the target format: Excel, PDF, or Word...',
      starter: 'Conversion mode active. Upload files to extract, convert, or merge them locally in this workspace.',
      quickPrompts: ['Extract uploaded files', 'Convert first file', 'Merge uploaded files'],
      deliverables: ['Upload source files', 'Extract readable content', 'Convert to Excel/PDF/Word', 'Merge multiple files'],
      modelKeywords: ['llama', 'mistral', 'phi', 'gemma'],
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
  if (haystack.includes('voice') || haystack.includes('text-to-speech') || haystack.includes('tts')) {
    return taskModes.find(({ mode }) => mode.key === 'voice')?.mode ?? defaultMode;
  }
  if (haystack.includes('convert') || haystack.includes('data conversion') || haystack.includes('merger')) {
    return taskModes.find(({ mode }) => mode.key === 'conversion')?.mode ?? defaultMode;
  }
  if (haystack.includes('summarize') || haystack.includes('summarization') || haystack.includes('summary')) {
    return taskModes.find(({ mode }) => mode.key === 'summary')?.mode ?? defaultMode;
  }
  if (haystack.includes('translate') || haystack.includes('translation')) {
    return taskModes.find(({ mode }) => mode.key === 'translation')?.mode ?? defaultMode;
  }
  if (haystack.includes('quiz') || haystack.includes('assessment')) {
    return taskModes.find(({ mode }) => mode.key === 'quiz')?.mode ?? defaultMode;
  }
  if (haystack.includes('communication') || haystack.includes('formal desk')) {
    return taskModes.find(({ mode }) => mode.key === 'communication')?.mode ?? defaultMode;
  }
  if (haystack.includes('video') || haystack.includes('scene planner')) {
    return taskModes.find(({ mode }) => mode.key === 'video')?.mode ?? defaultMode;
  }

  return defaultMode;
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

const VoicePlayer = ({ text }: { text: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ttsText = text.trim();

  const handlePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setLoading(true);
    try {
      const ttsUrl = `${(api.defaults.baseURL || 'http://localhost:5005/api').replace(/\/$/, '')}/tts`;
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText }),
      });
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || `TTS failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '400px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button 
          onClick={handlePlay} 

          disabled={loading || !ttsText}
          style={{
            width: '44px', height: '44px', borderRadius: '50%', background: 'var(--task-accent)', color: '#fff',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            fontSize: '18px', flexShrink: 0, transition: 'transform 0.1s'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {loading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', marginBottom: '4px' }}>AI Generated Voice</div>
          <div style={{ height: '6px', background: 'var(--mist)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
            {isPlaying && (
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: '100%',
                background: 'var(--task-accent)', opacity: 0.4,
                animation: 'pulse 1s infinite alternate'
              }} />
            )}
            <div style={{ width: isPlaying ? '100%' : '0%', height: '100%', background: 'var(--task-accent)', transition: isPlaying ? 'width 10s linear' : 'width 0.2s' }} />
          </div>
        </div>
      </div>
      <details style={{ fontSize: '12px', color: 'var(--steel)' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>View Transcript</summary>
        <div style={{ marginTop: '10px', padding: '10px', background: 'var(--mist)', borderRadius: '6px', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: 'var(--navy)' }}>
          {ttsText}
        </div>
      </details>
      <style>{`@keyframes pulse { from { opacity: 0.4; } to { opacity: 0.8; } }`}</style>
    </div>
  );
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
  const [attachedText, setAttachedText] = useState<string | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [conversionFormat, setConversionFormat] = useState<'excel' | 'pdf' | 'word'>('pdf');
  const [extractionPreview, setExtractionPreview] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [commType, setCommType] = useState<FormalCommType>('Email');
  const [commLang, setCommLang] = useState<FormalCommLanguage>('English');
  const [commTo, setCommTo] = useState('');
  const [commSubject, setCommSubject] = useState('');
  const [commSalutation, setCommSalutation] = useState('');
  const [commBody, setCommBody] = useState('');
  const [commClosing, setCommClosing] = useState('');
  const [commSender, setCommSender] = useState('');
  const [commDate, setCommDate] = useState('');
  const [commLocation, setCommLocation] = useState('');

  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const activityId = new URLSearchParams(location.search).get('activity');
  const mode = useMemo(() => getTaskMode(activity), [activity]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        setHistoryLoading(true);
        const [modelRes, activityRes, historyRes] = await Promise.all([
          api.get('/models'),
          activityId ? api.get(`/content/${activityId}`) : Promise.resolve(null),
          api.get('/chats'),
        ]);

        const modelData: Model[] = modelRes.data.success ? modelRes.data.data : [];
        const activityData: Activity | null = activityRes?.data?.success ? activityRes.data.data : null;
        const historyData: ChatHistoryItem[] = historyRes.data.success ? historyRes.data.data : [];

        setChatHistory(historyData);

        const activeMode = getTaskMode(activityData);
        const candidateModels = activeMode.key === 'translation' || activeMode.key === 'prompting' || activeMode.key === 'conversion' || activeMode.key === 'voice'
          ? modelData.filter(model => model.type === 'offline')
          : modelData;
        const bestModel = [...(candidateModels.length ? candidateModels : modelData)]
          .sort((a, b) => scoreModelForTask(b, activeMode, activityData) - scoreModelForTask(a, activeMode, activityData))[0] ?? null;

        setModels(modelData);
        setActivity(activityData);
        setSelectedModel(bestModel);
        setChatId(null);
        setMessages([{
          role: 'ai', text: activityData
            ? `${activeMode.starter}\n\nCurrent task: ${activityData.title}\nModel selected: ${bestModel?.name ?? 'No model available'}\n\nUse the quick actions or send your task material to begin.`
            : `Welcome to the Defence AI Lab. Select an activity first, or ask a general AI learning question.`
        }]);
      } catch (err) {
        console.error('Workspace init error:', err);
        setMessages([{ role: 'ai', text: 'Workspace could not load task/model data. Please refresh once the server is running.' }]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchWorkspace();
  }, [activityId]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = async (overrideText?: string, overrideChatId?: string) => {
    const q = (overrideText ?? inputVal).trim();
    if (!q || loading || !selectedModel) return;

    if (mode.key === 'voice') {
      setMessages(m => [...m, { role: 'user', text: q }, { role: 'ai', text: q }]);
      setInputVal('');

      if (activityId) {
        try {
          await api.post(`/content/${activityId}/progress`, {
            status: 'inprogress',
            modelUsed: 'Piper TTS',
          });
        } catch (err) {
          console.error('Progress update failed:', err);
        }
      }

      return;
    }

    if (mode.key === 'summary') {
      const workspaceText = workspaceFiles.length > 0 ? await getMergedWorkspaceContent() : '';
      const finalMsg = workspaceText
        ? `The following is the extracted content from the uploaded document(s):\n\n---\n${workspaceText}\n---\n\nUser question: ${q}`
        : q;

      setMessages(m => [...m, { role: 'user', text: q }]);
      setInputVal('');
      setLoading(true);

      try {
        const res = await api.post('/chat', {
          message: finalMsg,
          modelId: selectedModel.id,
          chatId,
          activityId,
        });

        if (res.data?.success) {
          setMessages(m => [...m, { role: 'ai', text: res.data.reply }]);
          if (res.data.chatId) setChatId(res.data.chatId);
        } else {
          setMessages(m => [...m, { role: 'ai', text: res.data.error || 'Failed to generate summary.' }]);
        }
      } catch (err) {
        setMessages(m => [...m, { role: 'ai', text: 'Error generating summary. Check connection.' }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    const currentChatId = overrideChatId || chatId;

    setMessages(m => [...m, { role: 'user', text: q }]);
    setInputVal('');
    setLoading(true);

    try {
      const res = await api.post('/chat', {
        message: q,
        modelId: selectedModel.id,
        chatId: currentChatId,
        activityId,
        translateTarget: mode.key === 'translation' ? translateTarget : undefined,
      });

      if (res.data?.success) {
        setMessages(m => [...m, { role: 'ai', text: res.data.reply }]);
        if (res.data.chatId) setChatId(res.data.chatId);

        // Refresh history
        const histRes = await api.get('/chats');
        if (histRes.data.success) setChatHistory(histRes.data.data);
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

  const buildFormalCommPrompt = () => {
    const lines: string[] = [];
    lines.push('Context: This is for legitimate official/administrative communication. Do not fabricate facts. Only refuse if the user explicitly asks for deception/forgery/impersonation.');
    lines.push(`Language: ${commLang}`);
    lines.push(`Type: ${commType}`);
    if (commType !== 'Message') lines.push(`To/Authority/Receiver: ${commTo || 'Name Not Provided'}`);
    lines.push(`Subject/Title: ${commSubject || 'Generate from purpose/details'}`);
    lines.push(`Salutation: ${commSalutation || (commLang === 'Hindi' ? 'महोदय/महोदया,' : 'Sir/Madam,')}`);
    lines.push(`Body/Purpose:\n${commBody || inputVal || ''}`.trim());
    lines.push(`Closing: ${commClosing || (commLang === 'Hindi' ? 'भवदीय,' : 'Yours faithfully,')}`);
    lines.push(`Sender Name: ${commSender || 'Name Not Provided'}`);
    if (commType === 'Notice' || commType === 'Report') lines.push(`Date: ${commDate || 'Date Not Provided'}`);
    if (commType === 'Report') lines.push(`Location: ${commLocation || 'Location Not Provided'}`);

    return lines.join('\n');
  };

  const exportCommunicationText = (text: string) => {
    const content = (text || '').trim();
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formal-communication-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const switchModel = (m: Model) => {
    setSelectedModel(m);
    setMessages(prev => [...prev, { role: 'ai', text: `Switched to ${m.name}. ${m.type === 'offline' ? 'Offline mode active.' : 'Online mode active. Do not share sensitive or classified information.'}\n\nI will still stay focused on: ${activity?.title ?? 'the current workspace'}.` }]);
  };

  const exportConvertedContent = (content: string, title: string) => {
    if (conversionFormat === 'excel') {
      exportToExcel(title, content);
      return;
    }

    if (conversionFormat === 'word') {
      exportToWord(title, content);
      return;
    }

    exportToPDF(title, content);
  };

  const getMergedWorkspaceContent = async () => {
    const filesWithText = await Promise.all(workspaceFiles.map(async file => ({
      ...file,
      text: file.text ?? (await extractTextFromFile(file.file)).trim(),
    })));

    setWorkspaceFiles(filesWithText);
    return filesWithText
      .map(file => `Source: ${file.name}\n${file.text}`)
      .join('\n\n---\n\n')
      .trim();
  };

  const extractWorkspacePreview = async () => {
    if (!workspaceFiles.length) {
      setFileStatus('Upload one or more files before extracting.');
      return;
    }

    try {
      setLoading(true);
      setFileStatus('Extracting readable text locally...');
      const extracted = await Promise.all(workspaceFiles.map(async item => ({
        ...item,
        text: item.text ?? (await extractTextFromFile(item.file)).trim(),
      })));

      setWorkspaceFiles(extracted);
      const preview = extracted
        .map(file => `File: ${file.name}\n${(file.text ?? '').slice(0, 1200)}${(file.text?.length ?? 0) > 1200 ? '\n...' : ''}`)
        .join('\n\n');

      setExtractionPreview(preview);
      setFileStatus(`Extracted readable text from ${extracted.length} file${extracted.length === 1 ? '' : 's'}.`);
    } catch (err: any) {
      setFileStatus(`Error: ${err.message || 'Could not extract the selected files.'}`);
    } finally {
      setLoading(false);
    }
  };

  const convertWorkspaceFiles = async () => {
    if (!workspaceFiles.length) {
      setFileStatus('Upload one or more files before converting.');
      return;
    }

    try {
      setLoading(true);
      const first = workspaceFiles[0];
      const targetExt = getOutputExt(conversionFormat);
      const sourceBaseName = first.name.replace(/\.[^.]+$/, '') || 'Converted_File';

      if (first.ext === targetExt || (conversionFormat === 'excel' && ['xlsx', 'xls'].includes(first.ext))) {
        downloadOriginalFile(first.file, `${sourceBaseName}.${targetExt}`);
        setFileStatus(`Downloaded ${first.name} in its original layout.`);
        return;
      }

      if (first.ext === 'pdf' && conversionFormat === 'word') {
        await exportPdfToWordLayout(first.file, sourceBaseName);
        setFileStatus(`Converted ${first.name} to Word with the PDF page layout preserved.`);
        return;
      }

      const text = first.text ?? (await extractTextFromFile(first.file)).trim();
      setWorkspaceFiles(prev => prev.map((item, index) => index === 0 ? { ...item, text } : item));
      exportConvertedContent(text, sourceBaseName);
      setFileStatus(`Converted ${first.name} to ${conversionFormat.toUpperCase()} using extracted readable content.`);
    } catch (err: any) {
      setFileStatus(`Error: ${err.message || 'Could not convert the selected file.'}`);
    } finally {
      setLoading(false);
    }
  };

  const mergeWorkspaceFiles = async () => {
    if (workspaceFiles.length < 2) {
      setFileStatus('Upload at least two files to merge.');
      return;
    }

    try {
      setLoading(true);
      const files = workspaceFiles.map(item => item.file);
      const allPdf = workspaceFiles.every(item => item.ext === 'pdf');
      const allExcel = workspaceFiles.every(item => ['xlsx', 'xls'].includes(item.ext));

      if (conversionFormat === 'pdf' && allPdf) {
        await mergePdfFiles(files, 'Merged_Files');
        setFileStatus(`Merged ${workspaceFiles.length} PDFs page-for-page without extracting text.`);
        return;
      }

      if (conversionFormat === 'excel' && allExcel) {
        await mergeExcelFiles(files, 'Merged_Files');
        setFileStatus(`Merged ${workspaceFiles.length} Excel files into one workbook with separate sheets.`);
        return;
      }

      const mergedContent = await getMergedWorkspaceContent();
      exportConvertedContent(mergedContent, 'Merged_Files');
      setFileStatus(`Merged ${workspaceFiles.length} files into one ${conversionFormat.toUpperCase()} output from extracted readable content.`);
    } catch (err: any) {
      setFileStatus(`Error: ${err.message || 'Could not merge the selected files.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files?: FileList | null) => {
    const fileList = Array.from(files ?? []);
    if (!fileList.length || (mode.key !== 'translation' && mode.key !== 'quiz' && mode.key !== 'conversion' && mode.key !== 'summary')) return;

    if (mode.key === 'summary') {
      const tooLarge = fileList.find(file => file.size > 25 * 1024 * 1024);
      if (tooLarge) {
        setFileStatus(`${tooLarge.name} is too large. Use files under 25 MB.`);
        return;
      }
      const unreadable = fileList.find(file => !isReadableFile(file));
      if (unreadable) {
        setFileStatus(`Cannot read ${unreadable.name}. Use PDF, Word, Excel, CSV, or text files.`);
        return;
      }

      try {
        setLoading(true);
        setFileStatus(`Processing ${fileList.length} file${fileList.length === 1 ? '' : 's'}...`);
        const uploaded: WorkspaceFile[] = await Promise.all(fileList.map(async file => {
          const text = await extractTextFromFile(file);
          return {
            name: file.name,
            size: file.size,
            file,
            ext: getFileExt(file.name),
            text: text.trim(),
          };
        }));

        const allFiles = [...workspaceFiles, ...uploaded];
        setWorkspaceFiles(allFiles);
        setAttachedText(allFiles.map(f => f.name).join(', '));
        const preview = allFiles
          .map(f => `File: ${f.name}\n${(f.text ?? '').slice(0, 1200)}${(f.text?.length ?? 0) > 1200 ? '\n...' : ''}`)
          .join('\n\n');
        setExtractionPreview(preview);
        setFileStatus(`${allFiles.length} file${allFiles.length === 1 ? '' : 's'} ready for summarization.`);
      } catch (err: any) {
        setFileStatus(`Error: ${err.message || 'Could not process the selected files.'}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode.key === 'conversion') {
      const tooLarge = fileList.find(file => file.size > 25 * 1024 * 1024);
      if (tooLarge) {
        setFileStatus(`${tooLarge.name} is too large. Use files under 25 MB for offline conversion.`);
        return;
      }

      const unreadable = fileList.find(file => !isReadableFile(file));
      if (unreadable) {
        setFileStatus(`Cannot read ${unreadable.name}. Use TXT, CSV, JSON, XML, HTML, Excel, PDF, or Word files.`);
        return;
      }

      try {
        setLoading(true);
        setFileStatus(`Added ${fileList.length} file${fileList.length === 1 ? '' : 's'} to the offline workspace.`);
        const uploaded = fileList.map(file => ({
          name: file.name,
          size: file.size,
          file,
          ext: getFileExt(file.name),
        }));

        setWorkspaceFiles(prev => [...prev, ...uploaded]);
        setAttachedText(uploaded.map(file => file.name).join(', '));
        setExtractionPreview('');
        setFileStatus(`${uploaded.length} file${uploaded.length === 1 ? '' : 's'} ready. PDF merge will keep original pages intact.`);
      } catch (err: any) {
        console.error('Conversion upload error:', err);
        setFileStatus(`Error: ${err.message || 'Could not add the selected files.'}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    const file = fileList[0];
    if (file.size > 2 * 1024 * 1024) {
      setFileStatus('Use a text file under 2 MB for this workspace.');
      return;
    }
    if (!isReadableFile(file)) {
      setFileStatus('Upload a readable text file such as TXT, MD, CSV, JSON, XML, HTML, or LOG.');
      return;
    }

    try {
      setLoading(true);
      setFileStatus(`Extracting text from ${file.name}...`);
      const text = await extractTextFromFile(file);
      const cleaned = text.trim();
      if (!cleaned) {
        setFileStatus('The selected file has no readable text.');
        setLoading(false);
        return;
      }

      setFileStatus(`Indexing ${file.name} for smart retrieval...`);
      const res = await api.post('/chat/ingest', {
        text: cleaned,
        chatId,
        fileName: file.name
      });

      if (res.data.success) {
        const newChatId = res.data.chatId;
        if (newChatId) setChatId(newChatId);
        setAttachedText(file.name);
        setFileStatus(`${file.name} attached successfully!`);

        // Auto-trigger translation if in translation mode
        if (mode.key === 'translation') {
          // Pass newChatId directly to ensure it uses the correct session
          sendMsg(`Please translate the uploaded document: ${file.name}`, newChatId);
        }

        // Auto-trigger summarization if in summary mode
        if (mode.key === 'summary') {
          sendMsg(`Please provide a detailed summary of the document: ${file.name}`, newChatId);
        }
      } else {
        setFileStatus(`Upload failed: ${res.data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('File extraction error:', err);
      const msg = err.response?.data?.error || err.message || 'Could not index this file.';
      setFileStatus(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/chats/${id}/messages`);
      if (res.data.success) {
        setMessages(res.data.data.map((m: any) => ({ role: m.role, text: m.content })));
        setChatId(id);
      }
    } catch (err) {
      console.error('Load chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setChatId(null);
    setMessages([{
      role: 'ai', text: activity
        ? `${mode.starter}\n\nCurrent task: ${activity.title}\nModel selected: ${selectedModel?.name ?? 'No model available'}\n\nUse the quick actions or send your task material to begin.`
        : `Welcome to the Defence AI Lab. Select an activity first, or ask a general AI learning question.`
    }]);
    setAttachedText(null);
    setWorkspaceFiles([]);
    setExtractionPreview('');
    setInputVal('');
    setFileStatus('');
  };

  if (!selectedModel) return <div className="text-center py-20">Initializing AI Environment...</div>;

  if (mode.key === 'conversion') {
    return (
      <ConverterWorkspace
        mode={mode}
        activity={activity}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        workspaceFiles={workspaceFiles}
        setWorkspaceFiles={setWorkspaceFiles}
        extractionPreview={extractionPreview}
        setExtractionPreview={setExtractionPreview}
        fileStatus={fileStatus}
        setFileStatus={setFileStatus}
        loading={loading}
        conversionFormat={conversionFormat}
        setConversionFormat={setConversionFormat}
        handleFileUpload={handleFileUpload}
        extractWorkspacePreview={extractWorkspacePreview}
        convertWorkspaceFiles={convertWorkspaceFiles}
        mergeWorkspaceFiles={mergeWorkspaceFiles}
      />
    );
  }

  const offline = models.filter(m => m.type === 'offline');
  const online = models.filter(m => m.type === 'online');

  return (
    <div className={`ai-workspace task-${mode.key}`} style={{ ['--task-accent' as string]: mode.accent, ['--task-glow' as string]: mode.glow }}>
      <div className="ai-sidebar">
        <div className="ai-sidebar-hdr">
          <p>Defence AI Lab</p>
        </div>
        <div className="ai-sidebar-content">
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

          <div className="ai-sidebar-hdr">
            <p>Mission Log</p>
            <button className="new-chat-btn" onClick={startNewChat} title="Start New Session">
              ➕ New Session
            </button>
          </div>
          <div className="chat-history-list">
            {historyLoading ? (
              <div className="p-4 text-xs opacity-50">Syncing history...</div>
            ) : (
              chatHistory.map(h => (
                <div
                  key={h.id}
                  className={`history-item${chatId === h.id ? ' active' : ''}`}
                  onClick={() => loadChat(h.id)}
                >
                  <div className="history-icon">{h.activity?.title ? '📑' : '📜'}</div>
                  <div className="history-info">
                    <div className="history-title">{h.activity?.title || (h.messages?.[0]?.content?.substring(0, 20) + '...') || 'Untitled Task'}</div>
                    <div className="history-meta">
                      {new Date(h.createdAt).toLocaleDateString()} • {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
            {!historyLoading && chatHistory.length === 0 && <div className="p-4 text-xs opacity-50">No recent logs</div>}
          </div>
        </div>
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
            <div className="task-panel-title">Quick Suggestions</div>
            <div className="quick-prompt-grid">
              {mode.quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (mode.key === 'conversion') {
                      if (prompt.toLowerCase().includes('extract')) extractWorkspacePreview();
                      else if (prompt.toLowerCase().includes('merge')) mergeWorkspaceFiles();
                      else convertWorkspaceFiles();
                      return;
                    }
                    const finalMsg = attachedText
                      ? `${prompt} based on the attached source material.`
                      : prompt;
                    sendMsg(finalMsg);
                  }}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>


        {mode.key === 'communication' && (
          <div className="translation-panel" style={{ marginTop: 12 }}>
            <div className="translation-control">
              <label htmlFor="comm-language">Language</label>
              <select id="comm-language" value={commLang} onChange={e => setCommLang(e.target.value as FormalCommLanguage)}>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
              </select>
            </div>
            <div className="translation-control">
              <label htmlFor="comm-type">Type</label>
              <select id="comm-type" value={commType} onChange={e => setCommType(e.target.value as FormalCommType)}>
                <option value="Email">Email</option>
                <option value="Letter">Letter</option>
                <option value="Message">Message</option>
                <option value="Notice">Notice</option>
                <option value="Application">Application</option>
                <option value="Report">Report</option>
              </select>
            </div>
            {commType !== 'Message' && (
              <div className="translation-control file-control">
                <label htmlFor="comm-to">To / Authority / Receiver</label>
                <input
                  id="comm-to"
                  value={commTo}
                  onChange={e => setCommTo(e.target.value)}
                  placeholder={commLang === 'Hindi' ? 'उदा: कमांडिंग ऑफिसर, यूनिट ...' : 'e.g., Commanding Officer, Unit ...'}
                />
              </div>
            )}
            <div className="translation-control file-control">
              <label htmlFor="comm-subject">Subject / Title</label>
              <input
                id="comm-subject"
                value={commSubject}
                onChange={e => setCommSubject(e.target.value)}
                placeholder={commLang === 'Hindi' ? 'विषय लिखें' : 'Enter subject'}
              />
            </div>
            <div className="translation-control file-control">
              <label htmlFor="comm-salutation">Salutation</label>
              <input
                id="comm-salutation"
                value={commSalutation}
                onChange={e => setCommSalutation(e.target.value)}
                placeholder={commLang === 'Hindi' ? 'महोदय/महोदया,' : 'Sir/Madam,'}
              />
            </div>
            <div className="translation-control file-control" style={{ flex: '1 1 100%' }}>
              <label htmlFor="comm-body">Body / Purpose</label>
              <textarea
                id="comm-body"
                value={commBody}
                onChange={e => setCommBody(e.target.value)}
                placeholder={commLang === 'Hindi' ? 'मुख्य विवरण लिखें...' : 'Write the main details...'}
                rows={4}
              />
            </div>
            <div className="translation-control file-control">
              <label htmlFor="comm-closing">Closing</label>
              <input
                id="comm-closing"
                value={commClosing}
                onChange={e => setCommClosing(e.target.value)}
                placeholder={commLang === 'Hindi' ? 'भवदीय,' : 'Yours faithfully,'}
              />
            </div>
            <div className="translation-control file-control">
              <label htmlFor="comm-sender">Sender Name</label>
              <input
                id="comm-sender"
                value={commSender}
                onChange={e => setCommSender(e.target.value)}
                placeholder={commLang === 'Hindi' ? 'अपना नाम' : 'Your name'}
              />
            </div>
            {(commType === 'Notice' || commType === 'Report') && (
              <div className="translation-control file-control">
                <label htmlFor="comm-date">Date</label>
                <input id="comm-date" value={commDate} onChange={e => setCommDate(e.target.value)} placeholder="YYYY-MM-DD" />
              </div>
            )}
            {commType === 'Report' && (
              <div className="translation-control file-control">
                <label htmlFor="comm-location">Location</label>
                <input id="comm-location" value={commLocation} onChange={e => setCommLocation(e.target.value)} placeholder={commLang === 'Hindi' ? 'स्थान' : 'Location'} />
              </div>
            )}

            <div className="translation-control" style={{ alignSelf: 'flex-end', gap: 8, display: 'flex' }}>
              <button
                type="button"
                onClick={() => sendMsg(buildFormalCommPrompt())}
                disabled={loading}
              >
                Generate
              </button>
              <button
                type="button"
                onClick={() => exportCommunicationText(messages.slice().reverse().find(m => m.role === 'ai')?.text || '')}
                disabled={messages.filter(m => m.role === 'ai').length === 0}
              >
                Export
              </button>
            </div>
          </div>
        )}

        {mode.key === 'voice' && false /* Disabled top panel for voice, moved to bottom */}

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
              <div className="msg-bubble" style={{ whiteSpace: 'pre-wrap', background: mode.key === 'voice' && m.role === 'ai' ? 'transparent' : undefined, padding: mode.key === 'voice' && m.role === 'ai' ? 0 : undefined, border: mode.key === 'voice' && m.role === 'ai' ? 'none' : undefined }}>
                {mode.key === 'voice' && m.role === 'ai' && i > 0 ? (
                  <VoicePlayer text={m.text} />
                ) : mode.key === 'summary' && m.role === 'ai' && i > 0 ? (
                  <DocumentMessageRenderer text={m.text} />
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}
          <div ref={msgEndRef} />
        </div>
        <div className="ai-input-area-v2">
          {attachedText && (
            <div className="attached-content-bar">
              <div className="attached-info">
                <span className="icon">📄</span>
                <span className="text">Document Indexed: {attachedText}</span>
              </div>
              <button
                type="button"
                className="remove-btn"
                onClick={() => {
                  setAttachedText(null);
                  setWorkspaceFiles([]);
                  setFileStatus('');
                }}
              >
                Remove
              </button>
            </div>
          )}

          <div className="input-controls-row">
            {(mode.key === 'translation' || mode.key === 'quiz' || mode.key === 'conversion' || mode.key === 'summary') && (
              <div className="control-group">
                <label htmlFor="input-file" className="icon-btn" title="Upload Material">
                  📁 <span className="label">Upload Source</span>
                </label>
                <input
                  id="input-file"
                  type="file"
                  hidden
                  multiple={mode.key === 'conversion' || mode.key === 'summary'}
                  accept=".txt,.md,.csv,.json,.xml,.html,.log,.xlsx,.xls,.pdf,.docx"
                  onChange={e => handleFileUpload(e.target.files)}
                />
              </div>
            )}

            <div className="control-group">
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  console.log("Export menu toggled. Current state:", !isExportOpen);
                  setIsExportOpen(!isExportOpen);
                }}
                title="Export Options"
              >
                💾 <span className="label">Export</span>
              </button>
              {isExportOpen && (
                <div className="export-dropdown">
                  <button onClick={() => {
                    const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai');
                    if (lastAiMsg) exportToPDF(activity?.title || 'Exam_Paper', lastAiMsg.text);
                    else alert("No AI response to export yet.");
                    setIsExportOpen(false);
                  }}>PDF Document (.pdf)</button>
                  <button onClick={() => {
                    const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai');
                    if (lastAiMsg) exportToWord(activity?.title || 'Exam_Paper', lastAiMsg.text);
                    else alert("No AI response to export yet.");
                    setIsExportOpen(false);
                  }}>Word Document (.docx)</button>
                  <button onClick={() => {
                    const lastAiMsg = [...messages].reverse().find(m => m.role === 'ai');
                    if (lastAiMsg) exportToExcel(activity?.title || 'Exam_Data', lastAiMsg.text);
                    else alert("No AI response to export yet.");
                    setIsExportOpen(false);
                  }}>Excel Workbook (.xlsx)</button>
                </div>
              )}
            </div>

            {mode.key === 'translation' && (
              <div className="control-group">
                <select
                  className="lang-select"
                  value={translateTarget}
                  onChange={e => setTranslateTarget(e.target.value)}
                >
                  {translationTargets.map(target => (
                    <option key={target.code} value={target.code}>{target.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="input-main-row">
            <textarea
              className="ai-textarea-v2"
              placeholder={mode.placeholder}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              disabled={loading}
              rows={1}
            />
            <button className="send-btn-v2" onClick={() => sendMsg()} disabled={loading || (!inputVal.trim() && !attachedText)}>
              {loading ? <span className="loader"></span> : 'Run Task'}
            </button>
          </div>
          {fileStatus && <div className="file-status-hint">{fileStatus}</div>}
        </div>
      </div>
    </div>
  );
};

// --- BOTTOM OF CODE: SEPARATE MODULAR COMPONENTS ---

// --- Chart rendering for Document Summarizer ---
const CHART_COLORS = [
  '#4A5FA8', '#E74C6F', '#36B37E', '#FFAB00', '#6554C0',
  '#00B8D9', '#FF5630', '#57D9A3', '#FFC400', '#8777D9',
  '#00C7E5', '#FF8B00', '#2684FF', '#B2D4FF', '#C1C7D0',
];

const parseChartBlock = (json: string): any | null => {
  try {
    const data = JSON.parse(json.trim());
    if (data.type && data.labels && data.data) return data;
    return null;
  } catch {
    return null;
  }
};

const ChartBlock: React.FC<{ chartData: any }> = ({ chartData }) => {
  const { type, title, labels, data, colors } = chartData;
  const bgColors = colors || labels.map((_: any, i: number) => CHART_COLORS[i % CHART_COLORS.length]);

  const chartConfig = {
    labels,
    datasets: [{
      label: title || 'Data',
      data,
      backgroundColor: bgColors,
      borderColor: type === 'line' ? CHART_COLORS[0] : bgColors.map((c: string) => c + 'dd'),
      borderWidth: type === 'line' || type === 'bar' ? 2 : 1,
      fill: type === 'line' ? false : undefined,
      tension: type === 'line' ? 0.3 : undefined,
    }]
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { font: { size: 11 }, padding: 12, usePointStyle: true },
      },
      title: {
        display: !!title,
        text: title,
        font: { size: 14, weight: '600' as const },
        padding: { bottom: 16 },
      },
    },
  };

  if (type === 'bar' || type === 'line') {
    options.scales = {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
      x: { grid: { display: false } },
    };
  }

  const ChartComponent: any = {
    pie: Pie,
    doughnut: Doughnut,
    bar: Bar,
    line: Line,
    polarArea: PolarArea,
  }[type] || Pie;

  return (
    <div style={{
      maxWidth: type === 'bar' || type === 'line' ? '520px' : '380px',
      margin: '16px 0', padding: '20px', background: '#fff',
      borderRadius: '14px', border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <ChartComponent data={chartConfig} options={options} />
    </div>
  );
};

const DocumentMessageRenderer: React.FC<{ text: string }> = ({ text }) => {
  const chartRegex = /```chart\n([\s\S]*?)\n```/g;
  const parts: Array<{ type: 'text' | 'chart'; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = chartRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'chart', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    return <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;
  }

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'chart') {
          const chartData = parseChartBlock(part.content);
          return chartData ? <ChartBlock key={i} chartData={chartData} /> : (
            <pre key={i} style={{ background: 'var(--mist, #f1f5f9)', padding: '12px', borderRadius: '8px', fontSize: '12px', overflow: 'auto' }}>
              {part.content}
            </pre>
          );
        }
        return <div key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.content}</div>;
      })}
    </div>
  );
};

interface SummaryWorkspaceProps {
  files: WorkspaceFile[];
  extractedText: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SummaryWorkspace: React.FC<SummaryWorkspaceProps> = ({ files, extractedText, onFileUpload }) => {
  return (
    <div className="summary-workspace" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '32px', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', background: 'rgba(74,95,168,0.1)', borderRadius: '8px' }}>
            <span style={{ fontSize: '20px' }}>📄</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--navy, #1B3A6B)', margin: 0 }}>Document Summarizer</h2>
        </div>
        <p style={{ color: 'var(--silver, #8899AA)', fontSize: '13px', margin: 0 }}>Upload Word, Excel, or PDF files and ask AI to summarize them.</p>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '140px', border: '2px dashed var(--border, #334155)',
          borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
          background: 'var(--mist, #f1f5f9)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ marginBottom: '12px', fontSize: '28px' }}>📤</div>
            <p style={{ fontSize: '13px', color: 'var(--navy, #1B3A6B)', fontWeight: 600, margin: '0 0 4px 0' }}>Click to upload or drag and drop</p>
            <p style={{ fontSize: '11px', color: 'var(--silver, #8899AA)', margin: 0 }}>Word, Excel, or PDF (MAX. 25MB)</p>
          </div>
          <input type="file" style={{ display: 'none' }} onChange={onFileUpload} multiple accept=".pdf,.docx,.xlsx,.xls,.csv" />
        </label>
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '10px', fontWeight: 700, color: 'var(--silver, #8899AA)', textTransform: 'uppercase', letterSpacing: '1.5px', padding: '0 4px', marginBottom: '12px' }}>
            Active Context ({files.length} file{files.length === 1 ? '' : 's'})
          </h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {files.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
                background: 'var(--white, #fff)', borderRadius: '12px',
                border: '1px solid var(--border, #e2e8f0)', transition: 'background 0.15s'
              }}>
                <div style={{ padding: '8px', background: 'var(--mist, #f1f5f9)', borderRadius: '8px', fontSize: '16px' }}>
                  {f.ext === 'pdf' ? '📕' : f.ext === 'xlsx' || f.ext === 'xls' ? '📗' : '📘'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy, #1B3A6B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--silver, #8899AA)', fontFamily: 'monospace' }}>{(f.size / 1024).toFixed(1)} KB • {f.ext.toUpperCase()}</div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                  background: 'rgba(34,197,94,0.08)', color: '#22c55e', borderRadius: '20px',
                  fontSize: '10px', fontWeight: 700
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                  READY
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {extractedText && (
        <div style={{
          padding: '20px', background: 'var(--mist, #f8fafc)', borderRadius: '16px',
          border: '1px solid var(--border, #e2e8f0)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--silver, #8899AA)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <span style={{ color: '#4A5FA8' }}>⚡</span>
              Content Preview
            </h3>
            <div style={{ fontSize: '10px', color: 'var(--silver, #8899AA)', fontFamily: 'monospace' }}>TOKENS READY</div>
          </div>
          <div style={{
            fontSize: '12px', color: 'var(--navy, #1B3A6B)', lineHeight: 1.6, maxHeight: '280px',
            overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'serif'
          }}>
            {extractedText}
          </div>
        </div>
      )}

      {!files.length && (
        <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: 0.4 }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧊</div>
          <p style={{ fontSize: '13px', color: 'var(--silver, #8899AA)', margin: 0 }}>No documents in current context.<br />Upload files to begin analysis.</p>
        </div>
      )}
    </div>
  );
};

interface ConverterWorkspaceProps {
  mode: TaskMode;
  activity: Activity | null;
  selectedTool: string | null;
  setSelectedTool: (tool: string | null) => void;
  workspaceFiles: WorkspaceFile[];
  setWorkspaceFiles: React.Dispatch<React.SetStateAction<WorkspaceFile[]>>;
  extractionPreview: string;
  setExtractionPreview: (text: string) => void;
  fileStatus: string;
  setFileStatus: (status: string) => void;
  loading: boolean;
  conversionFormat: 'excel' | 'pdf' | 'word';
  setConversionFormat: (format: 'excel' | 'pdf' | 'word') => void;
  handleFileUpload: (files?: FileList | null) => void;
  extractWorkspacePreview: () => void;
  convertWorkspaceFiles: () => void;
  mergeWorkspaceFiles: () => void;
}

const ConverterWorkspace: React.FC<ConverterWorkspaceProps> = ({
  mode, activity, selectedTool, setSelectedTool, workspaceFiles, setWorkspaceFiles,
  extractionPreview, setExtractionPreview, fileStatus, setFileStatus, loading,
  conversionFormat, setConversionFormat, handleFileUpload, extractWorkspacePreview,
  convertWorkspaceFiles, mergeWorkspaceFiles
}) => {
  return (
    <div className="converter-full-page" style={{ ['--task-accent' as string]: mode.accent, ['--task-glow' as string]: mode.glow }}>
      <div className="converter-hero">
        <div className="hero-content">
          <div className="task-kicker">Multi-Tool Document System</div>
          <h1>{activity?.title || 'Format Converter'}</h1>
          <p>{activity?.body || 'Convert, merge, and extract documents offline with privacy.'}</p>
        </div>
        <div className="hero-icon">{mode.icon}</div>
      </div>

      <div className="converter-container-v2">
        {!selectedTool ? (
          <div className="tool-grid-v2">
            {[
              { id: 'merge-pdf', title: 'Merge PDF', desc: 'Combine multiple PDFs into one document.', icon: '📕+', format: 'pdf' },
              { id: 'merge-excel', title: 'Merge Excel', desc: 'Merge multiple workbooks into one.', icon: '📗+', format: 'excel' },
              { id: 'pdf-to-word', title: 'PDF to Word', desc: 'Convert PDF to Word with layout preserved.', icon: '📕→📘', format: 'word' },
              { id: 'pdf-to-excel', title: 'PDF to Excel', desc: 'Extract tables from PDF to Excel.', icon: '📕→📗', format: 'excel' },
              { id: 'extract-text', title: 'Extract Text', desc: 'Extract all readable text from any file.', icon: '📄', format: 'pdf' },
              { id: 'generic-convert', title: 'Any to PDF', desc: 'Convert any readable file to PDF.', icon: '✨→📕', format: 'pdf' },
            ].map(tool => (
              <div key={tool.id} className="tool-card-v2" onClick={() => { setSelectedTool(tool.id); setConversionFormat(tool.format as any); }}>
                <div className="tool-icon-v2">{tool.icon}</div>
                <div className="tool-title-v2">{tool.title}</div>
                <div className="tool-desc-v2">{tool.desc}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="workbench-v2 active">
            <div className="workbench-hdr-v2">
              <div className="back-btn-v2" onClick={() => { setSelectedTool(null); setWorkspaceFiles([]); setExtractionPreview(''); setFileStatus(''); }}>
                ← Choose Another Tool
              </div>
              <div className="tool-title-active">
                {selectedTool === 'merge-pdf' && 'Merge PDF Documents'}
                {selectedTool === 'merge-excel' && 'Merge Excel Workbooks'}
                {selectedTool === 'pdf-to-word' && 'Convert PDF to Word'}
                {selectedTool === 'pdf-to-excel' && 'Convert PDF to Excel'}
                {selectedTool === 'extract-text' && 'Text Extraction Studio'}
                {selectedTool === 'generic-convert' && 'Format Converter'}
              </div>
            </div>

            <div className="main-dropzone">
              <label htmlFor="conv-file-v2" className="dropzone-label">
                <div className="drop-icon">{selectedTool.includes('pdf') ? '📕' : selectedTool.includes('excel') ? '📗' : '📄'}</div>
                <h3>Drag & Drop files here</h3>
                <p>Or click to browse from your computer</p>
                <input
                  id="conv-file-v2"
                  type="file"
                  hidden
                  multiple={selectedTool.includes('merge')}
                  onChange={e => handleFileUpload(e.target.files)}
                />
              </label>
            </div>

            {workspaceFiles.length > 0 && (
              <div className="active-files-grid">
                {workspaceFiles.map((f, i) => (
                  <div key={i} className="active-file-card">
                    <span className="ext-icon">{f.ext === 'pdf' ? '📕' : f.ext.includes('xl') ? '📗' : '📄'}</span>
                    <span className="name">{f.name}</span>
                    <span className="remove-v2" onClick={() => setWorkspaceFiles(prev => prev.filter((_, idx) => idx !== i))}>×</span>
                  </div>
                ))}
              </div>
            )}

            {fileStatus && <div className="status-toast">{fileStatus}</div>}

            {extractionPreview && (
              <div className="preview-pane-v2">
                <div className="pane-title">Extracted Content Preview</div>
                <pre>{extractionPreview}</pre>
              </div>
            )}

            <div className="footer-actions-v2">
              <button
                className="action-trigger-v2"
                disabled={loading || workspaceFiles.length === 0 || (selectedTool.includes('merge') && workspaceFiles.length < 2)}
                onClick={() => {
                  if (selectedTool.includes('merge')) mergeWorkspaceFiles();
                  else if (selectedTool === 'extract-text') extractWorkspacePreview();
                  else convertWorkspaceFiles();
                }}
              >
                {loading ? <span className="loader-v2"></span> : (
                  selectedTool.includes('merge') ? 'Merge Files Now' :
                  selectedTool === 'extract-text' ? 'Extract Text Now' : 'Convert Document Now'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;