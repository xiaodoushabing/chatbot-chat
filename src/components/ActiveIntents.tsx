import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  MessageSquare,
  X,
  Plus,
  AlertTriangle,
  ShieldCheck,
  Power,
  PowerOff,
  Sparkles,
  History,
  ArrowUpCircle,
  Clock,
  Ban,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PendingApproval, AuditEvent } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ActiveIntentsProps {
  onAddApproval: (a: Omit<PendingApproval, 'id' | 'submittedAt' | 'status'>) => void;
  onAddAuditEvent: (e: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
  autoOpenCreate?: boolean;
  onClearAutoOpen?: () => void;
  pendingApprovals?: PendingApproval[];
}

type RiskLevel = 'high' | 'low';
type ResponseMode = 'genai' | 'template' | 'exclude';
type Environment = 'staging' | 'production';

interface HistoryEntry {
  timestamp: string;
  actor: string;
  description: string;
}

interface Topic {
  id: string;
  name: string;
  queries: number;
  responseMode: ResponseMode;
  riskLevel: RiskLevel;
  status: 'active' | 'inactive';
  utterances: string[];
  response: string;
  environment: Environment;
  pendingApproval?: boolean;
}

const MOCK_HISTORY: Record<string, HistoryEntry[]> = {
  '1': [
    { timestamp: '2026-03-24 14:32', actor: 'Sarah Chen', description: 'Updated utterances +2' },
    { timestamp: '2026-03-20 09:15', actor: 'Admin', description: 'Response text revised' },
    { timestamp: '2026-03-10 11:00', actor: 'Sarah Chen', description: 'Risk level changed: high → low' },
  ],
  '2': [
    { timestamp: '2026-03-22 16:45', actor: 'Admin', description: 'Response text revised' },
    { timestamp: '2026-03-15 10:20', actor: 'Sarah Chen', description: 'Risk level changed: low → high' },
    { timestamp: '2026-03-01 08:00', actor: 'Admin', description: 'Intent created' },
  ],
  '3': [
    { timestamp: '2026-03-23 13:10', actor: 'Sarah Chen', description: 'Updated utterances +1' },
    { timestamp: '2026-03-18 15:30', actor: 'Admin', description: 'Response mode changed: template → genai' },
    { timestamp: '2026-02-28 09:00', actor: 'Sarah Chen', description: 'Intent created' },
  ],
  '4': [
    { timestamp: '2026-03-21 11:55', actor: 'Admin', description: 'Response text revised' },
    { timestamp: '2026-03-12 14:00', actor: 'Sarah Chen', description: 'Updated utterances +2' },
    { timestamp: '2026-03-05 10:30', actor: 'Admin', description: 'Intent created' },
  ],
  '5': [
    { timestamp: '2026-03-20 09:40', actor: 'Sarah Chen', description: 'Updated utterances +1' },
    { timestamp: '2026-03-11 16:20', actor: 'Admin', description: 'Response text revised' },
    { timestamp: '2026-03-03 11:15', actor: 'Sarah Chen', description: 'Intent created' },
  ],
  '6': [
    { timestamp: '2026-03-19 14:00', actor: 'Admin', description: 'Risk level changed: low → high' },
    { timestamp: '2026-03-14 10:45', actor: 'Sarah Chen', description: 'Response text revised' },
    { timestamp: '2026-03-02 09:30', actor: 'Admin', description: 'Intent created' },
  ],
  '7': [
    { timestamp: '2026-03-25 10:00', actor: 'Admin', description: 'Response mode set to exclude' },
    { timestamp: '2026-03-20 15:00', actor: 'Sarah Chen', description: 'Risk level changed: low → high' },
    { timestamp: '2026-03-15 09:00', actor: 'Admin', description: 'Intent created' },
  ],
  '8': [
    { timestamp: '2026-03-26 08:30', actor: 'Sarah Chen', description: 'Intent created in staging' },
    { timestamp: '2026-03-26 08:30', actor: 'Sarah Chen', description: 'Utterances added +4' },
    { timestamp: '2026-03-26 08:30', actor: 'Sarah Chen', description: 'Awaiting promotion to production' },
  ],
};

const INITIAL_TOPICS: Topic[] = [
  // ── Low risk — GenAI ──────────────────────────────────────────────────────
  {
    id: '1', name: 'OCBC_360_Salary_Credit', queries: 1840, responseMode: 'genai', riskLevel: 'low', status: 'active', environment: 'production',
    utterances: ['What is the minimum salary credit for OCBC 360?', 'How does salary credit affect my 360 interest?', 'Can I use GIRO for salary credit?'],
    response: 'To earn the Salary bonus interest on your OCBC 360 Account, you need to credit a minimum salary of S$1,800 through GIRO.'
  },
  {
    id: '3', name: 'OCBC_Life_Goals_Retirement', queries: 2310, responseMode: 'genai', riskLevel: 'low', status: 'active', environment: 'production',
    utterances: ['How do I set up a retirement goal in OCBC app?', 'OCBC Life Goals retirement calculator', 'What is the OCBC Life Goals feature?'],
    response: 'You can set up a retirement goal using OCBC Life Goals in the OCBC Digital app.'
  },
  {
    id: '4', name: 'Account_Balance_Query', queries: 1240, responseMode: 'genai', riskLevel: 'low', status: 'active', environment: 'production',
    utterances: ['What is my account balance?', 'Show me my balance', 'How much money do I have?'],
    response: 'I can help you check your account balance. Please log in to your OCBC Digital app or visit any OCBC ATM.'
  },
  // ── High risk — GenAI, Template, Exclude ─────────────────────────────────
  {
    id: '2', name: 'Home_Loan_Repayment_Impact', queries: 920, responseMode: 'genai', riskLevel: 'high', status: 'active', environment: 'production',
    utterances: ['I am getting a new house, how does it affect my savings?', 'Impact of mortgage on OCBC 360 wealth bonus', 'Will buying a house delay my retirement goals?'],
    response: 'Taking up an OCBC Home Loan can help you earn the Wealth bonus on your 360 Account. However, a new mortgage will reduce your monthly disposable income.'
  },
  {
    id: '6', name: 'International_Transfer', queries: 2100, responseMode: 'template', riskLevel: 'high', status: 'active', environment: 'production',
    utterances: ['How to send money overseas?', 'International transfer fees', 'Transfer to Malaysia'],
    response: 'You can make international transfers through OCBC Digital app. Fees vary by destination and transfer method.'
  },
  {
    id: '7', name: 'Investment_Product_Inquiry', queries: 430, responseMode: 'exclude', riskLevel: 'high', status: 'active', environment: 'production',
    utterances: ['What investments does OCBC offer?', 'Show me unit trusts', 'Can I buy stocks through OCBC?'],
    response: 'OCBC offers a range of investment products. Please speak with our wealth advisors for personalised guidance.'
  },
];

const RISK_CONFIG = {
  high: { label: 'High', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', hint: 'Sensitive financial topic — template recommended' },
  low: { label: 'Low', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', hint: 'Safe for GenAI responses' },
};

const MODE_CONFIG: Record<ResponseMode, { label: string; activeClass: string; textClass: string }> = {
  genai: { label: 'GenAI', activeClass: 'bg-emerald-600 text-white', textClass: 'text-emerald-700' },
  template: { label: 'Template', activeClass: 'bg-amber-500 text-white', textClass: 'text-amber-700' },
  exclude: { label: 'Exclude', activeClass: 'bg-slate-500 text-white', textClass: 'text-slate-600' },
};

function generateMockUtterances(intentName: string): string[] {
  const base = intentName.replace(/_/g, ' ').toLowerCase();
  return [
    `Tell me about ${base}`,
    `I need help with ${base}`,
    `Can you explain ${base} to me?`,
  ];
}

function generateMockResponse(current: string): string {
  return `Based on our knowledge base: ${current} [AI-drafted — please review before saving]`;
}

// Toast component
interface ToastMsg {
  id: number;
  message: string;
}

let toastIdCounter = 0;

export default function ActiveIntents({ onAddApproval, onAddAuditEvent, autoOpenCreate, onClearAutoOpen, pendingApprovals = [] }: ActiveIntentsProps) {
  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const saved = localStorage.getItem('ocbc_topics_v2');
      return saved ? JSON.parse(saved) : INITIAL_TOPICS;
    } catch { return INITIAL_TOPICS; }
  });
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterRisk, setFilterRisk] = useState<'all' | RiskLevel>('all');
  const [filterMode, setFilterMode] = useState<'all' | ResponseMode>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // History panel
  const [historyTopic, setHistoryTopic] = useState<Topic | null>(null);

  // Edit modal AI generation state
  const [isGeneratingUtterances, setIsGeneratingUtterances] = useState(false);
  const [isDraftingResponse, setIsDraftingResponse] = useState(false);
  const [suggestedUtterances, setSuggestedUtterances] = useState<string[]>([]);
  const [originalResponse, setOriginalResponse] = useState<string | null>(null);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    try { localStorage.setItem('ocbc_topics_v2', JSON.stringify(topics)); } catch {}
  }, [topics]);

  // Apply approved/rejected changes back to topics state
  const appliedApprovalIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const newlyDecided = pendingApprovals.filter(a =>
      (a.status === 'approved' || a.status === 'rejected') &&
      a.payload &&
      !appliedApprovalIds.current.has(a.id)
    );
    if (newlyDecided.length === 0) return;
    newlyDecided.forEach(a => appliedApprovalIds.current.add(a.id));
    setTopics(prev => {
      let updated = [...prev];
      for (const approval of newlyDecided) {
        const p = approval.payload!;
        const topicId = p.topicId as string;
        if (approval.status === 'rejected') {
          // Clear the pending flag on rejection
          updated = updated.map(t => t.id === topicId ? { ...t, pendingApproval: false } : t);
        } else {
          // Apply the change on approval
          if (p.action === 'delete') {
            updated = updated.filter(t => t.id !== topicId);
          } else if (p.action === 'promote') {
            updated = updated.map(t => t.id === topicId ? { ...t, environment: 'production' as const, pendingApproval: false } : t);
          } else if (p.action === 'edit') {
            updated = updated.map(t => t.id === topicId ? { ...(p.topic as Topic), pendingApproval: false } : t);
          } else if (p.field === 'responseMode') {
            updated = updated.map(t => t.id === topicId ? { ...t, responseMode: p.value as ResponseMode, pendingApproval: false } : t);
          } else if (p.field === 'status') {
            updated = updated.map(t => t.id === topicId ? { ...t, status: p.value as 'active' | 'inactive', pendingApproval: false } : t);
          }
        }
      }
      return updated;
    });
  }, [pendingApprovals]);

  const showToast = (message: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  // Reset AI state when modal closes or a new topic is opened
  useEffect(() => {
    setIsGeneratingUtterances(false);
    setIsDraftingResponse(false);
    setSuggestedUtterances([]);
    setOriginalResponse(null);
  }, [editingTopic?.id]);

  // Auto-open create modal when prop signals it
  useEffect(() => {
    if (autoOpenCreate) {
      setEditingTopic({
        id: `new-${Date.now()}`,
        name: '',
        utterances: [],
        response: '',
        riskLevel: 'low',
        responseMode: 'genai',
        status: 'active',
        environment: 'staging',
        queries: 0,
      });
      onClearAutoOpen?.();
    }
  }, [autoOpenCreate]);

  const activeFilterCount = [
    filterRisk !== 'all',
    filterMode !== 'all',
    filterStatus !== 'all',
  ].filter(Boolean).length;

  const filteredTopics = topics.filter(t => {
    if (!t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterRisk !== 'all' && t.riskLevel !== filterRisk) return false;
    if (filterMode !== 'all' && t.responseMode !== filterMode) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const handleSetResponseMode = (id: string, mode: ResponseMode) => {
    const topic = topics.find(t => t.id === id);
    if (!topic || topic.responseMode === mode) return;
    setConfirmDialog({
      title: 'Change Response Mode',
      message: `Submit a request to change "${topic.name}" from ${MODE_CONFIG[topic.responseMode].label} to ${MODE_CONFIG[mode].label}? This requires checker approval before taking effect.`,
      onConfirm: () => {
        onAddApproval({
          actionType: 'intent.edit',
          entityName: topic.name,
          entityId: topic.id,
          description: `Response mode change: ${topic.responseMode} → ${mode}`,
          detail: `Response mode for "${topic.name}" changed from ${topic.responseMode} to ${mode}. Submitted by System Admin.`,
          submittedBy: 'System Admin',
          payload: { topicId: topic.id, field: 'responseMode', value: mode },
        });
        onAddAuditEvent({
          actor: 'System Admin',
          actorRole: 'BA',
          actionType: 'approval.submit',
          entityType: 'intent',
          entityId: topic.id,
          entityName: topic.name,
          description: `Response mode change submitted for approval: ${topic.responseMode} → ${mode}`,
          severity: 'info',
          before: { responseMode: topic.responseMode },
          after: { responseMode: mode },
        });
        setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, pendingApproval: true } : t));
        showToast('Response mode change submitted for approval');
      },
    });
  };

  const handleToggleStatus = (id: string) => {
    const topic = topics.find(t => t.id === id);
    if (!topic) return;
    const newStatus = topic.status === 'active' ? 'inactive' : 'active';
    setConfirmDialog({
      title: `${newStatus === 'inactive' ? 'Deactivate' : 'Activate'} Topic`,
      message: `Submit a request to ${newStatus === 'inactive' ? 'deactivate' : 'activate'} "${topic.name}"? This change will require checker approval before taking effect.`,
      onConfirm: () => doToggleStatus(id),
    });
  };

  const doToggleStatus = (id: string) => {
    const topic = topics.find(t => t.id === id);
    if (!topic) return;
    const newStatus = topic.status === 'active' ? 'inactive' : 'active';
    onAddApproval({
      actionType: 'intent.toggle_status',
      entityName: topic.name,
      entityId: topic.id,
      description: `Set status: ${topic.status} → ${newStatus}`,
      detail: `Status change for intent "${topic.name}" submitted for checker approval. Current status: ${topic.status}.`,
      submittedBy: 'System Admin',
      payload: { topicId: topic.id, field: 'status', value: newStatus },
    });
    onAddAuditEvent({
      actor: 'System Admin',
      actorRole: 'BA',
      actionType: 'approval.submit',
      entityType: 'intent',
      entityId: topic.id,
      entityName: topic.name,
      description: `Submitted status toggle for approval: ${topic.status} → ${newStatus}`,
      severity: 'info',
    });
    setTopics(prev => prev.map(t => t.id === id ? { ...t, pendingApproval: true } : t));
    showToast(`Status change submitted for approval`);
  };

  const handleDelete = (id: string) => {
    const topic = topics.find(t => t.id === id);
    if (!topic) return;
    setConfirmDialog({
      title: 'Delete Topic',
      message: `Submit a request to delete "${topic.name}"? This requires checker approval before the topic is removed.`,
      onConfirm: () => {
        onAddApproval({
          actionType: 'intent.edit',
          entityName: topic.name,
          entityId: topic.id,
          description: `Delete intent "${topic.name}"`,
          detail: `Deletion of intent "${topic.name}" submitted for checker approval. Submitted by System Admin.`,
          submittedBy: 'System Admin',
          payload: { topicId: topic.id, action: 'delete' },
        });
        onAddAuditEvent({
          actor: 'System Admin',
          actorRole: 'BA',
          actionType: 'approval.submit',
          entityType: 'intent',
          entityId: topic.id,
          entityName: topic.name,
          description: `Intent deletion submitted for approval`,
          severity: 'warning',
        });
        setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, pendingApproval: true } : t));
        showToast('Delete request submitted for approval');
      },
    });
  };

  const handlePromoteToProd = (id: string) => {
    const topic = topics.find(t => t.id === id);
    if (!topic) return;
    setConfirmDialog({
      title: 'Promote to Production',
      message: `Submit "${topic.name}" for production promotion? A checker must approve before it goes live.`,
      onConfirm: () => doPromoteToProd(id),
    });
  };

  const doPromoteToProd = (id: string) => {
    {
      const topic = topics.find(t => t.id === id);
      if (!topic) return;
      onAddApproval({
        actionType: 'intent.promote_batch',
        entityName: topic.name,
        entityId: id,
        description: `Promote intent "${topic.name}" to Production`,
        detail: `Intent in staging submitted for production promotion. Submitted by System Admin.`,
        submittedBy: 'System Admin',
        batchItems: [topic.name],
        payload: { topicId: id, action: 'promote' },
      });
      onAddAuditEvent({
        actor: 'System Admin',
        actorRole: 'BA',
        actionType: 'approval.submit',
        entityType: 'intent',
        entityId: id,
        entityName: topic.name,
        description: `Intent promotion to Production submitted for approval`,
        severity: 'info',
      });
      setTopics(prev => prev.map(t => t.id === id ? { ...t, pendingApproval: true } : t));
      showToast('Submitted for maker-checker approval');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;
    setConfirmDialog({
      title: 'Submit for Approval',
      message: `Submit changes to "${editingTopic.name}" for checker approval? The changes will not take effect until approved.`,
      onConfirm: () => doSaveEdit(),
    });
  };

  const doSaveEdit = () => {
    if (!editingTopic) return;
    const original = topics.find(t => t.id === editingTopic.id);
    onAddApproval({
      actionType: 'intent.edit',
      entityName: editingTopic.name,
      entityId: editingTopic.id,
      description: `Edit intent "${editingTopic.name}"`,
      detail: `Updated utterances (${editingTopic.utterances.length}) and response text. Submitted by System Admin.`,
      submittedBy: 'System Admin',
      payload: { topicId: editingTopic.id, action: 'edit', topic: editingTopic },
    });
    onAddAuditEvent({
      actor: 'System Admin',
      actorRole: 'BA',
      actionType: 'approval.submit',
      entityType: 'intent',
      entityId: editingTopic.id,
      entityName: editingTopic.name,
      description: `Intent edit submitted for approval`,
      severity: 'info',
      before: original ? { utterances: original.utterances, response: original.response } : undefined,
      after: { utterances: editingTopic.utterances, response: editingTopic.response },
    });
    setTopics(prev => prev.map(t => t.id === editingTopic.id ? { ...t, pendingApproval: true } : t));
    setEditingTopic(null);
    showToast('Edit submitted for approval');
  };

  const handleRemoveUtterance = (index: number) => {
    if (editingTopic) {
      setEditingTopic({ ...editingTopic, utterances: editingTopic.utterances.filter((_, i) => i !== index) });
    }
  };

  const handleAddUtterance = () => {
    if (editingTopic) {
      setEditingTopic({ ...editingTopic, utterances: [...editingTopic.utterances, ''] });
    }
  };

  const handleUtteranceChange = (index: number, value: string) => {
    if (editingTopic) {
      const newUtterances = [...editingTopic.utterances];
      newUtterances[index] = value;
      setEditingTopic({ ...editingTopic, utterances: newUtterances });
    }
  };

  const handleAcceptSuggested = (utt: string) => {
    if (editingTopic) {
      setEditingTopic({ ...editingTopic, utterances: [...editingTopic.utterances, utt] });
      setSuggestedUtterances(prev => prev.filter(u => u !== utt));
    }
  };

  const handleDismissSuggested = (utt: string) => {
    setSuggestedUtterances(prev => prev.filter(u => u !== utt));
  };

  const handleGenerateUtterances = () => {
    if (!editingTopic || isGeneratingUtterances) return;
    setIsGeneratingUtterances(true);
    setTimeout(() => {
      setSuggestedUtterances(generateMockUtterances(editingTopic.name));
      setIsGeneratingUtterances(false);
    }, 1500);
  };

  const handleDraftResponse = () => {
    if (!editingTopic || isDraftingResponse) return;
    setIsDraftingResponse(true);
    const savedOriginal = originalResponse ?? editingTopic.response;
    setTimeout(() => {
      setOriginalResponse(savedOriginal);
      setEditingTopic(prev => prev ? { ...prev, response: generateMockResponse(savedOriginal) } : prev);
      setIsDraftingResponse(false);
    }, 1500);
  };

  const handleRevertResponse = () => {
    if (!editingTopic || originalResponse === null) return;
    setEditingTopic({ ...editingTopic, response: originalResponse });
    setOriginalResponse(null);
  };

  const handleRestoreVersion = (entry: HistoryEntry) => {
    if (!historyTopic) return;
    setConfirmDialog({
      title: 'Request Rollback',
      message: `Submit a request to restore "${historyTopic.name}" to the version from ${entry.timestamp}? This will require checker approval before taking effect.`,
      onConfirm: () => doRestoreVersion(entry),
    });
  };

  const doRestoreVersion = (entry: HistoryEntry) => {
    if (!historyTopic) return;
    onAddApproval({
      actionType: 'intent.rollback',
      entityName: historyTopic.name,
      entityId: historyTopic.id,
      description: `Rollback intent "${historyTopic.name}" to version from ${entry.timestamp}`,
      detail: `Restore to version authored by ${entry.actor} on ${entry.timestamp}. Description: ${entry.description}. Submitted by System Admin.`,
      submittedBy: 'System Admin',
    });
    onAddAuditEvent({
      actor: 'System Admin',
      actorRole: 'BA',
      actionType: 'approval.submit',
      entityType: 'intent',
      entityId: historyTopic.id,
      entityName: historyTopic.name,
      description: `Rollback to version from ${entry.timestamp} submitted for approval`,
      severity: 'warning',
    });
    setHistoryTopic(null);
    showToast('Rollback submitted for approval');
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Active Topics</h2>
          <p className="text-slate-500 text-sm">Manage chatbot topics and response modes.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#E3000F] outline-none transition-all w-56"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              "relative p-2.5 border rounded-xl transition-all flex items-center gap-2 px-4",
              showFilters || activeFilterCount > 0
                ? "bg-red-50 border-[#E3000F] text-[#E3000F]"
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-900"
            )}
          >
            <Filter size={20} />
            <span className="text-base font-bold">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#E3000F] text-white text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={16} className={cn("transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: -24 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -24 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center gap-4 shadow-sm">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Filter by:</span>

              {/* Risk Level */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Risk Level</label>
                <select
                  value={filterRisk}
                  onChange={e => setFilterRisk(e.target.value as typeof filterRisk)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
                >
                  <option value="all">All Risks</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Response Mode */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Response Mode</label>
                <select
                  value={filterMode}
                  onChange={e => setFilterMode(e.target.value as typeof filterMode)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
                >
                  <option value="all">All Modes</option>
                  <option value="genai">GenAI</option>
                  <option value="template">Template</option>
                  <option value="exclude">Exclude</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-base font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterRisk('all'); setFilterMode('all'); setFilterStatus('all'); }}
                  className="ml-auto text-sm font-bold text-[#E3000F] hover:text-red-700 transition-all"
                >
                  Clear all
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Topic</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Risk</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Response Mode</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Queries</th>
              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTopics.map((topic) => {
              const risk = RISK_CONFIG[topic.riskLevel];
              const RiskIcon = risk.icon;
              const isStaging = topic.environment === 'staging';

              return (
                <motion.tr
                  key={topic.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-all group"
                >
                  {/* Topic name + env badge */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-[#E3000F] shrink-0">
                        <MessageSquare size={18} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-lg">{topic.name}</span>
                          {isStaging ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider">
                              STAGING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                              PROD
                            </span>
                          )}
                          {pendingApprovals.some(a => a.entityId === topic.id && a.status === 'pending') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-600 text-xs font-bold">
                              <Clock size={11} />
                              Pending
                            </span>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          topic.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                        )}>
                          {topic.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="px-4 py-3">
                    <div
                      className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border", risk.bg, risk.border)}
                      title={risk.hint}
                    >
                      <RiskIcon size={16} className={risk.color} />
                      <span className={cn("text-sm font-bold", risk.color)}>{risk.label}</span>
                    </div>
                  </td>

                  {/* Response Mode — 3-way selector */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        {(['genai', 'template', 'exclude'] as ResponseMode[]).map(mode => (
                          <button
                            key={mode}
                            onClick={() => handleSetResponseMode(topic.id, mode)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all",
                              topic.responseMode === mode
                                ? MODE_CONFIG[mode].activeClass
                                : "text-slate-400 hover:text-slate-700"
                            )}
                          >
                            {MODE_CONFIG[mode].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Queries */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-mono text-slate-600">{topic.queries.toLocaleString()}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleToggleStatus(topic.id)}
                        title={topic.status === 'active' ? "Deactivate" : "Activate"}
                        className={cn(
                          "p-2.5 rounded-lg transition-all",
                          topic.status === 'active'
                            ? "hover:bg-amber-50 text-slate-400 hover:text-amber-600"
                            : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                        )}
                      >
                        {topic.status === 'active' ? <PowerOff size={18} /> : <Power size={18} />}
                      </button>

                      <button
                        onClick={() => setHistoryTopic(topic)}
                        title="Version History"
                        className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                      >
                        <History size={18} />
                      </button>

                      <button
                        onClick={() => setEditingTopic({ ...topic })}
                        title="Edit"
                        className="p-2.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                      >
                        <Edit3 size={18} />
                      </button>

                      {isStaging ? (
                        <button
                          onClick={() => handlePromoteToProd(topic.id)}
                          title="Promote to Production"
                          className="p-2.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all"
                        >
                          <ArrowUpCircle size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(topic.id)}
                          title="Delete"
                          className="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filteredTopics.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-lg">
                  No topics found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-lg text-slate-500">Showing {filteredTopics.length} of {topics.length} topics</span>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTopic && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTopic(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Edit Topic</h3>
                <button
                  onClick={() => setEditingTopic(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {/* Topic Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-bold text-slate-700">Topic Name</label>
                  <input
                    type="text"
                    value={editingTopic.name}
                    onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg outline-none focus:ring-2 focus:ring-[#E3000F]"
                    required
                  />
                </div>

                {/* Response Mode */}
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-bold text-slate-700">Response Mode</label>
                  <div className="flex items-center gap-3">
                    {(['genai', 'template', 'exclude'] as ResponseMode[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEditingTopic({ ...editingTopic, responseMode: mode })}
                        className={cn(
                          "px-5 py-2.5 rounded-xl text-base font-bold transition-all",
                          editingTopic.responseMode === mode
                            ? mode === 'genai'
                              ? 'bg-emerald-600 text-white'
                              : mode === 'template'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-500 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        )}
                      >
                        {MODE_CONFIG[mode].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Utterances */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-lg font-bold text-slate-700">
                      Utterances ({editingTopic.utterances.length})
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleGenerateUtterances}
                        disabled={isGeneratingUtterances || editingTopic.name.trim() === ''}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-[#E3000F] hover:bg-red-50 border border-[#E3000F] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isGeneratingUtterances ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                              className="inline-block"
                            >
                              <Sparkles size={14} />
                            </motion.span>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Generate utterances
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddUtterance}
                        className="text-base font-bold text-[#E3000F] hover:text-red-700 flex items-center gap-1"
                      >
                        <Plus size={16} /> Add
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {editingTopic.utterances.map((utt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={utt}
                          onChange={(e) => handleUtteranceChange(i, e.target.value)}
                          placeholder="Enter utterance..."
                          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-lg outline-none focus:ring-2 focus:ring-[#E3000F]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveUtterance(i)}
                          className="p-2.5 text-slate-400 hover:text-[#E3000F] transition-colors shrink-0"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Suggested utterances */}
                  <AnimatePresence>
                    {suggestedUtterances.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-2 overflow-hidden"
                      >
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mt-1">
                          AI Suggestions — click to accept
                        </p>
                        {suggestedUtterances.map((utt, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => handleAcceptSuggested(utt)}
                              className="flex-1 px-4 py-2.5 bg-amber-50 border border-dashed border-amber-400 rounded-lg text-base text-left text-slate-700 hover:bg-amber-100 transition-all"
                            >
                              {utt}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissSuggested(utt)}
                              className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                            >
                              <X size={18} />
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Response */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-lg font-bold text-slate-700">Response</label>
                    <div className="flex items-center gap-3">
                      {originalResponse !== null && (
                        <button
                          type="button"
                          onClick={handleRevertResponse}
                          className="text-sm font-bold text-slate-500 hover:text-slate-700 underline transition-all"
                        >
                          Revert
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDraftResponse}
                        disabled={isDraftingResponse}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-[#E3000F] hover:bg-red-50 border border-[#E3000F] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isDraftingResponse ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                              className="inline-block"
                            >
                              <Sparkles size={14} />
                            </motion.span>
                            Drafting...
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Draft response
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {originalResponse !== null && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                      <Sparkles size={12} />
                      AI-drafted response — review before saving
                    </div>
                  )}
                  <textarea
                    value={editingTopic.response}
                    onChange={(e) => setEditingTopic({ ...editingTopic, response: e.target.value })}
                    className={cn(
                      "w-full px-4 py-3 bg-slate-50 border rounded-xl text-lg outline-none focus:ring-2 focus:ring-[#E3000F] min-h-[120px] resize-y transition-colors",
                      originalResponse !== null ? "border-amber-300 bg-amber-50/30" : "border-slate-200"
                    )}
                    required
                  />
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTopic(null)}
                    className="px-6 py-3 font-bold text-slate-600 hover:text-slate-900 transition-all text-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#E3000F] hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all text-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Version History Panel */}
      <AnimatePresence>
        {historyTopic && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryTopic(null)}
              className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[100] w-96 bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Version History</h3>
                  <p className="text-sm text-slate-500 mt-0.5 truncate max-w-[250px]">{historyTopic.name}</p>
                </div>
                <button
                  onClick={() => setHistoryTopic(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {(MOCK_HISTORY[historyTopic.id] ?? []).map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-slate-800">{entry.description}</span>
                        <span className="text-xs text-slate-500">{entry.actor}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{entry.timestamp}</span>
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(entry)}
                      className="self-start text-xs font-bold text-[#E3000F] hover:text-red-700 border border-[#E3000F] rounded-lg px-3 py-1 hover:bg-red-50 transition-all"
                    >
                      Restore
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
              onClick={() => setConfirmDialog(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-[160] pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 pointer-events-auto">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{confirmDialog.title}</h3>
                <p className="text-slate-600 mb-6">{confirmDialog.message}</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                    className="px-4 py-2 rounded-xl bg-[#E3000F] text-white hover:bg-red-700 font-medium transition-all"
                  >
                    Submit for Approval
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-2xl whitespace-nowrap"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
