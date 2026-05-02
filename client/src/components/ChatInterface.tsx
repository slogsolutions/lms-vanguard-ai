import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';
import { useLocation } from 'react-router-dom';
import { extractTextFromFile } from '../utils/documentExtractor';
import { downloadOriginalFile, exportPdfToWordLayout, exportToExcel, exportToPDF, exportToWord, mergeExcelFiles, mergePdfFiles } from '../utils/documentExporter';

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
  if (haystack.includes('convert') || haystack.includes('data conversion')) {
    return taskModes.find(({ mode }) => mode.key === 'conversion')?.mode ?? defaultMode;
  }
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
  const [attachedText, setAttachedText] = useState<string | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [conversionFormat, setConversionFormat] = useState<'excel' | 'pdf' | 'word'>('pdf');
  const [extractionPreview, setExtractionPreview] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
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
        const candidateModels = activeMode.key === 'translation' || activeMode.key === 'prompting' || activeMode.key === 'conversion'
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
    if (!fileList.length || (mode.key !== 'translation' && mode.key !== 'quiz' && mode.key !== 'conversion')) return;

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
    setMessages([{ role: 'ai', text: activity
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
      <div className="conversion-only-workspace" style={{ ['--task-accent' as string]: mode.accent, ['--task-glow' as string]: mode.glow }}>
        <div className="task-hero conversion-hero">
          <div className="task-hero-main">
            <div className="task-kicker">Active Task Workspace</div>
            <h2>{activity?.title ?? 'Format Converter'}</h2>
            <p>{activity?.body ?? 'Convert, extract, and merge files offline.'}</p>
            <div className="task-chip-row">
              <span>{activity?.category ?? 'Data Conversion'}</span>
              <span>{activity?.duration ?? '25 min'}</span>
              <span>{activity?.difficulty ?? 'Beginner'}</span>
              <span>Offline Tools</span>
            </div>
          </div>
          <div className="task-hero-side">
            <div className="task-orb large">{mode.icon}</div>
          </div>
        </div>

        <div className="conversion-summary-grid">
          <div className="task-brief-card">
            <div className="task-panel-title">Mission Deliverables</div>
            {mode.deliverables.map(item => <div key={item} className="deliverable-item">{item}</div>)}
          </div>
          <div className="task-brief-card">
            <div className="task-panel-title">Quick Actions</div>
            <div className="quick-prompt-grid">
              <button type="button" onClick={extractWorkspacePreview} disabled={loading}>Extract Files</button>
              <button type="button" onClick={convertWorkspaceFiles} disabled={loading}>Convert First File</button>
              <button type="button" onClick={mergeWorkspaceFiles} disabled={loading || workspaceFiles.length < 2}>Merge Files</button>
            </div>
          </div>
        </div>

        <div className="conversion-workbench conversion-workbench-large">
          <div className="conversion-toolbar">
            <div>
              <div className="task-panel-title">Offline File Tools</div>
              <div className="conversion-copy">Upload files, choose the output, then extract only when needed. PDF merge keeps the original pages intact.</div>
            </div>
            <div className="conversion-actions">
              <label htmlFor="conversion-file" className="icon-btn primary-tool" title="Upload files">
                Upload
              </label>
              <input
                id="conversion-file"
                type="file"
                hidden
                multiple
                accept=".txt,.md,.csv,.json,.xml,.html,.log,.xlsx,.xls,.pdf,.docx"
                onChange={e => handleFileUpload(e.target.files)}
              />
              <select
                className="lang-select conversion-select"
                value={conversionFormat}
                onChange={e => setConversionFormat(e.target.value as 'excel' | 'pdf' | 'word')}
                aria-label="Output format"
              >
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
              </select>
              <button type="button" className="icon-btn" onClick={extractWorkspacePreview} disabled={loading}>Extract</button>
              <button type="button" className="icon-btn" onClick={convertWorkspaceFiles} disabled={loading}>Convert</button>
              <button type="button" className="icon-btn" onClick={mergeWorkspaceFiles} disabled={loading || workspaceFiles.length < 2}>Merge</button>
            </div>
          </div>

          <div className="conversion-file-list">
            {workspaceFiles.length ? workspaceFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="conversion-file">
                <div>
                  <strong>{file.name}</strong>
                  <span>{Math.max(1, Math.round(file.size / 1024))} KB ready</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextFiles = workspaceFiles.filter((_, i) => i !== index);
                    setWorkspaceFiles(nextFiles);
                    setAttachedText(nextFiles.length ? nextFiles.map(item => item.name).join(', ') : null);
                    setExtractionPreview('');
                    setFileStatus(`${file.name} removed from this workspace.`);
                  }}
                >
                  Remove
                </button>
              </div>
            )) : (
              <div className="conversion-empty">Upload PDF, Word, Excel, CSV, JSON, or text files to begin.</div>
            )}
          </div>

          {fileStatus && <div className="file-status-hint conversion-status">{fileStatus}</div>}

          {extractionPreview && (
            <div className="conversion-preview">
              <div className="task-panel-title">Extracted Preview</div>
              <pre>{extractionPreview}</pre>
            </div>
          )}
        </div>
      </div>
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

        {mode.key === 'conversion' && (
          <div className="conversion-workbench">
            <div className="conversion-toolbar">
              <div>
                <div className="task-panel-title">Offline File Tools</div>
                <div className="conversion-copy">Convert extracted content or merge multiple files without leaving this workspace.</div>
              </div>
              <div className="conversion-actions">
                <label htmlFor="conversion-file" className="icon-btn" title="Upload files">
                  Upload
                </label>
                <input
                  id="conversion-file"
                  type="file"
                  hidden
                  multiple
                  accept=".txt,.md,.csv,.json,.xml,.html,.log,.xlsx,.xls,.pdf,.docx"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <select
                  className="lang-select"
                  value={conversionFormat}
                  onChange={e => setConversionFormat(e.target.value as 'excel' | 'pdf' | 'word')}
                  aria-label="Output format"
                >
                  <option value="pdf">PDF</option>
                  <option value="word">Word</option>
                  <option value="excel">Excel</option>
                </select>
                <button type="button" className="icon-btn" onClick={extractWorkspacePreview} disabled={loading}>
                  Extract
                </button>
                <button type="button" className="icon-btn" onClick={convertWorkspaceFiles} disabled={loading}>
                  Convert
                </button>
                <button type="button" className="icon-btn" onClick={mergeWorkspaceFiles} disabled={loading || workspaceFiles.length < 2}>
                  Merge
                </button>
              </div>
            </div>
            <div className="conversion-file-list">
              {workspaceFiles.length ? workspaceFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="conversion-file">
                  <div>
                    <strong>{file.name}</strong>
                    <span>{Math.max(1, Math.round(file.size / 1024))} KB extracted</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceFiles(prev => prev.filter((_, i) => i !== index));
                      setFileStatus(`${file.name} removed from this workspace.`);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )) : (
                <div className="conversion-empty">Upload PDF, Word, Excel, CSV, JSON, or text files to begin.</div>
              )}
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
            {(mode.key === 'translation' || mode.key === 'quiz' || mode.key === 'conversion') && (
              <div className="control-group">
                <label htmlFor="input-file" className="icon-btn" title="Upload Material">
                  📁 <span className="label">Upload Source</span>
                </label>
                <input
                  id="input-file"
                  type="file"
                  hidden
                  multiple={mode.key === 'conversion'}
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

export default ChatInterface;
