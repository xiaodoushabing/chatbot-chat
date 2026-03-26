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
  ChevronUp,
  GitBranch,
  RotateCcw,
  Info,
  GitCompare,
  ArrowUpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PendingApproval, AuditEvent } from '../types';

interface IntentDiscoveryProps {
  onDeploy: () => void;
  onAddApproval: (a: Omit<PendingApproval, 'id' | 'submittedAt' | 'status'>) => void;
  onAddAuditEvent: (e: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
  autoOpenCreate?: boolean;
  onClearAutoOpen?: () => void;
}

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
  }
];

interface SyncSession {
  id: string;
  date: string;
  sources: { id: string; name: string; type: string; url?: string }[];
  status: 'pending' | 'staging' | 'deployed';
  pendingApproval?: boolean;
  diffs: IntentDiff[];
}

interface SnapshotEntry {
  version: string;
  label: string;
  deployedAt: string;
  deployedBy: string;
  intentCount: number;
  isLive: boolean;
}

const MOCK_SNAPSHOTS: SnapshotEntry[] = [
  { version: 'v3', label: 'v3', deployedAt: '2026-03-20', deployedBy: 'Sarah Chen', intentCount: 6, isLive: true },
  { version: 'v2', label: 'v2', deployedAt: '2026-03-10', deployedBy: 'Admin', intentCount: 5, isLive: false },
  { version: 'v1', label: 'v1', deployedAt: '2026-02-28', deployedBy: 'Admin', intentCount: 4, isLive: false },
];

// Mock production intent DB (what staging diffs are compared against)
const MOCK_PRODUCTION_INTENTS: Record<string, { utterances: string[]; response: string }> = {
  'Home_Loan_Repayment_Impact': {
    utterances: [
      'I am getting a new house, how does it affect my savings?',
      'Impact of mortgage on OCBC 360 wealth bonus',
      'Can I use CPF for my house?'
    ],
    response: "A new mortgage will reduce your monthly voluntary contributions. This shifts your 'Comfortable Retirement' milestone by 3 years."
  },
  'CPF_Life_Explanation': {
    utterances: [
      'Explain CPF Life',
      'How does the annuity work?',
      'What is CPF Life?',
      'Tell me about the national annuity scheme'
    ],
    response: "CPF LIFE is a national longevity multi-purpose annuity scheme that provides you with monthly payouts for as long as you live."
  }
};

const INITIAL_SOURCES = [
  { id: '1', type: 'doc', name: 'OCBC_360_Account_T&Cs_2026.pdf' },
  { id: '2', type: 'url', name: 'https://www.ocbc.com/personal-banking/deposits/360-account' },
  { id: '3', type: 'folder', name: '/internal/policies/q3_wealth_updates/' }
];

interface SnapshotIntent {
  name: string;
  responseMode: string;
  utterances: string[];
  response: string;
}

const SNAPSHOT_MOCK_INTENTS: Record<string, SnapshotIntent[]> = {
  'v3': [
    { name: 'CPF Withdrawal Planning', responseMode: 'GenAI', utterances: ['How do I withdraw my CPF?', 'CPF withdrawal age', 'Can I take out my CPF savings?', 'What is the CPF withdrawal limit?', 'CPF full withdrawal rules', 'How to access CPF at 55', 'CPF OA withdrawal process', 'Can I withdraw CPF for medical'], response: 'You may withdraw your CPF savings upon reaching 55, subject to the Retirement Sum requirement. Withdrawals can be made online via the CPF portal.' },
    { name: 'SRS Account Enquiry', responseMode: 'Template', utterances: ['What is SRS?', 'How to open SRS account', 'SRS contribution limit', 'SRS tax relief', 'Can foreigners open SRS'], response: '{{srs_template_response}}' },
    { name: 'Home Loan Eligibility', responseMode: 'GenAI', utterances: ['Am I eligible for a home loan?', 'Home loan income requirements', 'HDB loan vs bank loan', 'Maximum home loan amount', 'Home loan eligibility check', 'What affects home loan approval'], response: 'Your home loan eligibility depends on your income, existing debts, and the property value. We assess your Total Debt Servicing Ratio (TDSR) to determine the maximum loan amount.' },
    { name: 'Retirement Sum Schemes', responseMode: 'Template', utterances: ['What is Basic Retirement Sum?', 'CPF Full Retirement Sum', 'Enhanced Retirement Sum explained', 'How much CPF for retirement'], response: '{{retirement_sum_template}}' },
    { name: 'Investment Risk Profile', responseMode: 'GenAI', utterances: ['What is my risk profile?', 'How to determine investment risk tolerance', 'Risk appetite assessment', 'Conservative vs aggressive portfolio', 'Should I invest in equities', 'Risk profile questionnaire', 'Change my investment risk level'], response: 'Your investment risk profile is based on factors including your investment horizon, financial goals, and comfort with market volatility. Take our risk assessment to get personalised recommendations.' },
    { name: 'CPF LIFE Premium Plan', responseMode: 'GenAI', utterances: ['What is CPF LIFE Premium Plan?', 'CPF LIFE plan comparison', 'How much monthly payout CPF LIFE', 'CPF LIFE vs CPF Retirement Account'], response: 'CPF LIFE is a national longevity insurance annuity scheme. The Premium Plan provides higher monthly payouts for life in exchange for a larger premium at the point of joining.' },
  ],
  'v2': [
    { name: 'CPF Withdrawal Planning', responseMode: 'GenAI', utterances: ['How do I withdraw my CPF?', 'CPF withdrawal age', 'Can I take out my CPF savings?', 'What is the CPF withdrawal limit?', 'CPF full withdrawal rules', 'CPF OA withdrawal process'], response: 'You may withdraw your CPF savings upon reaching 55, subject to the Retirement Sum requirement.' },
    { name: 'SRS Account Enquiry', responseMode: 'Template', utterances: ['What is SRS?', 'How to open SRS account', 'SRS contribution limit', 'SRS tax relief', 'Can foreigners open SRS'], response: '{{srs_template_response}}' },
    { name: 'Home Loan Eligibility', responseMode: 'Template', utterances: ['Am I eligible for a home loan?', 'Home loan income requirements', 'HDB loan vs bank loan', 'Maximum home loan amount'], response: '{{home_loan_eligibility_template}}' },
    { name: 'Retirement Sum Schemes', responseMode: 'Template', utterances: ['What is Basic Retirement Sum?', 'CPF Full Retirement Sum', 'Enhanced Retirement Sum explained', 'How much CPF for retirement'], response: '{{retirement_sum_template}}' },
    { name: 'Investment Risk Profile', responseMode: 'GenAI', utterances: ['What is my risk profile?', 'How to determine investment risk tolerance', 'Risk appetite assessment', 'Conservative vs aggressive portfolio', 'Should I invest in equities'], response: 'Your investment risk profile is based on your investment horizon, financial goals, and comfort with market volatility.' },
  ],
  'v1': [
    { name: 'CPF Withdrawal Planning', responseMode: 'GenAI', utterances: ['How do I withdraw my CPF?', 'CPF withdrawal age', 'Can I take out my CPF savings?', 'What is the CPF withdrawal limit?', 'CPF OA withdrawal process'], response: 'You may withdraw your CPF savings upon reaching 55.' },
    { name: 'SRS Account Enquiry', responseMode: 'Template', utterances: ['What is SRS?', 'How to open SRS account', 'SRS contribution limit'], response: '{{srs_template_response}}' },
    { name: 'Home Loan Eligibility', responseMode: 'Template', utterances: ['Am I eligible for a home loan?', 'Home loan income requirements', 'HDB loan vs bank loan'], response: '{{home_loan_eligibility_template}}' },
    { name: 'Retirement Sum Schemes', responseMode: 'GenAI', utterances: ['What is Basic Retirement Sum?', 'CPF Full Retirement Sum', 'Enhanced Retirement Sum explained'], response: 'CPF Retirement Sums define how much you need to set aside for retirement income.' },
  ],
};

// Current production state (slightly different from v3 to show diff)
const CURRENT_PRODUCTION_INTENTS: SnapshotIntent[] = [
  { name: 'CPF Withdrawal Planning', responseMode: 'GenAI', utterances: ['How do I withdraw my CPF?', 'CPF withdrawal age', 'Can I take out my CPF savings?', 'What is the CPF withdrawal limit?', 'CPF full withdrawal rules', 'How to access CPF at 55', 'CPF OA withdrawal process', 'Can I withdraw CPF for medical'], response: 'You may withdraw your CPF savings upon reaching 55, subject to the Retirement Sum requirement. Withdrawals can be made online via the CPF portal.' },
  { name: 'SRS Account Enquiry', responseMode: 'Template', utterances: ['What is SRS?', 'How to open SRS account', 'SRS contribution limit', 'SRS tax relief', 'Can foreigners open SRS'], response: '{{srs_template_response}}' },
  { name: 'Home Loan Eligibility', responseMode: 'GenAI', utterances: ['Am I eligible for a home loan?', 'Home loan income requirements', 'HDB loan vs bank loan', 'Maximum home loan amount', 'Home loan eligibility check', 'What affects home loan approval'], response: 'Your home loan eligibility depends on your income, existing debts, and the property value. We assess your Total Debt Servicing Ratio (TDSR) to determine the maximum loan amount.' },
  { name: 'Retirement Sum Schemes', responseMode: 'Template', utterances: ['What is Basic Retirement Sum?', 'CPF Full Retirement Sum', 'Enhanced Retirement Sum explained', 'How much CPF for retirement'], response: '{{retirement_sum_template}}' },
  { name: 'Investment Risk Profile', responseMode: 'Template', utterances: ['What is my risk profile?', 'How to determine investment risk tolerance', 'Risk appetite assessment', 'Conservative vs aggressive portfolio', 'Should I invest in equities', 'Risk profile questionnaire', 'Change my investment risk level'], response: '{{investment_risk_template}}' },
  // CPF LIFE Premium Plan is NEW in v3 (not in production yet)
];

export default function IntentDiscovery({ onDeploy, onAddApproval, onAddAuditEvent, autoOpenCreate, onClearAutoOpen }: IntentDiscoveryProps) {
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

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Version history
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTargetVersion, setRestoreTargetVersion] = useState<string | null>(null);

  // Staging review modals
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showPromoteConfirmModal, setShowPromoteConfirmModal] = useState(false);

  // Snapshot diff modal
  const [showSnapshotModal, setShowSnapshotModal] = useState<SnapshotEntry | null>(null);

  // Manual intent creation
  const [showManualCreate, setShowManualCreate] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', utterances: '', response: '', responseMode: 'genai' });

  useEffect(() => {
    if (autoOpenCreate) {
      setShowManualCreate(true);
      onClearAutoOpen?.();
    }
  }, [autoOpenCreate]);
  const [snapshotExpandedRows, setSnapshotExpandedRows] = useState<Set<string>>(new Set());

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [syncHistory, setSyncHistory] = useState<SyncSession[]>(() => {
    const saved = localStorage.getItem('ocbc_sync_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ocbc_sync_history', JSON.stringify(syncHistory));
  }, [syncHistory]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setActiveSyncId(null);
    setTimeout(() => {
      setIsGenerating(false);

      const newSync: SyncSession = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        sources: [...sources],
        status: 'pending',
        diffs: [...MOCK_DIFFS]
      };
      setSyncHistory(prev => [newSync, ...prev].slice(0, 5));
      setActiveSyncId(newSync.id);
    }, 2000);
  };

  // Approves selected or all intents → moves session to 'staging' (not deployed)
  const handleApproveToStaging = (approveAll: boolean) => {
    setIsDeploying(true);
    if (approveAll) {
      setSelectedIntents(new Set(displayDiffs.map(d => d.id)));
    }
    setTimeout(() => {
      setIsDeploying(false);
      setSyncHistory(prev => prev.map(s => {
        if (s.id !== activeSyncId) return s;
        const approvedIds = approveAll ? new Set(s.diffs.map(d => d.id)) : selectedIntents;
        return {
          ...s,
          status: 'staging',
          diffs: s.diffs.filter(d => approvedIds.has(d.id))
        };
      }));
    }, 1200);
  };

  // Legacy deploy used internally by promote-to-production flow
  const handlePromoteToProduction = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setSyncHistory(prev => prev.map(s => {
        if (s.id !== activeSyncId) return s;
        return { ...s, status: 'deployed', pendingApproval: true };
      }));
      onDeploy();

      const approvedDiffNames = activeSync?.diffs
        .map(d => d.intent) ?? [];

      onAddApproval({
        actionType: 'intent.promote_batch',
        entityName: 'Intent Promotion Batch',
        entityId: activeSyncId ?? 'unknown',
        description: `Promote ${approvedDiffNames.length} intent(s) to Production`,
        detail: `Intents: ${approvedDiffNames.join(', ')}. Submitted for checker approval before going live.`,
        submittedBy: 'System Admin',
        batchItems: approvedDiffNames,
      });
      onAddAuditEvent({
        actor: 'System Admin',
        actorRole: 'BA',
        actionType: 'approval.submit',
        entityType: 'intent',
        entityId: activeSyncId ?? 'unknown',
        entityName: 'Intent Promotion Batch',
        description: `Batch promotion of ${approvedDiffNames.length} intent(s) submitted for approval`,
        severity: 'info',
        batchItems: approvedDiffNames,
      });

      showToast('Promotion submitted for approval');
    }, 1000);
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

  const statusBadgeClass = (status: SyncSession['status']) => {
    if (status === 'deployed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'staging') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)]">

      {/* Toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-base font-semibold"
          >
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Knowledge Synchronization */}
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Knowledge Synchronization</h2>
            <p className="text-slate-500 text-lg">
              Automatically discover and update chatbot intents from your latest policy documents and web resources.
            </p>
          </div>
          <button
            onClick={() => setShowManualCreate(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-[#E3000F] text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md shadow-red-100"
          >
            <Plus size={16} />
            New Intent
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">

          {/* Left Panel: Inputs & History */}
          <div className="flex flex-col gap-8 h-full">

          {/* Input Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col gap-8 shrink-0">
            <div className="flex flex-col gap-5">
              <label className="text-lg font-semibold text-slate-700">Knowledge Sources</label>

              <div className="flex flex-col gap-2">
                <AnimatePresence>
                  {sources.map(source => (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {source.type === 'url' && <Globe size={20} className="text-slate-400 shrink-0" />}
                        {source.type === 'doc' && <FileText size={20} className="text-slate-400 shrink-0" />}
                        {source.type === 'folder' && <Folder size={20} className="text-slate-400 shrink-0" />}
                        <span className="text-base font-medium text-slate-700 truncate">{source.name}</span>
                      </div>
                      <button
                        onClick={() => setSources(sources.filter(s => s.id !== source.id))}
                        className="text-slate-400 hover:text-[#E3000F] transition-all shrink-0 p-1"
                      >
                        <Trash2 size={18} />
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
                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group",
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
                  <div className="w-14 h-14 bg-[#E3000F]/10 text-[#E3000F] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={28} />
                  </div>
                  <span className="text-lg font-bold text-slate-700">Drag & Drop or Click to Add</span>
                  <span className="text-base text-slate-500 mt-1">PDFs, DOCX, and Folders</span>
                </div>

                <form onSubmit={handleAddUrl} className="flex gap-3">
                  <div className="relative flex-1">
                    <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base outline-none focus:ring-2 focus:ring-[#E3000F]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!urlInput.trim()}
                    className="px-6 py-3 bg-[#E3000F] text-white text-base font-semibold rounded-lg hover:bg-[#E3000F]/90 disabled:opacity-50 transition-all"
                  >
                    Add URL
                  </button>
                </form>
              </div>
            </div>

            {/* Advanced Settings - Collapsible */}
            <div className="border-t border-slate-100 pt-5">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center justify-between w-full group"
              >
                <span className="text-base font-semibold text-slate-700 flex items-center gap-2">
                  <Settings2 size={18} /> Advanced Settings
                </span>
                {showAdvancedSettings ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
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
                    <div className="grid grid-cols-2 gap-5 mt-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-medium text-slate-500">Max Intents</label>
                        <input type="number" defaultValue={15} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base outline-none focus:ring-2 focus:ring-[#E3000F]" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-base font-medium text-slate-500">Match Sensitivity</label>
                        <select className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base outline-none focus:ring-2 focus:ring-[#E3000F]">
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
              className="w-full bg-[#E3000F] hover:bg-[#E3000F]/90 text-white font-semibold py-4 rounded-xl shadow-lg shadow-[#E3000F]/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-lg"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={24} /> : <Zap size={24} fill="currentColor" />}
              {isGenerating ? "Analyzing Knowledge..." : "Discover & Sync"}
            </button>
          </div>

          {/* Recent Syncs */}
          {syncHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col gap-5 flex-1 min-h-0">
              <div className="flex items-center gap-2 text-lg font-semibold text-slate-700 shrink-0">
                <History size={20} /> Recent Syncs
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
                      "flex flex-col gap-1.5 p-4 rounded-xl border text-left transition-all shrink-0",
                      activeSyncId === sync.id ? "bg-[#E3000F]/5 border-[#E3000F]/20" : "bg-white border-slate-100 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base font-bold text-slate-900 truncate pr-2">{sync.date}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sync.status === 'deployed' && sync.pendingApproval && (
                          <Clock size={13} className="text-amber-500" />
                        )}
                        <span className={cn(
                          "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase",
                          statusBadgeClass(sync.status)
                        )}>
                          {sync.status}
                        </span>
                      </div>
                    </div>
                    <span className="text-base text-slate-500">{sync.sources.length} sources analyzed</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Intent DB Snapshots — Version History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-0 shrink-0">
            <button
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              className="flex items-center justify-between w-full group py-1"
            >
              <span className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <GitBranch size={18} className="text-slate-500" />
                Intent DB Snapshots
              </span>
              {showVersionHistory
                ? <ChevronUp size={18} className="text-slate-400" />
                : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            <AnimatePresence>
              {showVersionHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-2 mt-4">
                    {MOCK_SNAPSHOTS.map(snap => (
                      <div
                        key={snap.version}
                        onClick={() => setShowSnapshotModal(snap)}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm",
                          snap.isLive ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{snap.label}</span>
                            {snap.isLive && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold uppercase tracking-wide">
                                LIVE
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            Deployed {snap.deployedAt} by {snap.deployedBy} — {snap.intentCount} intents
                          </span>
                        </div>
                        {!snap.isLive && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRestoreTargetVersion(snap.version);
                              setShowRestoreModal(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:border-slate-400 transition-all"
                          >
                            <RotateCcw size={13} />
                            Restore
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

          {/* Right Panel: Comparison View */}
          <div className="flex flex-col gap-8 min-h-0">
            <AnimatePresence mode="wait">
              {!activeSyncId ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-16 text-center h-full min-h-[400px]"
                >
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                    <FileText className="text-slate-400" size={42} />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900">No Analysis Pending</h3>
                  <p className="text-slate-500 max-w-sm mt-4 text-lg">
                    Add sources and click "Discover & Sync", or select a recent sync from the history to view results.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-5 h-full min-h-0"
                >
                  {/* Next-Gen Column */}
                  <div className="flex flex-col gap-1 px-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[#E3000F] uppercase tracking-widest">GenAI Sync</span>
                      <span className="text-base font-medium text-emerald-600 flex items-center gap-1.5">
                        <Zap size={16} fill="currentColor" /> Automated Discovery
                      </span>
                    </div>
                    {activeSync && (
                      <span className="text-sm text-slate-500">
                        Session: {activeSync.date} · {activeSync.sources.length} sources analyzed
                      </span>
                    )}
                  </div>
                  <div className="bg-white border-2 border-[#E3000F] rounded-2xl p-8 shadow-xl shadow-[#E3000F]/10 flex flex-col gap-5 flex-1 min-h-0">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={cn(
                          "w-6 h-6 rounded border flex items-center justify-center transition-colors",
                          selectedIntents.size === displayDiffs.length ? "bg-[#E3000F] border-[#E3000F]" : "border-slate-300 group-hover:border-[#E3000F]"
                        )}>
                          {selectedIntents.size === displayDiffs.length && <CheckCircle2 size={16} className="text-white" />}
                        </div>
                        <span className="text-base font-bold text-slate-600 group-hover:text-slate-900">
                          {selectedIntents.size === displayDiffs.length ? 'Deselect All' : 'Select All'} ({selectedIntents.size}/{displayDiffs.length})
                        </span>
                        <input type="checkbox" className="hidden" checked={selectedIntents.size === displayDiffs.length} onChange={toggleAll} />
                      </label>
                    </div>
                    <div className="flex flex-col gap-4 pr-2 custom-scrollbar overflow-y-auto min-h-0">
                      {displayDiffs.map((diff) => (
                        <div
                          key={diff.id}
                          className={cn(
                            "p-5 rounded-xl border flex flex-col gap-3 transition-all cursor-pointer",
                            selectedIntents.has(diff.id)
                              ? "bg-white border-slate-200 shadow-sm"
                              : "bg-slate-50 border-slate-100 hover:border-slate-300"
                          )}
                          onClick={() => toggleSelection(diff.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0",
                                selectedIntents.has(diff.id)
                                  ? diff.status === 'new' ? "bg-emerald-600 border-emerald-600"
                                    : diff.status === 'changed' ? "bg-amber-500 border-amber-500"
                                    : "bg-red-600 border-red-600"
                                  : "border-slate-300 bg-white"
                              )}>
                                {selectedIntents.has(diff.id) && <CheckCircle2 size={16} className="text-white" />}
                              </div>
                              <span className="text-base font-bold font-mono text-slate-900">{diff.intent}</span>
                            </div>
                            <span className={cn(
                              "text-sm px-3 py-1 rounded-full font-bold uppercase",
                              diff.status === 'new' ? "bg-emerald-100 text-emerald-700" :
                              diff.status === 'changed' ? "bg-amber-100 text-amber-700" :
                              "bg-[#E3000F]/10 text-[#E3000F]"
                            )}>
                              {diff.status}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5 pl-8">
                            <span className="text-sm font-bold text-slate-400 uppercase">Utterances ({diff.utterances.length})</span>
                            <div className="flex flex-wrap gap-1.5">
                              {diff.utterances.slice(0, 2).map((u, i) => (
                                <span key={i} className="text-sm bg-white border border-slate-200 px-2.5 py-1 rounded text-slate-600 italic truncate max-w-[240px]">
                                  "{u}"
                                </span>
                              ))}
                              {diff.utterances.length > 2 && (
                                <span className="text-sm bg-slate-100 text-slate-500 px-2.5 py-1 rounded">+{diff.utterances.length - 2} more</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 mt-1 pl-8">
                            <span className="text-sm font-bold text-slate-400 uppercase">Response</span>
                            <p className="text-base text-slate-600 line-clamp-2 italic">"{diff.response}"</p>
                          </div>

                          {diff.whatsChanged && (
                            <div className="mt-1.5 ml-8 p-3.5 bg-amber-50/50 border border-amber-100 rounded-lg">
                              <span className="text-sm font-bold text-amber-700 uppercase block mb-1">{diff.status === 'deleted' ? 'Why' : "What's Changed"}</span>
                              <ul className="text-sm text-amber-800 leading-relaxed list-disc list-inside space-y-0.5">
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
                      <span className="text-xl font-black text-emerald-600 tracking-tighter">Total Effort</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-black text-emerald-600 tracking-tighter">&lt; 2 SECONDS</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Deployment Summary — PENDING status */}
        {activeSyncId && activeSync?.status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col md:flex-row items-start justify-between gap-6"
          >
          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="text-[#E3000F]" size={24} /> Ready for Staging
            </h3>
            <ul className="text-slate-300 text-base space-y-1.5">
              {displayDiffs.filter(d => d.status === 'new').length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span><strong>{displayDiffs.filter(d => d.status === 'new').length} new</strong> — {displayDiffs.filter(d => d.status === 'new').map(d => d.intent).join(', ')}</span>
                </li>
              )}
              {displayDiffs.filter(d => d.status === 'changed').length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span><strong>{displayDiffs.filter(d => d.status === 'changed').length} changed</strong> — {displayDiffs.filter(d => d.status === 'changed').map(d => d.intent).join(', ')}</span>
                </li>
              )}
              {displayDiffs.filter(d => d.status === 'deleted').length > 0 && (
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  <span><strong>{displayDiffs.filter(d => d.status === 'deleted').length} to delete</strong> — {displayDiffs.filter(d => d.status === 'deleted').map(d => d.intent).join(', ')}</span>
                </li>
              )}
            </ul>
          </div>
          <div className="flex flex-wrap gap-4 justify-end shrink-0">
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-all whitespace-nowrap text-base"
            >
              Review Intents ({displayDiffs.length})
            </button>
            <button
              onClick={() => handleApproveToStaging(false)}
              disabled={isDeploying || selectedIntents.size === 0}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold flex items-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap text-base"
            >
              {isDeploying ? "Moving to Staging..." : `Approve Selected to Staging (${selectedIntents.size})`}
            </button>
            <button
              onClick={() => handleApproveToStaging(true)}
              disabled={isDeploying}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold transition-all shadow-lg shadow-amber-900/20 whitespace-nowrap disabled:opacity-50 text-base flex items-center gap-2"
            >
              Approve All to Staging ({displayDiffs.length})
            </button>
          </div>
        </motion.div>
      )}

        {/* Staging Review Panel — STAGING status */}
        {activeSyncId && activeSync?.status === 'staging' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-amber-300 rounded-2xl p-8 flex flex-col gap-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-slate-900">Staging Review</h3>
                <span className="text-sm px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-wide">
                  STAGING
                </span>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setShowCompareModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all text-sm"
                >
                  <GitCompare size={18} />
                  Compare with Production
                </button>
                <button
                  onClick={() => setShowPromoteConfirmModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 text-sm"
                >
                  <ArrowUpCircle size={18} />
                  Promote to Production
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Approved Intents in Staging</span>
              <div className="flex flex-col gap-2">
                {activeSync.diffs.map(diff => (
                  <div
                    key={diff.id}
                    className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-100 rounded-xl"
                  >
                    <span className="text-base font-bold font-mono text-slate-800">{diff.intent}</span>
                    <span className={cn(
                      "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase",
                      diff.status === 'new' ? "bg-emerald-100 text-emerald-700" :
                      diff.status === 'changed' ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {diff.status}
                    </span>
                  </div>
                ))}
              </div>
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
                  <h3 className="text-2xl font-bold text-slate-900">Review Discovered Intents</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-base text-slate-500">{displayDiffs.length} intents found</p>
                    <label className="flex items-center gap-2 cursor-pointer group bg-slate-100 px-3 py-1.5 rounded-full">
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        selectedIntents.size === displayDiffs.length ? "bg-[#E3000F] border-[#E3000F]" : "border-slate-300 bg-white group-hover:border-[#E3000F]"
                      )}>
                        {selectedIntents.size === displayDiffs.length && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900">
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
                      "p-5 rounded-2xl border flex flex-col gap-4 transition-all",
                      selectedIntents.has(diff.id)
                        ? diff.status === 'new' ? "bg-emerald-50/30 border-emerald-300"
                          : diff.status === 'changed' ? "bg-amber-50/30 border-amber-300"
                          : "bg-red-50/30 border-red-300"
                        : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                            selectedIntents.has(diff.id)
                              ? diff.status === 'new' ? "bg-emerald-600 border-emerald-600"
                                : diff.status === 'changed' ? "bg-amber-500 border-amber-500"
                                : "bg-red-600 border-red-600"
                              : "border-slate-300 bg-white group-hover:border-slate-400"
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
                            className="text-base font-black text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-[#E3000F]"
                          />
                        ) : (
                          <span className="text-base font-black text-slate-900">{diff.intent}</span>
                        )}
                        <span className={cn(
                          "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase",
                          diff.status === 'new' ? "bg-emerald-100 text-emerald-700" :
                          diff.status === 'changed' ? "bg-amber-100 text-amber-700" :
                          "bg-[#E3000F]/10 text-[#E3000F]"
                        )}>
                          {diff.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Confidence score with tooltip — Change 4 */}
                        <div className="relative group/tip flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-400">
                            Confidence: {(diff.confidence * 100).toFixed(1)}%
                          </span>
                          <Info size={14} className="text-slate-400 cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 w-72 bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-xl leading-relaxed opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity duration-150 z-10">
                            How clearly the source material supports this as a distinct, well-scoped intent. High = specific and unambiguous. Low = vague or overlapping with other intents.
                            <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-900" />
                          </div>
                        </div>
                        {editingIntentId === diff.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={handleSaveEdit} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded">Save</button>
                            <button onClick={() => setEditingIntentId(null)} className="text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingIntentId(diff.id);
                              setEditForm({ intent: diff.intent, response: diff.response, utterances: [...diff.utterances] });
                            }}
                            className="text-sm font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-1.5 rounded-lg shadow-sm"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {diff.whatsChanged && (
                      <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex flex-col gap-1">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">{diff.status === 'deleted' ? 'Why' : "What's Changed"}</span>
                        <ul className="text-sm text-amber-800 list-disc list-inside space-y-0.5">
                          {Array.isArray(diff.whatsChanged) ? diff.whatsChanged.map((change, idx) => (
                            <li key={idx}>{change}</li>
                          )) : <li>{diff.whatsChanged}</li>}
                        </ul>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Suggested Utterances ({diff.utterances.length})</span>
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
                                  className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#E3000F] focus:border-[#E3000F] text-sm outline-none"
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
                              <span key={i} className="text-sm bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-600 italic">
                                "{u}"
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Generated Response</span>
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
                          className="text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Restore to LLM Suggestion
                        </button>
                      </div>
                    )}

                    {diff.original && (
                      <details className="group mt-2">
                        <summary className="text-sm font-bold text-slate-500 cursor-pointer hover:text-slate-700 transition-colors list-none flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform">▶</span> Show Original Intent
                        </summary>
                        <div className="mt-3 p-4 bg-slate-100/50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 opacity-70">
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Original Utterances</span>
                            <div className="flex flex-wrap gap-2">
                              {diff.original.utterances?.map((u, i) => (
                                <span key={i} className="text-sm bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500 italic line-through">
                                  "{u}"
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Original Response</span>
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
                  className="px-6 py-3 font-bold text-slate-600 hover:text-slate-900 transition-all text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowReviewModal(false); handleApproveToStaging(false); }}
                  disabled={selectedIntents.size === 0}
                  className="px-8 py-3 bg-[#E3000F] hover:bg-[#E3000F]/90 text-white font-bold rounded-xl shadow-lg shadow-[#E3000F]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  Approve Selected \u2192 Staging ({selectedIntents.size})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compare with Production Modal */}
      <AnimatePresence>
        {showCompareModal && activeSync?.status === 'staging' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompareModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Compare: Production vs Staging</h3>
                  <p className="text-slate-500 text-sm mt-1">{activeSync.diffs.length} intent(s) pending promotion</p>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                {/* Column headers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Production (current)</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-sm font-bold text-amber-700 uppercase tracking-widest">Staging (pending)</span>
                  </div>
                </div>

                {activeSync.diffs.map(diff => {
                  const prod = MOCK_PRODUCTION_INTENTS[diff.intent];
                  return (
                    <div key={diff.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-sm font-bold font-mono text-slate-800">{diff.intent}</span>
                        <span className={cn(
                          "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase",
                          diff.status === 'new' ? "bg-emerald-100 text-emerald-700" :
                          diff.status === 'changed' ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {diff.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-slate-200">
                        {/* Production side */}
                        <div className="p-5 flex flex-col gap-3">
                          {diff.status === 'new' ? (
                            <div className="flex flex-col items-center justify-center h-24 text-slate-400 gap-2">
                              <Plus size={20} className="opacity-30" />
                              <span className="text-sm italic">No existing record</span>
                            </div>
                          ) : prod ? (
                            <>
                              <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Utterances</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {prod.utterances.map((u, i) => (
                                    <span
                                      key={i}
                                      className={cn(
                                        "text-xs px-2 py-0.5 rounded border italic",
                                        diff.status === 'deleted'
                                          ? "bg-red-50 border-red-200 text-red-600 line-through"
                                          : "bg-white border-slate-200 text-slate-500"
                                      )}
                                    >
                                      "{u}"
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Response</span>
                                <p className={cn(
                                  "text-xs leading-relaxed p-3 rounded-xl border",
                                  diff.status === 'deleted'
                                    ? "bg-red-50 border-red-200 text-red-600 line-through"
                                    : "bg-white border-slate-100 text-slate-500"
                                )}>
                                  {prod.response}
                                </p>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No production record found</p>
                          )}
                        </div>
                        {/* Staging side */}
                        <div className="p-5 flex flex-col gap-3">
                          {diff.status === 'deleted' ? (
                            <div className="flex flex-col items-center justify-center h-24 text-red-400 gap-2">
                              <Trash2 size={20} className="opacity-50" />
                              <span className="text-sm italic font-medium">Will be removed</span>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Utterances</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {diff.utterances.map((u, i) => (
                                    <span
                                      key={i}
                                      className="text-xs px-2 py-0.5 rounded border bg-emerald-50 border-emerald-200 text-emerald-700 italic"
                                    >
                                      "{u}"
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Response</span>
                                <p className="text-xs leading-relaxed bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl">
                                  {diff.response}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="px-6 py-3 font-bold text-slate-600 hover:text-slate-900 transition-all text-base"
                >
                  Close
                </button>
                <button
                  onClick={() => { setShowCompareModal(false); setShowPromoteConfirmModal(true); }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all text-base flex items-center gap-2"
                >
                  <ArrowUpCircle size={18} />
                  Promote to Production
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promote to Production Confirmation Modal */}
      <AnimatePresence>
        {showPromoteConfirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPromoteConfirmModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 flex flex-col gap-6 relative z-10"
            >
              <div className="flex flex-col gap-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-2">
                  <ArrowUpCircle size={28} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Submit for Approval?</h3>
                <p className="text-slate-500 text-base leading-relaxed">
                  Submit for maker-checker approval? A checker must approve before this goes live.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowPromoteConfirmModal(false)}
                  className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPromoteConfirmModal(false);
                    handlePromoteToProduction();
                  }}
                  disabled={isDeploying}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all text-base disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeploying ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Submit for Approval
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Intent Creation Modal */}
      <AnimatePresence>
        {showManualCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]"
              onClick={() => setShowManualCreate(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-[120] pointer-events-none p-6"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">New Intent</h3>
                  <button onClick={() => setShowManualCreate(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-4 overflow-y-auto">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">Intent Name</label>
                    <input
                      type="text"
                      value={manualForm.name}
                      onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. CPF_Withdrawal_Planning"
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E3000F]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">Response Mode</label>
                    <select
                      value={manualForm.responseMode}
                      onChange={e => setManualForm(f => ({ ...f, responseMode: e.target.value }))}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E3000F]"
                    >
                      <option value="genai">GenAI</option>
                      <option value="template">Template</option>
                      <option value="exclude">Exclude</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">Utterances <span className="font-normal text-slate-400">(one per line)</span></label>
                    <textarea
                      value={manualForm.utterances}
                      onChange={e => setManualForm(f => ({ ...f, utterances: e.target.value }))}
                      placeholder={"How do I withdraw my CPF?\nCPF withdrawal age\nCPF withdrawal rules"}
                      rows={4}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E3000F] resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-bold text-slate-700">Response</label>
                    <textarea
                      value={manualForm.response}
                      onChange={e => setManualForm(f => ({ ...f, response: e.target.value }))}
                      placeholder="Enter the response text..."
                      rows={3}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E3000F] resize-none"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => setShowManualCreate(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!manualForm.name.trim()}
                    onClick={() => {
                      onAddApproval({
                        actionType: 'intent.edit',
                        entityName: manualForm.name,
                        entityId: `manual-${Date.now()}`,
                        description: `New intent "${manualForm.name}" submitted for approval`,
                        detail: `Manually created intent with ${manualForm.utterances.split('\n').filter(Boolean).length} utterances. Response mode: ${manualForm.responseMode}.`,
                        submittedBy: 'System Admin',
                      });
                      onAddAuditEvent({
                        actor: 'System Admin', actorRole: 'BA',
                        actionType: 'intent.create',
                        entityType: 'intent',
                        entityId: `manual-${Date.now()}`,
                        entityName: manualForm.name,
                        description: `New intent submitted for approval`,
                        severity: 'info',
                      });
                      showToast('New intent submitted for approval');
                      setManualForm({ name: '', utterances: '', response: '', responseMode: 'genai' });
                      setShowManualCreate(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E3000F] text-white hover:bg-red-700 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Submit for Approval
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Snapshot Diff Modal */}
      <AnimatePresence>
        {showSnapshotModal && (() => {
          const snap = showSnapshotModal;
          const snapshotIntents = SNAPSHOT_MOCK_INTENTS[snap.version] ?? [];
          // Build union of all intent names
          const allNames = Array.from(new Set([
            ...snapshotIntents.map(i => i.name),
            ...CURRENT_PRODUCTION_INTENTS.map(i => i.name),
          ]));
          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowSnapshotModal(null); setSnapshotExpandedRows(new Set()); }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <GitBranch size={20} className="text-slate-500" />
                      Snapshot {snap.label}
                    </h3>
                    <p className="text-sm text-slate-500">{snap.deployedAt} · {snap.intentCount} intents</p>
                  </div>
                  <button
                    onClick={() => { setShowSnapshotModal(null); setSnapshotExpandedRows(new Set()); }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="px-4 py-2 bg-slate-100 rounded-xl">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">This Snapshot</span>
                    </div>
                    <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Current Production</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {allNames.map(name => {
                      const inSnapshot = snapshotIntents.find(i => i.name === name);
                      const inProd = CURRENT_PRODUCTION_INTENTS.find(i => i.name === name);
                      const modeChanged = inSnapshot && inProd && inSnapshot.responseMode !== inProd.responseMode;
                      const onlyInSnapshot = inSnapshot && !inProd;
                      const onlyInProd = !inSnapshot && inProd;
                      const hasDetail = modeChanged || onlyInSnapshot || onlyInProd;
                      const isExpanded = snapshotExpandedRows.has(name);

                      return (
                        <div
                          key={name}
                          className={cn(
                            "rounded-xl border overflow-hidden",
                            modeChanged ? "border-amber-300" : onlyInSnapshot ? "border-emerald-300" : onlyInProd ? "border-red-300" : "border-slate-200"
                          )}
                        >
                          {/* Row header */}
                          <div
                            className={cn("grid grid-cols-2 divide-x", hasDetail && "cursor-pointer")}
                            onClick={() => hasDetail && setSnapshotExpandedRows(prev => {
                              const next = new Set(prev);
                              next.has(name) ? next.delete(name) : next.add(name);
                              return next;
                            })}
                          >
                            {/* Snapshot cell */}
                            <div className={cn(
                              "p-3 flex flex-col gap-1",
                              modeChanged ? "bg-amber-50" : onlyInSnapshot ? "bg-emerald-50" : "bg-white"
                            )}>
                              {inSnapshot ? (
                                <>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-slate-800">{name}</span>
                                    {hasDetail && (
                                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform shrink-0", isExpanded && "rotate-180")} />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-500">{inSnapshot.responseMode}</span>
                                    <span className="text-xs text-slate-400">· {inSnapshot.utterances.length} utterances</span>
                                    {modeChanged && <span className="text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Mode changed</span>}
                                    {onlyInSnapshot && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Will be added</span>}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-slate-400 italic">—</span>
                              )}
                            </div>
                            {/* Production cell */}
                            <div className={cn(
                              "p-3 flex flex-col gap-1",
                              modeChanged ? "bg-amber-50" : onlyInProd ? "bg-red-50" : "bg-white"
                            )}>
                              {inProd ? (
                                <>
                                  <span className="text-sm font-semibold text-slate-800">{name}</span>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-500">{inProd.responseMode}</span>
                                    <span className="text-xs text-slate-400">· {inProd.utterances.length} utterances</span>
                                    {onlyInProd && <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Will be removed</span>}
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm text-slate-400 italic">— not in production</span>
                              )}
                            </div>
                          </div>

                          {/* Expandable detail */}
                          {hasDetail && isExpanded && (
                            <div className={cn(
                              "border-t p-4 flex flex-col gap-3 text-xs",
                              modeChanged ? "bg-amber-50/60 border-amber-200" : onlyInSnapshot ? "bg-emerald-50/60 border-emerald-200" : "bg-red-50/60 border-red-200"
                            )}>
                              {modeChanged && inSnapshot && inProd && (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-600 uppercase tracking-wide">Response Mode</span>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-white border border-red-200 text-red-700 rounded font-mono">{inProd.responseMode}</span>
                                      <span className="text-slate-400">in production</span>
                                      <span className="text-slate-400">→ will become</span>
                                      <span className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-700 rounded font-mono">{inSnapshot.responseMode}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-600 uppercase tracking-wide">Response Text</span>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-slate-700 leading-relaxed">{inProd.response}</div>
                                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-slate-700 leading-relaxed">{inSnapshot.response}</div>
                                    </div>
                                  </div>
                                </>
                              )}
                              {onlyInSnapshot && inSnapshot && (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-600 uppercase tracking-wide">Content to be Added</span>
                                    <div className="p-2 bg-white border border-emerald-200 rounded-lg text-slate-700 leading-relaxed mb-1">{inSnapshot.response}</div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-600 uppercase tracking-wide">Utterances ({inSnapshot.utterances.length})</span>
                                    <div className="flex flex-wrap gap-1">
                                      {inSnapshot.utterances.map((u, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">{u}</span>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                              {onlyInProd && inProd && (
                                <>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-600 uppercase tracking-wide">Content to be Removed</span>
                                    <div className="p-2 bg-white border border-red-200 rounded-lg text-slate-700 leading-relaxed mb-1">{inProd.response}</div>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-slate-600 uppercase tracking-wide">Utterances ({inProd.utterances.length})</span>
                                    <div className="flex flex-wrap gap-1">
                                      {inProd.utterances.map((u, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full">{u}</span>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                  <button
                    onClick={() => { setShowSnapshotModal(null); setSnapshotExpandedRows(new Set()); }}
                    className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const snapshotIntentsList = SNAPSHOT_MOCK_INTENTS[snap.version] ?? [];
                      onAddApproval({
                        actionType: 'intent.rollback',
                        entityName: snap.label,
                        entityId: snap.version,
                        description: `Restore intent DB to ${snap.label}`,
                        detail: `Submitted by System Admin. This will overwrite the current production intent database with snapshot ${snap.label} (${snap.intentCount} intents, deployed ${snap.deployedAt}).`,
                        submittedBy: 'System Admin',
                        batchItems: snapshotIntentsList.map(i => i.name),
                      });
                      onAddAuditEvent({
                        actor: 'System Admin',
                        actorRole: 'DEV',
                        actionType: 'approval.submit',
                        entityType: 'intent',
                        entityId: snap.version,
                        entityName: snap.label,
                        description: `Snapshot restore request submitted for approval`,
                        severity: 'warning',
                        batchItems: snapshotIntentsList.map(i => i.name),
                      });
                      setShowSnapshotModal(null);
                      setSnapshotExpandedRows(new Set());
                      showToast('Restore request submitted for approval');
                    }}
                    className="px-6 py-2.5 bg-[#E3000F] hover:bg-[#E3000F]/90 text-white font-bold rounded-xl shadow-lg shadow-[#E3000F]/20 transition-all text-base flex items-center gap-2"
                  >
                    <RotateCcw size={18} />
                    Request Restore
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Restore Snapshot Confirmation Modal */}
      <AnimatePresence>
        {showRestoreModal && restoreTargetVersion && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRestoreModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 flex flex-col gap-6 relative z-10"
            >
              <div className="flex flex-col gap-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-2">
                  <RotateCcw size={28} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Restore to {restoreTargetVersion}?</h3>
                <p className="text-slate-500 text-base leading-relaxed">
                  This will overwrite the current live intent database. This action requires maker-checker approval.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowRestoreModal(false); setRestoreTargetVersion(null); }}
                  className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestoreTargetVersion(null);
                    showToast('Restore request submitted for approval');
                  }}
                  className="px-6 py-2.5 bg-[#E3000F] hover:bg-[#E3000F]/90 text-white font-bold rounded-xl shadow-lg shadow-[#E3000F]/20 transition-all text-base flex items-center gap-2"
                >
                  <RotateCcw size={18} />
                  Submit Restore Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
