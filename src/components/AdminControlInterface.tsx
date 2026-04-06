import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PendingApproval, AuditEvent, ApprovalActionType } from '../types';

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
  'document.reindex': {
    label: 'Document Re-index',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  'document.delete': {
    label: 'Document Delete',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  'document.full_reindex': {
    label: 'Full Re-index',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
  },
  'system.kill_switch_activate': {
    label: 'Kill Switch Activate',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
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
  onAddApproval: (a: Omit<PendingApproval, 'id' | 'submittedAt' | 'status'>) => void;
  onAddAuditEvent: (e: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
}

export default function AdminControlInterface({ approvals, onApprovalDecision, onAddApproval, onAddAuditEvent }: AdminControlInterfaceProps) {
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

  const handleApprove = (id: string) => {
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
      {/* Page Content */}
      <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Approvals</h2>
          <p className="text-slate-500 text-lg">
            Maker-checker approval queue for all pending changes.
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
