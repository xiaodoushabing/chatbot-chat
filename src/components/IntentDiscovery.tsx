import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Globe,
  Folder,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  RefreshCw,
  Settings2,
  X,
  Eye,
  Trash2,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface IntentDiff {
  id: string;
  intent: string;
  status: 'new' | 'changed' | 'deleted';
  utterances: string[];
  response: string;
  confidence: number;
  whatsChanged?: string[];
  original?: {
    intent: string;
    utterances: string[];
    response: string;
  };
  llmSuggestion?: {
    intent: string;
    utterances: string[];
    response: string;
  };
}

const MOCK_DIFFS: IntentDiff[] = [
  {
    id: '1',
    intent: 'OCBC_360_Salary_Credit',
    status: 'new',
    utterances: [
      'What is the minimum salary credit for OCBC 360?',
      'How does salary credit affect my 360 interest?',
      'Can I use GIRO for salary credit?',
      'What are the benefits of crediting salary to 360 account?',
      'Show me the interest tiers for salary credit.'
    ],
    response: "To earn the Salary bonus interest on your OCBC 360 Account, you need to credit a minimum salary of S$1,800 through GIRO. This will earn you an effective interest rate of up to 2.50% a year on your first S$100,000.",
    confidence: 0.98,
    llmSuggestion: {
      intent: 'OCBC_360_Salary_Credit',
      utterances: [
        'What is the minimum salary credit for OCBC 360?',
        'How does salary credit affect my 360 interest?',
        'Can I use GIRO for salary credit?',
        'What are the benefits of crediting salary to 360 account?',
        'Show me the interest tiers for salary credit.'
      ],
      response: "To earn the Salary bonus interest on your OCBC 360 Account, you need to credit a minimum salary of S$1,800 through GIRO. This will earn you an effective interest rate of up to 2.50% a year on your first S$100,000."
    }
  },
  {
    id: '2',
    intent: 'Home_Loan_Repayment_Impact',
    status: 'changed',
    utterances: [
      'I am getting a new house, how does it affect my savings?',
      'Impact of mortgage on OCBC 360 wealth bonus',
      'Will buying a house delay my retirement goals?',
      'How much does a home loan reduce my investment capacity?'
    ],
    response: "Taking up an OCBC Home Loan can actually help you earn the Wealth bonus on your 360 Account if you insure or invest with us. However, a new mortgage will reduce your monthly disposable income by approximately S$1,200. This shifts your 'Comfortable Retirement' milestone by 4.5 years.",
    confidence: 0.94,
    whatsChanged: [
      "Kept original utterances: 'I am getting a new house, how does it affect my savings?', 'Impact of mortgage on OCBC 360 wealth bonus'",
      "Added new utterances: 'Will buying a house delay my retirement goals?', 'How much does a home loan reduce my investment capacity?'",
      "Removed utterance: 'Can I use CPF for my house?'",
      "Updated response to reflect new 2026 mortgage stress test guidelines and OCBC 360 Wealth bonus synergy."
    ],
    original: {
      intent: 'Home_Loan_Repayment_Impact',
      utterances: [
        'I am getting a new house, how does it affect my savings?',
        'Impact of mortgage on OCBC 360 wealth bonus',
        'Can I use CPF for my house?'
      ],
      response: "A new mortgage will reduce your monthly voluntary contributions. This shifts your 'Comfortable Retirement' milestone by 3 years."
    },
    llmSuggestion: {
      intent: 'Home_Loan_Repayment_Impact',
      utterances: [
        'I am getting a new house, how does it affect my savings?',
        'Impact of mortgage on OCBC 360 wealth bonus',
        'Will buying a house delay my retirement goals?',
        'How much does a home loan reduce my investment capacity?'
      ],
      response: "Taking up an OCBC Home Loan can actually help you earn the Wealth bonus on your 360 Account if you insure or invest with us. However, a new mortgage will reduce your monthly disposable income by approximately S$1,200. This shifts your 'Comfortable Retirement' milestone by 4.5 years."
    }
  },
  {
    id: '3',
    intent: 'CPF_Life_Explanation',
    status: 'deleted',
    utterances: [
      'Explain CPF Life',
      'How does the annuity work?',
      'What is CPF Life?',
      'Tell me about the national annuity scheme'
    ],
    response: "CPF LIFE is a national longevity multi-purpose annuity scheme that provides you with monthly payouts for as long as you live.",
    confidence: 0.99,
    whatsChanged: ["Intent deprecated. Content merged into general 'Retirement_Planning_Guide' intent based on new OCBC Wealth Advisory documentation structure."]
  },
  {
    id: '4',
    intent: 'OCBC_Life_Goals_Retirement',
    status: 'new',
    utterances: [
      'How do I set up a retirement goal in OCBC app?',
      'OCBC Life Goals retirement calculator',
      'Which investment is best for retirement?',
      'Track my retirement progress'
    ],
    response: "You can set up a retirement goal using OCBC Life Goals in the OCBC Digital app. It helps you project your retirement needs and suggests suitable investment portfolios to close any gaps.",
    confidence: 0.96,
    llmSuggestion: {
      intent: 'OCBC_Life_Goals_Retirement',
      utterances: [
        'How do I set up a retirement goal in OCBC app?',
        'OCBC Life Goals retirement calculator',
        'Which investment is best for retirement?',
        'Track my retirement progress'
      ],
      response: "You can set up a retirement goal using OCBC Life Goals in the OCBC Digital app. It helps you project your retirement needs and suggests suitable investment portfolios to close any gaps."
    }
  }
];

interface SyncSession {
  id: string;
  date: string;
  sources: { id: string; name: string; type: string; url?: string }[];
  status: 'pending' | 'deployed';
  diffs: IntentDiff[];
}

const INITIAL_SOURCES = [
  { id: '1', type: 'doc', name: 'OCBC_360_Account_T&Cs_2026.pdf' },
  { id: '2', type: 'url', name: 'https://www.ocbc.com/personal-banking/deposits/360-account' },
  { id: '3', type: 'folder', name: '/internal/policies/q3_wealth_updates/' }
];

const TraditionalWorkflowMock = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => (prev >= 600 ? 0 : prev + 1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const intentNameFull = "OCBC_360_Salary_Credit";
  const utt1Full = "What is the minimum salary credit for OCBC 360?";
  const utt2Full = "How does salary credit affect my 360 interest?";
  const utt3Full = "Can I use GIRO for salary credit?";
  const utt4Full = "What are the benefits of crediting salary to 360 account?";
  const utt5Full = "Show me the interest tiers for salary credit.";
  const responseDraft = "You need to credit S$1,800 to get bonus interest.";
  const responseFull = "To earn the Salary bonus interest on your OCBC 360 Account, you need to credit a minimum salary of S$1,800 through GIRO. This will earn you an effective interest rate of up to 2.50% a year on your first S$100,000.";

  const getTypedText = (startTick: number, endTick: number, text: string) => {
    if (tick < startTick) return "";
    if (tick >= endTick) return text;
    const progress = (tick - startTick) / (endTick - startTick);
    const chars = Math.floor(progress * text.length);
    return text.substring(0, chars);
  };

  const getDeletedText = (startTick: number, endTick: number, text: string) => {
    if (tick < startTick) return text;
    if (tick >= endTick) return "";
    const progress = (tick - startTick) / (endTick - startTick);
    const chars = Math.floor((1 - progress) * text.length);
    return text.substring(0, chars);
  };

  const isCursorVisible = (startTick: number, endTick: number) => {
    return tick >= startTick && tick < endTick && tick % 5 < 3;
  };

  const intentName = getTypedText(30, 50, intentNameFull);
  const utt1 = getTypedText(70, 100, utt1Full);
  const utt2 = getTypedText(120, 150, utt2Full);
  const utt3 = getTypedText(170, 200, utt3Full);
  const utt4 = getTypedText(220, 250, utt4Full);
  const utt5 = getTypedText(270, 300, utt5Full);

  let response = "";
  if (tick < 330) response = "";
  else if (tick < 380) response = getTypedText(330, 380, responseDraft);
  else if (tick < 400) response = responseDraft;
  else if (tick < 430) response = getDeletedText(400, 430, responseDraft);
  else if (tick < 450) response = "";
  else response = getTypedText(450, 520, responseFull);

  let docScroll = 0;
  if (tick < 20) docScroll = tick * 2;
  else if (tick < 100) docScroll = 40;
  else if (tick < 120) docScroll = 40 + (tick - 100) * 1;
  else if (tick < 200) docScroll = 60;
  else if (tick < 220) docScroll = 60 + (tick - 200) * 2;
  else if (tick < 300) docScroll = 100;
  else if (tick < 330) docScroll = 100 + (tick - 300) * 1.5;
  else docScroll = 145;

  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden relative">
      {/* Source Document Reference */}
      <div className="flex flex-col h-1/3 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 relative shrink-0">
        <div className="bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between z-20 relative shadow-sm">
          <div className="flex items-center gap-1">
            <FileText size={10} /> Source Document: OCBC_360_Account_T&Cs_2026.pdf
          </div>
          {tick < 330 && (
            <div className="flex items-center gap-1 text-[#E3000F] animate-pulse">
              <Eye size={10} /> Reading source...
            </div>
          )}
        </div>
        <div className="p-3 text-[10px] text-slate-400 font-serif leading-relaxed relative h-full overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 p-3 transition-transform duration-100 ease-linear"
            style={{ transform: `translateY(-${docScroll}px)` }}
          >
            <h4 className="font-bold text-slate-600 mb-2 text-xs">3. Salary Bonus Interest</h4>
            <p className="mb-2">3.1 To qualify for the Salary bonus interest, the Account Holder must credit a minimum salary of S$1,800 into the OCBC 360 Account in a calendar month.</p>
            <p className="mb-2">3.2 The salary must be credited through GIRO with the transaction description "GIRO - SALARY". Other forms of salary crediting (e.g., FAST, PayNow, standing instructions) will not qualify.</p>
            <p className="mb-2">3.3 The Salary bonus interest is tiered. For the first S$100,000 of the Account Balance, the effective interest rate is up to 2.50% p.a.</p>
            <p>3.4 The Bank reserves the right to determine if a transaction qualifies as a salary credit.</p>
          </div>
          {tick < 30 && (
            <div className="absolute inset-0 shadow-[inset_0_-20px_20px_rgba(248,250,252,1)] z-10 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Intent Name</label>
          <div className="h-8 bg-slate-50 rounded border border-slate-200 flex items-center px-3 shadow-sm shrink-0">
            <span className="text-xs text-slate-700 font-mono">
              {intentName}
              {isCursorVisible(30, 50) && <span className="text-slate-400">|</span>}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Utterances (0/50)</label>
          <div className="h-32 bg-slate-50 rounded border border-slate-200 p-2 flex flex-col gap-2 shadow-sm overflow-y-auto custom-scrollbar shrink-0">
            {tick >= 100 && (
              <div className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-700 w-fit shadow-sm">
                {utt1Full}
              </div>
            )}
            {(tick >= 70 && tick < 100) && (
              <div className="text-[11px] text-slate-700 px-1">
                {utt1}
                {isCursorVisible(70, 100) && <span className="text-slate-400">|</span>}
              </div>
            )}

            {tick >= 150 && (
              <div className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-700 w-fit shadow-sm">
                {utt2Full}
              </div>
            )}
            {(tick >= 120 && tick < 150) && (
              <div className="text-[11px] text-slate-700 px-1">
                {utt2}
                {isCursorVisible(120, 150) && <span className="text-slate-400">|</span>}
              </div>
            )}

            {tick >= 200 && (
              <div className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-700 w-fit shadow-sm">
                {utt3Full}
              </div>
            )}
            {(tick >= 170 && tick < 200) && (
              <div className="text-[11px] text-slate-700 px-1">
                {utt3}
                {isCursorVisible(170, 200) && <span className="text-slate-400">|</span>}
              </div>
            )}

            {tick >= 250 && (
              <div className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-700 w-fit shadow-sm">
                {utt4Full}
              </div>
            )}
            {(tick >= 220 && tick < 250) && (
              <div className="text-[11px] text-slate-700 px-1">
                {utt4}
                {isCursorVisible(220, 250) && <span className="text-slate-400">|</span>}
              </div>
            )}

            {tick >= 300 && (
              <div className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[11px] text-slate-700 w-fit shadow-sm">
                {utt5Full}
              </div>
            )}
            {(tick >= 270 && tick < 300) && (
              <div className="text-[11px] text-slate-700 px-1">
                {utt5}
                {isCursorVisible(270, 300) && <span className="text-slate-400">|</span>}
              </div>
            )}

            {tick < 70 && <span className="text-xs text-slate-400 italic px-1">Type utterance and press Enter...</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Responses</label>
          <div className="h-24 bg-slate-50 rounded border border-slate-200 p-2 shadow-sm shrink-0">
            <span className="text-[11px] text-slate-700 leading-relaxed">
              {response}
              {(isCursorVisible(330, 380) || isCursorVisible(400, 430) || isCursorVisible(450, 520)) && <span className="text-slate-400">|</span>}
            </span>
          </div>
        </div>

        <div className="mt-auto flex justify-end pt-2">
          <div className={cn(
            "px-4 py-1.5 rounded text-xs font-bold transition-all duration-300",
            tick >= 520 ? "bg-[#E3000F] text-white shadow-md scale-105" : "bg-slate-200 text-slate-400"
          )}>
            Save Intent
          </div>
        </div>
      </div>
    </div>
  );
};

export default function IntentDiscovery({ onDeploy }: { onDeploy: () => void }) {
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const [selectedIntents, setSelectedIntents] = useState<Set<string>>(new Set());
  const [editingIntentId, setEditingIntentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ intent: string; response: string; utterances: string[] }>({ intent: '', response: '', utterances: [] });

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');

  const [showTraditionalWorkflow, setShowTraditionalWorkflow] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const [syncHistory, setSyncHistory] = useState<SyncSession[]>(() => {
    const saved = localStorage.getItem('ocbc_sync_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ocbc_sync_history', JSON.stringify(syncHistory));
  }, [syncHistory]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setActiveSyncId(null);
    setTimeout(() => {
      setIsGenerating(false);

      const shuffled = [...MOCK_DIFFS].sort(() => 0.5 - Math.random());
      const selectedDiffs = shuffled.slice(0, Math.floor(Math.random() * 3) + 2);

      const newSync: SyncSession = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        sources: [...sources],
        status: 'pending',
        diffs: selectedDiffs
      };
      setSyncHistory(prev => [newSync, ...prev].slice(0, 5));
      setActiveSyncId(newSync.id);
    }, 2000);
  };

  const handleDeploy = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setSyncHistory(prev => prev.map(s => {
        if (s.id !== activeSyncId) return s;
        return {
          ...s,
          status: 'deployed',
          diffs: s.diffs.filter(d => selectedIntents.has(d.id))
        };
      }));
      onDeploy();
    }, 1500);
  };

  const handleSaveEdit = () => {
    if (!activeSyncId || !editingIntentId) return;
    setSyncHistory(prev => prev.map(s => {
      if (s.id !== activeSyncId) return s;
      return {
        ...s,
        diffs: s.diffs.map(d => {
          if (d.id !== editingIntentId) return d;
          return { ...d, intent: editForm.intent, response: editForm.response, utterances: editForm.utterances };
        })
      };
    }));
    setEditingIntentId(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const newSources = files.map(file => ({
        id: Date.now().toString() + Math.random().toString(),
        type: file.name.includes('.') ? 'doc' : 'folder',
        name: file.name
      }));
      setSources(prev => [...prev, ...newSources]);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files) as File[];
    if (files.length > 0) {
      const newSources = files.map(file => ({
        id: Date.now().toString() + Math.random().toString(),
        type: file.name.includes('.') ? 'doc' : 'folder',
        name: file.name
      }));
      setSources(prev => [...prev, ...newSources]);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setSources(prev => [...prev, {
        id: Date.now().toString(),
        type: 'url',
        name: urlInput.trim()
      }]);
      setUrlInput('');
    }
  };

  const activeSync = syncHistory.find(s => s.id === activeSyncId);
  const displayDiffs = activeSync?.diffs || MOCK_DIFFS;

  useEffect(() => {
    if (activeSyncId) {
      setSelectedIntents(new Set(displayDiffs.map(d => d.id)));
    } else {
      setSelectedIntents(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSyncId]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIntents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIntents(newSet);
  };

  const toggleAll = () => {
    if (selectedIntents.size === displayDiffs.length) {
      setSelectedIntents(new Set());
    } else {
      setSelectedIntents(new Set(displayDiffs.map(d => d.id)));
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)]">

      {/* Traditional Workflow - Collapsible */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowTraditionalWorkflow(!showTraditionalWorkflow)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-slate-400" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold text-slate-900">Traditional Workflow</span>
              <span className="text-xs text-slate-400">Manual intent creation process (~30 mins/intent)</span>
            </div>
          </div>
          {showTraditionalWorkflow ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {showTraditionalWorkflow && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 h-[500px] overflow-hidden">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Manual Entry</span>
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <Clock size={12} /> Tedious
                    </span>
                  </div>
                  <TraditionalWorkflowMock />
                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between relative z-20">
                    <span className="text-sm font-bold text-slate-500">Total Effort</span>
                    <span className="text-lg font-black text-slate-400">~30 MINS / INTENT</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Knowledge Synchronization */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Knowledge Synchronization</h2>
          <p className="text-slate-500 text-sm">
            Automatically discover and update chatbot intents from your latest policy documents and web resources.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">

          {/* Left Panel: Inputs & History */}
          <div className="flex flex-col gap-6 h-full">

          {/* Input Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6 shrink-0">
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold text-slate-700">Knowledge Sources</label>

              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {sources.map(source => (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {source.type === 'url' && <Globe size={16} className="text-slate-400 shrink-0" />}
                        {source.type === 'doc' && <FileText size={16} className="text-slate-400 shrink-0" />}
                        {source.type === 'folder' && <Folder size={16} className="text-slate-400 shrink-0" />}
                        <span className="text-xs font-medium text-slate-700 truncate">{source.name}</span>
                      </div>
                      <button
                        onClick={() => setSources(sources.filter(s => s.id !== source.id))}
                        className="text-slate-400 hover:text-[#E3000F] transition-all shrink-0 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-3">
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group",
                    isDragging ? "border-[#E3000F] bg-[#E3000F]/5" : "border-slate-300 hover:bg-slate-50 hover:border-[#E3000F]/50"
                  )}
                >
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-10 h-10 bg-[#E3000F]/10 text-[#E3000F] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={20} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Drag & Drop or Click to Add</span>
                  <span className="text-xs text-slate-500 mt-1">PDFs, DOCX, and Folders</span>
                </div>

                <form onSubmit={handleAddUrl} className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#E3000F]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!urlInput.trim()}
                    className="px-4 py-2 bg-[#E3000F] text-white text-sm font-semibold rounded-lg hover:bg-[#E3000F]/90 disabled:opacity-50 transition-all"
                  >
                    Add URL
                  </button>
                </form>
              </div>
            </div>

            {/* Advanced Settings - Collapsible */}
            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center justify-between w-full group"
              >
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Settings2 size={16} /> Advanced Settings
                </span>
                {showAdvancedSettings ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>

              <AnimatePresence>
                {showAdvancedSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Max Intents</label>
                        <input type="number" defaultValue={15} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#E3000F]" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-500">Match Sensitivity</label>
                        <select className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#E3000F]">
                          <option>Balanced</option>
                          <option>Strict</option>
                          <option>Broad</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

             <button
              onClick={handleGenerate}
              disabled={isGenerating || sources.length === 0}
              className="w-full bg-[#E3000F] hover:bg-[#E3000F]/90 text-white font-semibold py-3 rounded-xl shadow-lg shadow-[#E3000F]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} fill="currentColor" />}
              {isGenerating ? "Analyzing Knowledge..." : "Discover & Sync"}
            </button>
          </div>

          {/* Recent Syncs */}
          {syncHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4 flex-1 min-h-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 shrink-0">
                <History size={16} /> Recent Syncs
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2">
                {syncHistory.map(sync => (
                  <button
                    key={sync.id}
                    onClick={() => {
                      setActiveSyncId(sync.id);
                      setSources(sync.sources);
                    }}
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-xl border text-left transition-all shrink-0",
                      activeSyncId === sync.id ? "bg-[#E3000F]/5 border-[#E3000F]/20" : "bg-white border-slate-100 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-slate-900 truncate pr-2">{sync.date}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0",
                        sync.status === 'deployed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {sync.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{sync.sources.length} sources analyzed</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

          {/* Right Panel: Comparison View */}
          <div className="flex flex-col gap-6 min-h-0">
            <AnimatePresence mode="wait">
              {!activeSyncId ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]"
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <FileText className="text-slate-400" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">No Analysis Pending</h3>
                  <p className="text-slate-500 max-w-sm mt-2">
                    Add sources and click "Discover & Sync", or select a recent sync from the history to view results.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-4 h-full min-h-0"
                >
                  {/* Next-Gen Column */}
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-bold text-[#E3000F] uppercase tracking-widest">Next-Gen AI Sync</span>
                    <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                      <Zap size={12} fill="currentColor" /> Automated Discovery
                    </span>
                  </div>
                  <div className="bg-white border-2 border-[#E3000F] rounded-2xl p-6 shadow-xl shadow-[#E3000F]/10 flex flex-col gap-4 flex-1 min-h-0">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          selectedIntents.size === displayDiffs.length ? "bg-[#E3000F] border-[#E3000F]" : "border-slate-300 group-hover:border-[#E3000F]"
                        )}>
                          {selectedIntents.size === displayDiffs.length && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">
                          {selectedIntents.size === displayDiffs.length ? 'Deselect All' : 'Select All'} ({selectedIntents.size}/{displayDiffs.length})
                        </span>
                        <input type="checkbox" className="hidden" checked={selectedIntents.size === displayDiffs.length} onChange={toggleAll} />
                      </label>
                    </div>
                    <div className="flex flex-col gap-3 pr-2 custom-scrollbar overflow-y-auto min-h-0">
                      {displayDiffs.map((diff) => (
                        <div
                          key={diff.id}
                          className={cn(
                            "p-3 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer",
                            selectedIntents.has(diff.id) ? "bg-[#E3000F]/5 border-[#E3000F]/20" : "bg-slate-50 border-slate-100 hover:border-slate-300"
                          )}
                          onClick={() => toggleSelection(diff.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                selectedIntents.has(diff.id) ? "bg-[#E3000F] border-[#E3000F]" : "border-slate-300 bg-white"
                              )}>
                                {selectedIntents.has(diff.id) && <CheckCircle2 size={12} className="text-white" />}
                              </div>
                              <span className="text-xs font-bold font-mono text-slate-900">{diff.intent}</span>
                            </div>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                              diff.status === 'new' ? "bg-emerald-100 text-emerald-700" :
                              diff.status === 'changed' ? "bg-amber-100 text-amber-700" :
                              "bg-[#E3000F]/10 text-[#E3000F]"
                            )}>
                              {diff.status}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1 pl-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Utterances ({diff.utterances.length})</span>
                            <div className="flex flex-wrap gap-1">
                              {diff.utterances.slice(0, 2).map((u, i) => (
                                <span key={i} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 italic truncate max-w-[150px]">
                                  "{u}"
                                </span>
                              ))}
                              {diff.utterances.length > 2 && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">+{diff.utterances.length - 2} more</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 mt-1 pl-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Response</span>
                            <p className="text-[11px] text-slate-600 line-clamp-2 italic">"{diff.response}"</p>
                          </div>

                          {diff.whatsChanged && (
                            <div className="mt-1 ml-6 p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                              <span className="text-[10px] font-bold text-amber-700 uppercase block mb-0.5">What's Changed</span>
                              <ul className="text-[10px] text-amber-800 leading-tight list-disc list-inside space-y-0.5">
                                {Array.isArray(diff.whatsChanged) ? diff.whatsChanged.map((change, idx) => (
                                  <li key={idx}>{change}</li>
                                )) : <li>{diff.whatsChanged}</li>}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#E3000F]">Total Effort</span>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-[#E3000F] tracking-tighter">&lt; 2 SECONDS</span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">99.8% Faster</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Deployment Summary - Concise Point Form */}
        {activeSyncId && activeSync?.status !== 'deployed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row items-start justify-between gap-6"
          >
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="text-[#E3000F]" /> Ready for Deployment
            </h3>
            <ul className="text-slate-300 text-sm space-y-1">
              {displayDiffs.filter(d => d.status === 'new').length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span><strong>{displayDiffs.filter(d => d.status === 'new').length} new</strong> — {displayDiffs.filter(d => d.status === 'new').map(d => d.intent).join(', ')}</span>
                </li>
              )}
              {displayDiffs.filter(d => d.status === 'changed').length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span><strong>{displayDiffs.filter(d => d.status === 'changed').length} changed</strong> — {displayDiffs.filter(d => d.status === 'changed').map(d => d.intent).join(', ')}</span>
                </li>
              )}
              {displayDiffs.filter(d => d.status === 'deleted').length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span><strong>{displayDiffs.filter(d => d.status === 'deleted').length} to delete</strong> — {displayDiffs.filter(d => d.status === 'deleted').map(d => d.intent).join(', ')}</span>
                </li>
              )}
            </ul>
          </div>
          <div className="flex flex-wrap gap-4 justify-end shrink-0">
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all whitespace-nowrap"
            >
              Review Intents ({displayDiffs.length})
            </button>
            <button
              onClick={() => {
                if (selectedIntents.size < displayDiffs.length) {
                  setSelectedIntents(new Set(displayDiffs.map(d => d.id)));
                }
                handleDeploy();
              }}
              disabled={isDeploying}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all whitespace-nowrap disabled:opacity-50"
            >
              Approve All & Deploy
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeploying || selectedIntents.size === 0}
              className="px-6 py-3 bg-[#E3000F] hover:bg-[#E3000F]/90 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#E3000F]/20 disabled:opacity-50 whitespace-nowrap"
            >
              {isDeploying ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {isDeploying ? "Deploying..." : `Approve Selected (${selectedIntents.size})`}
            </button>
          </div>
        </motion.div>
      )}

      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReviewModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-xl font-bold text-slate-900">Review Discovered Intents</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-slate-500">{displayDiffs.length} intents found in selected sources</p>
                    <label className="flex items-center gap-2 cursor-pointer group bg-slate-100 px-3 py-1 rounded-full">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        selectedIntents.size === displayDiffs.length ? "bg-[#E3000F] border-[#E3000F]" : "border-slate-300 bg-white group-hover:border-[#E3000F]"
                      )}>
                        {selectedIntents.size === displayDiffs.length && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">
                        {selectedIntents.size === displayDiffs.length ? 'Deselect All' : 'Select All'}
                      </span>
                      <input type="checkbox" className="hidden" checked={selectedIntents.size === displayDiffs.length} onChange={toggleAll} />
                    </label>
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                {displayDiffs.map((diff) => (
                  <div
                    key={diff.id}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col gap-4 transition-all",
                      selectedIntents.has(diff.id) ? "bg-red-50/30 border-[#E3000F]/20" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                            selectedIntents.has(diff.id) ? "bg-[#E3000F] border-[#E3000F]" : "border-slate-300 bg-white group-hover:border-[#E3000F]"
                          )}>
                            {selectedIntents.has(diff.id) && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={selectedIntents.has(diff.id)} onChange={() => toggleSelection(diff.id)} />
                        </label>
                        {editingIntentId === diff.id ? (
                          <input
                            type="text"
                            value={editForm.intent}
                            onChange={e => setEditForm(prev => ({ ...prev, intent: e.target.value }))}
                            className="text-sm font-black text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#E3000F]"
                          />
                        ) : (
                          <span className="text-sm font-black text-slate-900">{diff.intent}</span>
                        )}
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                          diff.status === 'new' ? "bg-emerald-100 text-emerald-700" :
                          diff.status === 'changed' ? "bg-amber-100 text-amber-700" :
                          "bg-[#E3000F]/10 text-[#E3000F]"
                        )}>
                          {diff.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold text-slate-400">Confidence: {(diff.confidence * 100).toFixed(1)}%</span>
                        {editingIntentId === diff.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={handleSaveEdit} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded">Save</button>
                            <button onClick={() => setEditingIntentId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingIntentId(diff.id);
                              setEditForm({ intent: diff.intent, response: diff.response, utterances: [...diff.utterances] });
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {diff.whatsChanged && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">What's Changed</span>
                        <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
                          {Array.isArray(diff.whatsChanged) ? diff.whatsChanged.map((change, idx) => (
                            <li key={idx}>{change}</li>
                          )) : <li>{diff.whatsChanged}</li>}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suggested Utterances ({diff.utterances.length})</span>
                        {editingIntentId === diff.id ? (
                          <div className="flex flex-col gap-2">
                            {editForm.utterances.map((utt, i) => (
                              <div key={i} className="flex gap-2">
                                <input
                                  type="text"
                                  value={utt}
                                  onChange={(e) => {
                                    const newUtts = [...editForm.utterances];
                                    newUtts[i] = e.target.value;
                                    setEditForm(prev => ({ ...prev, utterances: newUtts }));
                                  }}
                                  className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E3000F] focus:border-[#E3000F] text-sm outline-none"
                                />
                                <button
                                  onClick={() => {
                                    const newUtts = editForm.utterances.filter((_, index) => index !== i);
                                    setEditForm(prev => ({ ...prev, utterances: newUtts }));
                                  }}
                                  className="p-2 text-slate-400 hover:text-[#E3000F] transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => setEditForm(prev => ({ ...prev, utterances: [...prev.utterances, ''] }))}
                              className="text-sm text-[#E3000F] hover:text-red-700 font-bold flex items-center gap-1 self-start mt-1"
                            >
                              <Plus className="w-4 h-4" /> Add Utterance
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {diff.utterances.map((u, i) => (
                              <span key={i} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-600 italic">
                                "{u}"
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Generated Response</span>
                        {editingIntentId === diff.id ? (
                          <textarea
                            value={editForm.response}
                            onChange={e => setEditForm(prev => ({ ...prev, response: e.target.value }))}
                            className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-300 outline-none focus:border-[#E3000F] min-h-[100px] resize-y"
                          />
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                            {diff.response}
                          </p>
                        )}
                      </div>
                    </div>

                    {editingIntentId === diff.id && diff.llmSuggestion && (
                      <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                        <button
                          onClick={() => setEditForm({
                            intent: diff.llmSuggestion!.intent,
                            response: diff.llmSuggestion!.response,
                            utterances: [...diff.llmSuggestion!.utterances]
                          })}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Restore to LLM Suggestion
                        </button>
                      </div>
                    )}

                    {diff.original && (
                      <details className="group mt-2">
                        <summary className="text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700 transition-colors list-none flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform">▶</span> Show Original Intent
                        </summary>
                        <div className="mt-3 p-4 bg-slate-100/50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 opacity-70">
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Original Utterances</span>
                            <div className="flex flex-wrap gap-2">
                              {diff.original.utterances?.map((u, i) => (
                                <span key={i} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500 italic line-through">
                                  "{u}"
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Original Response</span>
                            <p className="text-sm text-slate-500 leading-relaxed bg-white p-3 rounded-xl border border-slate-100 line-through">
                              {diff.original.response}
                            </p>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-6 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowReviewModal(false); handleDeploy(); }}
                  disabled={selectedIntents.size === 0}
                  className="px-8 py-2.5 bg-[#E3000F] hover:bg-[#E3000F]/90 text-white font-bold rounded-xl shadow-lg shadow-[#E3000F]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Approve & Sync Selected ({selectedIntents.size})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
