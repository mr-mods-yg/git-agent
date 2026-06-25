'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart } from 'ai';
import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek-v4-flash' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-3-5-sonnet-latest' },
  { id: 'google', name: 'Google Gemini', defaultModel: 'gemini-2.5-flash' },
];

const MODELS: Record<string, { id: string; name: string }[]> = {
  deepseek: [
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
    { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
    { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)' },
  ],
  openai: [
    { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
    { id: 'gpt-5.5', name: 'GPT-5.5' },
    { id: 'gpt-5', name: 'GPT-5' },
    { id: 'gpt-5-mini', name: 'GPT-5 mini' },
    { id: 'gpt-5-nano', name: 'GPT-5 nano' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
    { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  ],
  google: [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  ]
};

// Interfaces
interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
}

const STARTER_PROMPTS = [
  {
    icon: (
      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    label: "Explore repositories",
    desc: "Search and explore repository contents",
    prompt: "Show me the repositories in my GitHub account and summarize their main topics."
  },
  {
    icon: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    label: "Check active issues",
    desc: "List open bugs and feature requests",
    prompt: "List the open issues across my GitHub projects and suggest which ones to prioritize."
  },
  {
    icon: (
      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    label: "Inspect recent commits",
    desc: "Look at files and commit messages",
    prompt: "List the last 5 commits in my primary active repository with author and date info."
  },
  {
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: "Draft release notes",
    desc: "Generate clean developer logs",
    prompt: "Write a brief, minimalist release notes outline summarizing the latest changes in the repository."
  }
];

export default function Page() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile default closed
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  
  // PAT Token State
  const [patToken, setPatToken] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempToken, setTempToken] = useState('');

  // AI Model Provider State
  const [selectedProvider, setSelectedProvider] = useState<string>('deepseek');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-v4-flash');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [anthropicKey, setAnthropicKey] = useState<string>('');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [deepseekKey, setDeepseekKey] = useState<string>('');

  // Settings Temporary State (for Modal and Welcome Screen editing)
  const [tempProvider, setTempProvider] = useState<string>('deepseek');
  const [tempModel, setTempModel] = useState<string>('deepseek-v4-flash');
  const [tempOpenaiKey, setTempOpenaiKey] = useState<string>('');
  const [tempAnthropicKey, setTempAnthropicKey] = useState<string>('');
  const [tempGeminiKey, setTempGeminiKey] = useState<string>('');
  const [tempDeepseekKey, setTempDeepseekKey] = useState<string>('');

  const handleTempProviderChange = (providerId: string) => {
    setTempProvider(providerId);
    const defaultModel = PROVIDERS.find(p => p.id === providerId)?.defaultModel || '';
    setTempModel(defaultModel);
  };

  const configRef = useRef({
    patToken,
    selectedProvider,
    selectedModel,
    openaiKey,
    anthropicKey,
    geminiKey,
    deepseekKey
  });

  useEffect(() => {
    configRef.current = {
      patToken,
      selectedProvider,
      selectedModel,
      openaiKey,
      anthropicKey,
      geminiKey,
      deepseekKey
    };
  }, [patToken, selectedProvider, selectedModel, openaiKey, anthropicKey, geminiKey, deepseekKey]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    headers: () => {
      const cfg = configRef.current;
      let apiKey = '';
      if (cfg.selectedProvider === 'openai') apiKey = cfg.openaiKey;
      else if (cfg.selectedProvider === 'anthropic') apiKey = cfg.anthropicKey;
      else if (cfg.selectedProvider === 'google') apiKey = cfg.geminiKey;
      else if (cfg.selectedProvider === 'deepseek') apiKey = cfg.deepseekKey;

      return {
        'x-github-token': cfg.patToken,
        'x-ai-provider': cfg.selectedProvider,
        'x-ai-model': cfg.selectedModel,
        'x-ai-api-key': apiKey
      };
    }
  }), []);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    experimental_throttle: 60, // Throttle updates to at most once per 60ms to eliminate UI lag during active streaming
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSavedStrRef = useRef<string>('[]');

  // Initialize and load sessions from localStorage on client-side mount
  useEffect(() => {
    setMounted(true);
    
    // Load PAT
    const storedPat = localStorage.getItem('github-agent:pat');
    if (storedPat) {
      setPatToken(storedPat);
      setTempToken(storedPat);
    }

    // Load AI Provider & Model
    const storedProvider = localStorage.getItem('github-agent:provider') || 'deepseek';
    setSelectedProvider(storedProvider);
    setTempProvider(storedProvider);

    const storedModel = localStorage.getItem('github-agent:model') || 'deepseek-v4-flash';
    setSelectedModel(storedModel);
    setTempModel(storedModel);

    // Load API Keys
    const storedOpenaiKey = localStorage.getItem('github-agent:key:openai') || '';
    setOpenaiKey(storedOpenaiKey);
    setTempOpenaiKey(storedOpenaiKey);

    const storedAnthropicKey = localStorage.getItem('github-agent:key:anthropic') || '';
    setAnthropicKey(storedAnthropicKey);
    setTempAnthropicKey(storedAnthropicKey);

    const storedGeminiKey = localStorage.getItem('github-agent:key:gemini') || '';
    setGeminiKey(storedGeminiKey);
    setTempGeminiKey(storedGeminiKey);

    const storedDeepseekKey = localStorage.getItem('github-agent:key:deepseek') || '';
    setDeepseekKey(storedDeepseekKey);
    setTempDeepseekKey(storedDeepseekKey);
    
    const stored = localStorage.getItem('github-agent:sessions');
    if (stored) {
      try {
        const parsed: ChatSession[] = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
          lastSavedStrRef.current = JSON.stringify(parsed[0].messages);
        } else {
          setActiveSessionId(Date.now().toString());
        }
      } catch (e) {
        console.error("Error parsing stored sessions:", e);
        setActiveSessionId(Date.now().toString());
      }
    } else {
      setActiveSessionId(Date.now().toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save sessions to localStorage whenever messages or activeSessionId changes (debounced)
  useEffect(() => {
    // Avoid saving to localStorage or updating sessions list while the agent is streaming
    if (!mounted || !activeSessionId || status === 'streaming') return;

    const currentMessagesStr = JSON.stringify(messages);
    if (currentMessagesStr === lastSavedStrRef.current) return;

    const timerId = setTimeout(() => {
      lastSavedStrRef.current = currentMessagesStr;

      setSessions(prev => {
        let activeIdx = prev.findIndex(s => s.id === activeSessionId);
        
        let title = 'New Chat';
        if (messages.length > 0) {
          const firstUser = messages.find(m => m.role === 'user');
          const textPart = (firstUser?.parts?.find((p: any) => p.type === 'text') as any)?.text;
          if (textPart) {
            title = textPart.length > 30 ? textPart.substring(0, 30) + '...' : textPart;
          }
        }

        let newSessions = [...prev];
        if (activeIdx !== -1) {
          newSessions[activeIdx] = { 
            ...newSessions[activeIdx], 
            title: messages.length === 0 ? 'New Chat' : title, 
            messages 
          };
        } else if (messages.length > 0) {
          newSessions.unshift({
            id: activeSessionId,
            title,
            messages,
            createdAt: Date.now(),
          });
        }

        localStorage.setItem('github-agent:sessions', JSON.stringify(newSessions));
        return newSessions;
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(timerId);
  }, [messages, activeSessionId, mounted, status]);

  // Scroll to bottom on messages change
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Scroll if the user is already near the bottom, or if we just finished streaming
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      if (isNearBottom || status !== 'streaming') {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, status]);

  const handleNewChat = useCallback(() => {
    const newId = Date.now().toString();
    setActiveSessionId(newId);
    setMessages([]);
    lastSavedStrRef.current = '[]';
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [setMessages]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    setActiveSessionId(session.id);
    setMessages(session.messages);
    lastSavedStrRef.current = JSON.stringify(session.messages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [setMessages]);

  const handleDeleteSession = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('github-agent:sessions', JSON.stringify(updated));

      if (activeSessionId === id) {
        if (updated.length > 0) {
          setActiveSessionId(updated[0].id);
          setMessages(updated[0].messages);
          lastSavedStrRef.current = JSON.stringify(updated[0].messages);
        } else {
          const newId = Date.now().toString();
          setActiveSessionId(newId);
          setMessages([]);
          lastSavedStrRef.current = '[]';
        }
      }
      return updated;
    });
  }, [activeSessionId, setMessages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && status === 'ready') {
      let apiKey = '';
      if (selectedProvider === 'openai') apiKey = openaiKey;
      else if (selectedProvider === 'anthropic') apiKey = anthropicKey;
      else if (selectedProvider === 'google') apiKey = geminiKey;
      else if (selectedProvider === 'deepseek') apiKey = deepseekKey;

      if (!apiKey) {
        alert(`API key for ${selectedProvider} is not set. Please configure it in Settings.`);
        return;
      }

      sendMessage({ text: input });
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStarterPrompt = (promptText: string) => {
    if (status === 'ready') {
      let apiKey = '';
      if (selectedProvider === 'openai') apiKey = openaiKey;
      else if (selectedProvider === 'anthropic') apiKey = anthropicKey;
      else if (selectedProvider === 'google') apiKey = geminiKey;
      else if (selectedProvider === 'deepseek') apiKey = deepseekKey;

      if (!apiKey) {
        alert(`API key for ${selectedProvider} is not set. Please configure it in Settings.`);
        throw new Error(`API key for ${selectedProvider} is not set.`);
      }

      sendMessage({ text: promptText });
    }
  };

  const handleSaveInitialSetup = () => {
    const pat = tempToken.trim();
    if (!pat) return;

    setPatToken(pat);
    localStorage.setItem('github-agent:pat', pat);

    setSelectedProvider(tempProvider);
    localStorage.setItem('github-agent:provider', tempProvider);

    setSelectedModel(tempModel);
    localStorage.setItem('github-agent:model', tempModel);

    setOpenaiKey(tempOpenaiKey.trim());
    localStorage.setItem('github-agent:key:openai', tempOpenaiKey.trim());

    setAnthropicKey(tempAnthropicKey.trim());
    localStorage.setItem('github-agent:key:anthropic', tempAnthropicKey.trim());

    setGeminiKey(tempGeminiKey.trim());
    localStorage.setItem('github-agent:key:gemini', tempGeminiKey.trim());

    setDeepseekKey(tempDeepseekKey.trim());
    localStorage.setItem('github-agent:key:deepseek', tempDeepseekKey.trim());

    setIsSettingsOpen(false);
  };

  const sessionsList = useMemo(() => {
    if (sessions.length === 0) {
      return (
        <div className="text-center py-8 text-neutral-600 text-xs italic">
          No sessions saved
        </div>
      );
    }
    return sessions.map(s => {
      const isActive = s.id === activeSessionId;
      return (
        <div
          key={s.id}
          onClick={() => handleSelectSession(s)}
          className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-155 border ${
            isActive
              ? 'bg-neutral-800/50 text-white border-neutral-700/30'
              : 'border-transparent text-neutral-400 hover:bg-neutral-800/20 hover:text-neutral-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs truncate font-medium tracking-wide leading-none">{s.title}</span>
          </div>
          <button
            onClick={(e) => handleDeleteSession(s.id, e)}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-all"
            title="Delete Chat"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      );
    });
  }, [sessions, activeSessionId, handleSelectSession, handleDeleteSession]);

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b0b0c] text-neutral-400">
        <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // Token Setup / Missing Screen
  if (!patToken) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0d0d0f] text-neutral-200 font-sans p-6 overflow-y-auto">
        <div className="max-w-lg w-full bg-[#131315] border border-neutral-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden my-8">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Git Agent</h1>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            Configure your GitHub Personal Access Token (PAT) and select your preferred AI model provider to get started. All credentials are saved purely on your local device.
          </p>

          <div className="space-y-5">
            {/* Section 1: GitHub PAT */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">1. GitHub Credentials</h3>
              <div className="bg-[#0b0b0c] border border-neutral-800 p-3.5 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    GitHub PAT Token <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={tempToken}
                    onChange={e => setTempToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#131315] border border-neutral-700 text-xs text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
                <div className="text-[10px] text-neutral-500 leading-normal">
                  Requires selecting repositories and <code>content</code> permission with read and write permissions for write access to that repository. Generate at <a href="https://github.com/settings/personal-access-tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">GitHub Fine-grained tokens</a>.
                </div>
              </div>
            </div>

            {/* Section 2: AI Model Provider */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">2. AI Model Configuration</h3>
              <div className="bg-[#0b0b0c] border border-neutral-800 p-3.5 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">AI Provider</label>
                    <select
                      value={tempProvider}
                      onChange={e => handleTempProviderChange(e.target.value)}
                      className="w-full bg-[#131315] border border-neutral-700 text-xs text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Model</label>
                    <select
                      value={tempModel}
                      onChange={e => setTempModel(e.target.value)}
                      className="w-full bg-[#131315] border border-neutral-700 text-xs text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      {MODELS[tempProvider]?.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    {PROVIDERS.find(p => p.id === tempProvider)?.name} API Key 
                    <span className="text-[10px] text-neutral-500 ml-1.5 font-normal">(Optional, can also be changed later in settings)</span>
                  </label>
                  <input
                    type="password"
                    value={
                      tempProvider === 'openai' ? tempOpenaiKey :
                      tempProvider === 'anthropic' ? tempAnthropicKey :
                      tempProvider === 'google' ? tempGeminiKey :
                      tempDeepseekKey
                    }
                    onChange={e => {
                      const val = e.target.value;
                      if (tempProvider === 'openai') setTempOpenaiKey(val);
                      else if (tempProvider === 'anthropic') setTempAnthropicKey(val);
                      else if (tempProvider === 'google') setTempGeminiKey(val);
                      else setTempDeepseekKey(val);
                    }}
                    placeholder={`Paste ${PROVIDERS.find(p => p.id === tempProvider)?.name} key here`}
                    className="w-full bg-[#131315] border border-neutral-700 text-xs text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveInitialSetup}
              disabled={!tempToken.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium py-3 rounded-xl transition-all shadow-md active:scale-[0.98] text-sm"
            >
              Save Credentials & Get Started
            </button>
            
            <p className="text-[10px] text-center text-neutral-500 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              AI keys & GitHub PAT tokens are stored exclusively in your browser storage.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#0d0d0f] text-neutral-100 font-sans antialiased overflow-hidden">
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#131315] border border-neutral-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-white">Settings</h2>
            
            <div className="space-y-4">
              {/* GitHub PAT */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">GitHub PAT Token</label>
                <input
                  type="password"
                  value={tempToken}
                  onChange={e => setTempToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-[#0b0b0c] border border-neutral-700 text-xs text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Provider Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">AI Provider</label>
                  <select
                    value={tempProvider}
                    onChange={e => handleTempProviderChange(e.target.value)}
                    className="w-full bg-[#0b0b0c] border border-neutral-700 text-xs text-white rounded-xl px-3 py-3 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">AI Model</label>
                  <select
                    value={tempModel}
                    onChange={e => setTempModel(e.target.value)}
                    className="w-full bg-[#0b0b0c] border border-neutral-700 text-xs text-white rounded-xl px-3 py-3 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {MODELS[tempProvider]?.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  {PROVIDERS.find(p => p.id === tempProvider)?.name} API Key
                </label>
                <input
                  type="password"
                  value={
                    tempProvider === 'openai' ? tempOpenaiKey :
                    tempProvider === 'anthropic' ? tempAnthropicKey :
                    tempProvider === 'google' ? tempGeminiKey :
                    tempDeepseekKey
                  }
                  onChange={e => {
                    const val = e.target.value;
                    if (tempProvider === 'openai') setTempOpenaiKey(val);
                    else if (tempProvider === 'anthropic') setTempAnthropicKey(val);
                    else if (tempProvider === 'google') setTempGeminiKey(val);
                    else setTempDeepseekKey(val);
                  }}
                  placeholder={`Paste key here`}
                  className="w-full bg-[#0b0b0c] border border-neutral-700 text-xs text-white rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  setIsSettingsOpen(false);
                  setTempToken(patToken);
                  setTempProvider(selectedProvider);
                  setTempModel(selectedModel);
                  setTempOpenaiKey(openaiKey);
                  setTempAnthropicKey(anthropicKey);
                  setTempGeminiKey(geminiKey);
                  setTempDeepseekKey(deepseekKey);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInitialSetup}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          sidebarOpen ? 'w-64' : 'w-0 md:w-64'
        } absolute md:relative border-r border-neutral-800/60 bg-[#131315] flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-30 h-full shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 flex items-center justify-between border-b border-neutral-800/40">
          <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase select-none">
            Chat Sessions
          </span>
          <button
            onClick={handleNewChat}
            title="New Chat"
            className="p-1.5 rounded-lg hover:bg-neutral-800/70 text-neutral-300 hover:text-white transition-all scale-100 hover:scale-105 active:scale-95 border border-neutral-800/40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 scrollbar-thin">
          {sessionsList}
        </div>

        {/* Sidebar Footer (Settings) */}
        <div className="p-3 border-t border-neutral-800/40 bg-[#101012]">
          <button 
            onClick={() => {
              setTempToken(patToken);
              setTempProvider(selectedProvider);
              setTempModel(selectedModel);
              setTempOpenaiKey(openaiKey);
              setTempAnthropicKey(anthropicKey);
              setTempGeminiKey(geminiKey);
              setTempDeepseekKey(deepseekKey);
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-800/60 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:text-indigo-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[12px] font-medium text-neutral-300 group-hover:text-white transition-colors">
                Settings
              </span>
            </div>
            <svg className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col overflow-hidden h-full bg-[#0a0a0c] relative z-10">
        {/* Navigation Bar */}
        <header className="h-14 border-b border-neutral-800/40 flex items-center justify-between px-4 bg-[#0d0d0f]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors md:hidden"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              className="hidden md:block p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h12M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-wide text-neutral-200">Git Agent</span>
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                {selectedModel}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/40 hover:bg-neutral-800 text-xs font-medium text-neutral-300 hover:text-white border border-neutral-800/50 transition-all scale-100 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className='hidden md:block'>New Chat</span>
          </button>
        </header>

        {/* Message Feed Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            /* Empty State / Welcome Screen */
            <div className="max-w-2xl mx-auto h-full flex flex-col justify-center items-center py-12 px-4 space-y-8">
              <div className="relative group">
                <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-500 opacity-20 blur-xl group-hover:opacity-30 transition duration-500"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-[#141417] border border-neutral-800/80 flex items-center justify-center text-white shadow-xl">
                  <svg className="w-9 h-9 text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  How can I help you today?
                </h1>
                <p className="text-sm text-neutral-400 max-w-md mx-auto">
                  Ask queries about your GitHub account, explore repositories, verify commits, list issues or draft release checklists.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {STARTER_PROMPTS.map((starter, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleStarterPrompt(starter.prompt)}
                    className="p-4 rounded-2xl bg-[#131315]/40 hover:bg-[#131315]/80 border border-neutral-800 hover:border-neutral-700/60 cursor-pointer transition-all duration-200 group flex items-start gap-3.5 shadow-sm hover:scale-[1.01]"
                  >
                    <div className="p-2 rounded-xl bg-neutral-900/60 border border-neutral-800 group-hover:bg-neutral-900 transition-colors flex-shrink-0">
                      {starter.icon}
                    </div>
                    <div className="text-left space-y-0.5">
                      <div className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors">
                        {starter.label}
                      </div>
                      <div className="text-[11px] text-neutral-400 leading-tight">
                        {starter.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation Messages */
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map(message => {
                const isUser = message.role === 'user';
                return (
                  <div key={message.id}>
                    {isUser ? (
                      /* User Bubble */
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl bg-neutral-800/70 border border-neutral-700/30 px-4 py-3 text-[13.5px] text-neutral-200 shadow-sm leading-relaxed whitespace-pre-wrap">
                          {message.parts.map((part, index) =>
                            part.type === 'text' ? <span key={index}>{part.text}</span> : null
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Assistant Response */
                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center text-indigo-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 space-y-3 overflow-hidden text-[13.5px] text-neutral-200 leading-relaxed pt-0.5">
                          {message.parts.map((part, index) => {
                            if (part.type === 'text') {
                              return <Markdown key={index} text={part.text} />;
                            }
                            if (isToolUIPart(part)) {
                              return <ToolInvocation key={index} part={part} />;
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loader during submission/streaming */}
              {status !== 'ready' && (
                <div className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center text-indigo-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1.5 py-3.5 px-1">
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar Section */}
        <div className="border-t border-neutral-800/40 bg-[#0d0d0f]/50 p-4 md:px-8">
          <div className="max-w-2xl mx-auto relative">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={status !== 'ready'}
                placeholder="Ask Git Agent..."
                className="w-full rounded-2xl bg-[#131315] border border-neutral-800/70 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/10 focus:outline-none pl-4 pr-12 py-3.5 text-[13.5px] text-neutral-100 placeholder-neutral-500 resize-none max-h-48 overflow-y-auto block shadow-lg leading-normal"
                style={{ height: 'auto' }}
              />
              
              <button
                type="submit"
                disabled={status !== 'ready' || !input.trim()}
                className={`absolute right-2.5 bottom-2.5 p-2 rounded-xl border transition-all duration-150 ${
                  input.trim() && status === 'ready'
                    ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-md scale-100 active:scale-95'
                    : 'bg-neutral-800 border-neutral-800/60 text-neutral-600 cursor-not-allowed'
                }`}
              >
                <svg className="w-4.5 h-4.5 transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            
            <div className="text-center mt-2.5 text-[10px] text-neutral-500 tracking-wide font-medium">
              Git Agent can fetch repositories, issues, and execute tools to assist you.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CodeBlock component for syntax highlighting
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-neutral-800 bg-[#0d0d0f] shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161618] border-b border-neutral-800">
        <span className="text-xs font-medium text-neutral-400 lowercase">{language || 'text'}</span>
        <button
          onClick={copyToClipboard}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="!my-0 !bg-transparent !p-0">
          <code className={`language-${language} text-[13px] font-mono leading-relaxed text-neutral-300`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Markdown custom parsing component
const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown-body text-[13.5px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = match || String(children).includes('\n');
            if (isBlock) {
              return <CodeBlock code={String(children).replace(/\n$/, '')} language={match?.[1] || 'text'} />;
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 text-[11.5px] font-mono font-medium border border-neutral-700/30" {...props}>
                {children}
              </code>
            );
          },
          table({children}) {
            return <div className="overflow-x-auto my-4 scrollbar-thin"><table className="min-w-full divide-y divide-neutral-800 border border-neutral-800 rounded-lg">{children}</table></div>;
          },
          thead({children}) {
            return <thead className="bg-[#131315] text-neutral-400 text-xs uppercase tracking-wider">{children}</thead>;
          },
          tbody({children}) {
            return <tbody className="divide-y divide-neutral-800 bg-[#0d0d0f]">{children}</tbody>;
          },
          td({children}) {
            return <td className="px-4 py-3 text-sm text-neutral-300 whitespace-nowrap">{children}</td>;
          },
          th({children}) {
            return <th className="px-4 py-3 text-left font-medium">{children}</th>;
          },
          p({children}) {
            return <p className="mb-3 leading-relaxed text-neutral-300">{children}</p>;
          },
          ul({children}) {
            return <ul className="list-disc pl-5 mb-3 space-y-1 text-neutral-300">{children}</ul>;
          },
          ol({children}) {
            return <ol className="list-decimal pl-5 mb-3 space-y-1 text-neutral-300">{children}</ol>;
          },
          li({children}) {
            return <li>{children}</li>;
          },
          h1({children}) {
            return <h1 className="text-xl font-bold mt-4 mb-2 text-white border-b border-neutral-800 pb-1">{children}</h1>;
          },
          h2({children}) {
            return <h2 className="text-lg font-bold mt-3.5 mb-1.5 text-white">{children}</h2>;
          },
          h3({children}) {
            return <h3 className="text-base font-semibold mt-3 mb-1 text-neutral-200">{children}</h3>;
          },
          a({children, href}) {
            return <a href={href} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>;
          },
          blockquote({children}) {
            return <blockquote className="border-l-2 border-indigo-500 pl-4 py-0.5 my-3 text-neutral-400 italic bg-indigo-950/10 rounded-r-md">{children}</blockquote>;
          },
          hr() {
            return <hr className="my-4 border-neutral-800" />;
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});

// Collapsible custom tool calls representation component
function ToolInvocation({ part }: { part: any }) {
  const [collapsed, setCollapsed] = useState(true);
  const toolName = part.toolName;
  const state = part.state;

  let title = `Running tool: ${toolName}`;
  let statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  let showLoader = true;

  if (state === 'output-available') {
    title = `Executed tool: ${toolName}`;
    statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    showLoader = false;
  } else if (state === 'input-available') {
    title = `Calling tool: ${toolName}...`;
    statusColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
    showLoader = true;
  }

  return (
    <div className="my-3 rounded-xl border border-neutral-800/80 bg-[#121214]/60 overflow-hidden backdrop-blur-sm shadow-sm max-w-xl">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-neutral-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {showLoader ? (
            <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="text-xs font-mono font-medium text-neutral-300">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColor} select-none`}>
            {state}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-2 border-t border-neutral-800/60 bg-[#0b0b0c] font-mono text-[10.5px] space-y-3">
          {part.input && (
            <div>
              <div className="text-[9.5px] text-neutral-500 font-semibold mb-1 uppercase tracking-wider">Arguments</div>
              <pre className="overflow-x-auto p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800 text-neutral-300 max-h-36 scrollbar-thin">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
          {state === 'output-available' && part.output && (
            <div>
              <div className="text-[9.5px] text-neutral-500 font-semibold mb-1 uppercase tracking-wider">Result</div>
              <pre className="overflow-x-auto p-2.5 bg-neutral-900/80 rounded-lg border border-neutral-800 text-neutral-300 max-h-56 scrollbar-thin">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}