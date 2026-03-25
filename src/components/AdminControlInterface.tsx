import React, { useState } from 'react';
import {
  Power,
  Zap,
  ClipboardCheck,
  CheckCircle,
  Check,
  X,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PendingApproval, AuditEvent, AuditActionType, ApprovalActionType } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  'intent.toggle_status': {
    label: 'Intent Toggle',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
  },
  'intent.edit': {
    label: 'Intent Edit',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
  },
  'intent.rollback': {
    label: 'Intent Rollback',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
  },
  'intent.promote_batch': {
    label: 'Intent Promote (Batch)',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
  },
  'agent.config_change': {
    label: 'Agent Config Change',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
  },
  'agent.status_change': {
    label: 'Agent Status Change',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
  },
  'agent.kill_switch': {
    label: 'Agent Kill Switch',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  'guardrail.policy_change': {
    label: 'Guardrail Policy Change',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  'template.publish': {
    label: 'Template Publish',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
  },
  'template.restore': {
    label: 'Template Restore',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-700',
    borderClass: 'border-cyan-200',
  },
  'system.kill_switch_deactivate': {
    label: 'Kill Switch Deactivate',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
};

interface AdminControlInterfaceProps {
  approvals: PendingApproval[];
  onApprovalDecision: (id: string, decision: 'approved' | 'rejected', note?: string) => void;
  onAddAuditEvent: (e: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
  onKillSwitchChange?: (active: boolean) => void;
}

export default function AdminControlInterface({ approvals, onApprovalDecision, onAddAuditEvent, onKillSwitchChange }: AdminControlInterfaceProps) {
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showDeactivateSubmit, setShowDeactivateSubmit] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [showRecentDecisions, setShowRecentDecisions] = useState(false);

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
  const recentDecisions = approvals.filter(a => a.status !== 'pending').slice(0, 5);

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
      a => a.actionType === 'system.kill_switch_deactivate' && a.status === 'pending'
    );
    if (!alreadyPending) {
      onAddAuditEvent({
        actor: 'System Admin',
        actorRole: 'ADMIN',
        actionType: 'approval.submit' as AuditActionType,
        entityType: 'approval',
        entityId: 'kill-switch-deactivate-' + Date.now(),
        entityName: 'Global Kill Switch',
        description: 'Deactivation submitted for checker approval. Re-enabling GenAI will resume all LLM agent calls.',
        severity: 'critical',
      });
    }
    showToast('Deactivation submitted for checker approval');
  };

  const handleApprove = (id: string) => {
    const approval = approvals.find(a => a.id === id);
    // If kill switch deactivate, actually deactivate it
    if (approval?.actionType === 'system.kill_switch_deactivate') {
      setKillSwitchActive(false);
      onKillSwitchChange?.(false);
    }
    onApprovalDecision(id, 'approved', approveNote[id]);
    setActiveApproveId(null);
    setApproveNote(prev => { const next = { ...prev }; delete next[id]; return next; });
    showToast('Approval confirmed');
  };

  const handleReject = (id: string) => {
    const reason = rejectReason[id];
    if (!reason?.trim()) return;
    onApprovalDecision(id, 'rejected', reason);
    setActiveRejectId(null);
    setRejectReason(prev => { const next = { ...prev }; delete next[id]; return next; });
    showToast('Approval rejected');
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
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Change Control</h2>
          <p className="text-slate-500 text-lg">
            Kill switch management and maker-checker approval queue.
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

                            {/* Batch items */}
                            {approval.batchItems && approval.batchItems.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {approval.batchItems.map(item => (
                                  <span key={item} className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            )}

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
                                at {new Date(approval.submittedAt).toLocaleString()}
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

        {/* Recent Decisions */}
        {recentDecisions.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowRecentDecisions(v => !v)}
              className="w-full px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition-all"
            >
              <ClipboardCheck size={20} className="text-slate-400" />
              <h3 className="text-lg font-bold text-slate-900 flex-1 text-left">Recent Decisions</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200 mr-2">
                {recentDecisions.length}
              </span>
              {showRecentDecisions ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>

            <AnimatePresence>
              {showRecentDecisions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 flex flex-col gap-3">
                    {recentDecisions.map(approval => {
                      const actionCfg = ACTION_TYPE_CONFIG[approval.actionType];
                      return (
                        <div key={approval.id} className="border border-slate-100 rounded-xl p-4 flex items-start gap-4 bg-slate-50/50">
                          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-lg border text-xs font-bold',
                                  actionCfg.bgClass,
                                  actionCfg.textClass,
                                  actionCfg.borderClass
                                )}
                              >
                                {actionCfg.label}
                              </span>
                              <span className="font-bold text-slate-700 text-sm">{approval.entityName}</span>
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-xs font-bold',
                                approval.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-red-100 text-red-700'
                              )}>
                                {approval.status === 'approved' ? 'Approved' : 'Rejected'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{approval.description}</p>
                            {approval.actionReviewNote && (
                              <p className="text-xs text-slate-400 italic">"{approval.actionReviewNote}"</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
