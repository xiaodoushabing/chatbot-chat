import React, { useState } from 'react';
import {
  Power,
  Zap,
  ClipboardCheck,
  CheckCircle,
  Check,
  X,
  Clock,
  FileText,
  Layers,
  Database,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import TemplateManagement from './TemplateManagement';
import DocumentManagement from './DocumentManagement';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AciSubView = 'templates' | 'documents';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

type ApprovalActionType = 'template_publish' | 'intent_promote' | 'kill_switch_deactivate';

interface PendingApproval {
  id: string;
  actionType: ApprovalActionType;
  entityName: string;
  description: string;
  detail: string;
  submittedBy: string;
  submittedAt: string;
  status: ApprovalStatus;
  actionReviewNote?: string;
}

interface ToastMsg {
  id: number;
  message: string;
}

let toastIdCounter = 0;

const ACTION_TYPE_CONFIG: Record<
  ApprovalActionType,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  template_publish: {
    label: 'Template Publish',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  intent_promote: {
    label: 'Intent Promote',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
  },
  kill_switch_deactivate: {
    label: 'Kill Switch Deactivate',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
};

const INITIAL_APPROVALS: PendingApproval[] = [
  {
    id: '1',
    actionType: 'template_publish',
    entityName: 'CPF_Life_Standard_Response',
    description: 'Publish updated template content',
    detail:
      'Sarah Chen updated the CPF Life Standard Response template to include CPF LIFE plan options detail and personalised balance substitution ({{cpf_balance}}). This change affects all queries routed to OCBC_Life_Goals_Retirement intent.',
    submittedBy: 'Sarah Chen',
    submittedAt: '2026-03-26 09:15',
    status: 'pending',
  },
  {
    id: '2',
    actionType: 'intent_promote',
    entityName: 'CPF_Retirement_Advisory',
    description: 'Promote intent from Staging → Production',
    detail:
      'CPF_Retirement_Advisory intent has been reviewed and tested in staging with 4 utterances. Risk level: High. Response mode: GenAI. Promoting to production will make it live for all users immediately.',
    submittedBy: 'Sarah Chen',
    submittedAt: '2026-03-26 10:40',
    status: 'pending',
  },
  {
    id: '3',
    actionType: 'kill_switch_deactivate',
    entityName: 'Global Kill Switch',
    description: 'Deactivate kill switch — re-enable GenAI responses',
    detail:
      'Kill switch was activated at 11:30 following a guardrail alert. The injection attempt has been resolved and blocked. DEV team has confirmed system is safe to resume GenAI responses. Deactivation will immediately re-enable all LLM agent calls.',
    submittedBy: 'Dev Team',
    submittedAt: '2026-03-26 11:55',
    status: 'pending',
  },
];

interface AdminControlInterfaceProps {
  onKillSwitchChange?: (active: boolean) => void;
}

export default function AdminControlInterface({ onKillSwitchChange }: AdminControlInterfaceProps = {}) {
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showDeactivateSubmit, setShowDeactivateSubmit] = useState(false);
  const [activeSubView, setActiveSubView] = useState<AciSubView>('templates');
  const [approvals, setApprovals] = useState<PendingApproval[]>(INITIAL_APPROVALS);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Per-card state for approve/reject flows
  const [approveNote, setApproveNote] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [activeApproveId, setActiveApproveId] = useState<string | null>(null);
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);

  const showToast = (message: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const handleActivateKillSwitch = () => {
    setKillSwitchActive(true);
    onKillSwitchChange?.(true);
    setShowActivateConfirm(false);
    showToast('Kill switch activated — all GenAI responses disabled');
  };

  const handleDeactivateSubmit = () => {
    setShowDeactivateSubmit(false);
    // Add kill switch deactivate to approvals if not already pending
    const alreadyPending = approvals.some(
      a => a.actionType === 'kill_switch_deactivate' && a.status === 'pending'
    );
    if (!alreadyPending) {
      const newApproval: PendingApproval = {
        id: String(Date.now()),
        actionType: 'kill_switch_deactivate',
        entityName: 'Global Kill Switch',
        description: 'Deactivate kill switch — re-enable GenAI responses',
        detail:
          'Deactivation submitted by System Admin. Re-enabling GenAI will allow all LLM agent calls to resume immediately after approval.',
        submittedBy: 'System Admin',
        submittedAt: '2026-03-26 ' + new Date().toTimeString().slice(0, 5),
        status: 'pending',
      };
      setApprovals(prev => [newApproval, ...prev]);
    }
    showToast('Deactivation submitted for checker approval');
  };

  const handleApprove = (id: string) => {
    const approval = approvals.find(a => a.id === id);
    // If kill switch deactivate, actually deactivate it
    if (approval?.actionType === 'kill_switch_deactivate') {
      setKillSwitchActive(false);
      onKillSwitchChange?.(false);
    }
    setApprovals(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, status: 'approved', actionReviewNote: approveNote[id] ?? '' }
          : a
      )
    );
    setActiveApproveId(null);
    setApproveNote(prev => { const next = { ...prev }; delete next[id]; return next; });
    showToast('Approval confirmed');
  };

  const handleReject = (id: string) => {
    const reason = rejectReason[id];
    if (!reason?.trim()) return;
    setApprovals(prev =>
      prev.map(a =>
        a.id === id ? { ...a, status: 'rejected', actionReviewNote: reason } : a
      )
    );
    setActiveRejectId(null);
    setRejectReason(prev => { const next = { ...prev }; delete next[id]; return next; });
    showToast('Approval rejected');
  };

  const handleTemplatePublish = (templateName: string, _content: string) => {
    // Add approval to the queue from TemplateManagement's Publish action
    const alreadyPending = approvals.some(
      a =>
        a.actionType === 'template_publish' &&
        a.entityName === templateName &&
        a.status === 'pending'
    );
    if (!alreadyPending) {
      const newApproval: PendingApproval = {
        id: String(Date.now()),
        actionType: 'template_publish',
        entityName: templateName,
        description: `Publish updated template content`,
        detail: `System Admin submitted template "${templateName}" for publishing. Changes will take effect for all intents linked to this template once approved.`,
        submittedBy: 'System Admin',
        submittedAt: '2026-03-26 ' + new Date().toTimeString().slice(0, 5),
        status: 'pending',
      };
      setApprovals(prev => [newApproval, ...prev]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Kill Switch Header Bar */}
      <AnimatePresence mode="wait">
        {killSwitchActive ? (
          <motion.div
            key="active"
            initial={{ opacity: 0, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.8 }}
            className="bg-red-600 text-white px-6 py-4 flex items-center gap-4 shadow-lg shadow-red-900/30 relative overflow-hidden"
          >
            {/* Pulsing background effect */}
            <motion.div
              animate={{ opacity: [0.15, 0.3, 0.15] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-red-500 pointer-events-none"
            />
            <div className="flex items-center gap-3 flex-1 relative">
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="inline-flex"
              >
                <Zap size={22} className="text-white" fill="white" />
              </motion.span>
              <div>
                <p className="font-black text-lg tracking-wide">
                  KILL SWITCH ACTIVE
                </p>
                <p className="text-red-100 text-sm font-medium">
                  All GenAI responses disabled — system serving templates and exclusions only
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeactivateSubmit(true)}
              className="shrink-0 px-5 py-2 border-2 border-white text-white font-bold rounded-xl text-sm hover:bg-white/10 transition-all relative"
            >
              Deactivate
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="inactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-slate-900 text-white px-6 py-3 flex items-center gap-4"
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-sm font-bold text-slate-200">Kill Switch: Inactive</span>
              <span className="text-slate-500 text-sm">|</span>
              <span className="text-sm font-medium text-slate-300">GenAI: Active</span>
            </div>
            <button
              onClick={() => setShowActivateConfirm(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-1.5 border border-red-500 text-red-400 font-bold rounded-xl text-xs hover:bg-red-950/50 transition-all"
            >
              <Power size={13} />
              Activate Kill Switch
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Admin Control Interface</h2>
          <p className="text-slate-500 text-lg">
            Kill switch, maker-checker approvals, template and document management.
          </p>
        </div>

        {/* Maker-Checker Queue */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <ClipboardCheck size={20} className="text-slate-600" />
            <h3 className="text-lg font-bold text-slate-900">Pending Approvals</h3>
            {pendingApprovals.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                {pendingApprovals.length}
              </span>
            )}
          </div>

          <div className="p-6">
            {pendingApprovals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 py-8 text-slate-400"
              >
                <CheckCircle size={32} className="text-emerald-400" />
                <p className="text-sm font-medium">All clear — no pending approvals</p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {pendingApprovals.map(approval => {
                    const actionCfg = ACTION_TYPE_CONFIG[approval.actionType];
                    const isApprovingThis = activeApproveId === approval.id;
                    const isRejectingThis = activeRejectId === approval.id;

                    return (
                      <motion.div
                        key={approval.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 60, scale: 0.95 }}
                        className="border border-slate-200 rounded-2xl overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="flex items-start gap-4 p-5">
                          <div className="flex flex-col gap-2 flex-1 min-w-0">
                            {/* Action type + entity */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  'px-2.5 py-0.5 rounded-lg border text-xs font-bold',
                                  actionCfg.bgClass,
                                  actionCfg.textClass,
                                  actionCfg.borderClass
                                )}
                              >
                                {actionCfg.label}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">
                                {approval.entityName}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-sm font-medium text-slate-700">
                              {approval.description}
                            </p>

                            {/* Detail box */}
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {approval.detail}
                              </p>
                            </div>

                            {/* Submitter */}
                            <div className="flex items-center gap-2">
                              <Clock size={12} className="text-slate-400" />
                              <span className="text-xs text-slate-400">
                                Submitted by{' '}
                                <span className="font-bold text-slate-600">{approval.submittedBy}</span>{' '}
                                at {approval.submittedAt}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {!isApprovingThis && !isRejectingThis && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setActiveApproveId(approval.id);
                                  setActiveRejectId(null);
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all"
                              >
                                <Check size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setActiveRejectId(approval.id);
                                  setActiveApproveId(null);
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-xl text-sm transition-all"
                              >
                                <X size={14} />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Approve Inline Flow */}
                        <AnimatePresence>
                          {isApprovingThis && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 flex flex-col gap-3 border-t border-emerald-100 bg-emerald-50/50">
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest pt-3">
                                  Add a note (optional)
                                </p>
                                <textarea
                                  value={approveNote[approval.id] ?? ''}
                                  onChange={e =>
                                    setApproveNote(prev => ({
                                      ...prev,
                                      [approval.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="E.g. Reviewed content — looks good. Approved."
                                  className="w-full px-3 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none min-h-[60px]"
                                />
                                <div className="flex justify-end gap-3">
                                  <button
                                    onClick={() => setActiveApproveId(null)}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleApprove(approval.id)}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all"
                                  >
                                    <Check size={14} />
                                    Confirm Approval
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Reject Inline Flow */}
                        <AnimatePresence>
                          {isRejectingThis && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 flex flex-col gap-3 border-t border-red-100 bg-red-50/50">
                                <p className="text-xs font-bold text-red-700 uppercase tracking-widest pt-3">
                                  Rejection reason (required)
                                </p>
                                <textarea
                                  value={rejectReason[approval.id] ?? ''}
                                  onChange={e =>
                                    setRejectReason(prev => ({
                                      ...prev,
                                      [approval.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="State the reason for rejection..."
                                  className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none min-h-[60px]"
                                />
                                <div className="flex justify-end gap-3">
                                  <button
                                    onClick={() => setActiveRejectId(null)}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleReject(approval.id)}
                                    disabled={!rejectReason[approval.id]?.trim()}
                                    className="flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <X size={14} />
                                    Confirm Rejection
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Sub-View Tab Switcher */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1 border-b border-slate-200">
            {([
              { id: 'templates', label: 'Template Management', icon: <FileText size={16} /> },
              { id: 'documents', label: 'Document Management', icon: <Database size={16} /> },
            ] as { id: AciSubView; label: string; icon: React.ReactNode }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubView(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 font-bold text-sm transition-all border-b-2 -mb-px',
                  activeSubView === tab.id
                    ? 'text-[#E3000F] border-[#E3000F]'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-200'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSubView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {activeSubView === 'templates' && (
                <TemplateManagement onPublish={handleTemplatePublish} />
              )}
              {activeSubView === 'documents' && <DocumentManagement />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Kill Switch Activate Confirmation Modal */}
      <AnimatePresence>
        {showActivateConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActivateConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Power size={20} className="text-[#E3000F]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Activate Kill Switch</h3>
                </div>
                <button
                  onClick={() => setShowActivateConfirm(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-2">
                  <p className="text-sm font-bold text-red-900">Impact Summary</p>
                  <ul className="text-sm text-red-700 flex flex-col gap-1.5">
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      All LLM agent calls will be immediately disabled
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      All queries will be served by template responses or exclusion messages
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      Takes effect immediately — no delay
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      Re-enable requires checker approval
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-slate-600">
                  This is an emergency override. Use only when there is an active security incident,
                  model misbehavior, or compliance violation.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowActivateConfirm(false)}
                    className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleActivateKillSwitch}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#E3000F] hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-200"
                  >
                    <Power size={15} />
                    Activate Emergency Override
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kill Switch Deactivate Submit Modal */}
      <AnimatePresence>
        {showDeactivateSubmit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeactivateSubmit(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Layers size={20} className="text-amber-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Submit Deactivation</h3>
                </div>
                <button
                  onClick={() => setShowDeactivateSubmit(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-sm font-bold text-amber-900 mb-1">
                    Checker approval required
                  </p>
                  <p className="text-sm text-amber-700">
                    Deactivating the kill switch requires a second actor to approve. Submitting will
                    add this to the Pending Approvals queue. GenAI will remain disabled until
                    approved.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowDeactivateSubmit(false)}
                    className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeactivateSubmit}
                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all"
                  >
                    <Check size={15} />
                    Submit for Review
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts */}
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
