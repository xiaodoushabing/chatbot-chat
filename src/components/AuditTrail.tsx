import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Download,
  Search,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AuditEvent, AuditActionType } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuditTrailProps {
  auditEvents: AuditEvent[];
}

type EntityType = 'intent' | 'agent' | 'template' | 'guardrail' | 'system' | 'approval';
type ActorRole = 'BA' | 'DEV' | 'ADMIN';
type Severity = 'info' | 'warning' | 'critical';

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTION_DISPLAY_NAMES: Partial<Record<AuditActionType, string>> = {
  'intent.create': 'Intent Created',
  'intent.edit': 'Intent Edited',
  'intent.delete': 'Intent Deleted',
  'intent.toggle_status': 'Intent Status Toggled',
  'intent.promote': 'Intent Promoted',
  'intent.rollback': 'Intent Rolled Back',
  'agent.config_change': 'Agent Config Changed',
  'agent.status_change': 'Agent Status Changed',
  'agent.kill_switch': 'Agent Kill Switch',
  'template.publish': 'Template Published',
  'template.restore': 'Template Restored',
  'guardrail.policy_change': 'Guardrail Policy Changed',
  'system.kill_switch_activate': 'Kill Switch Activated',
  'system.kill_switch_deactivate': 'Kill Switch Deactivated',
  'approval.submit': 'Approval Submitted',
  'approval.approve': 'Approval Granted',
  'approval.reject': 'Approval Rejected',
};

type ActionCategory = 'intent' | 'agent' | 'template' | 'guardrail' | 'system' | 'approval';

function getActionCategory(actionType: AuditActionType): ActionCategory {
  const prefix = actionType.split('.')[0] as ActionCategory;
  return prefix;
}

const CATEGORY_BORDER: Record<ActionCategory, string> = {
  intent: 'border-l-4 border-l-emerald-500',
  agent: 'border-l-4 border-l-purple-500',
  template: 'border-l-4 border-l-amber-500',
  guardrail: 'border-l-4 border-l-orange-500',
  system: 'border-l-4 border-l-[#E3000F]',
  approval: 'border-l-4 border-l-indigo-500',
};

const ROLE_BADGE: Record<ActorRole, string> = {
  BA: 'bg-blue-100 text-blue-700 border border-blue-200',
  DEV: 'bg-purple-100 text-purple-700 border border-purple-200',
  ADMIN: 'bg-red-100 text-[#E3000F] border border-red-200',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  info: 'bg-slate-100 text-slate-600',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-[#E3000F] font-bold',
};

const SEVERITY_DISPLAY: Record<Severity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const PAGE_SIZE = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

function getDefaultFromDate(): string {
  const d = new Date('2026-03-26T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  return isoToDateInput(d.toISOString());
}

function getDefaultToDate(): string {
  return '2026-03-26';
}

function escapeCsvValue(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function generateCsv(events: AuditEvent[]): string {
  const headers = [
    'ID', 'Timestamp', 'Actor', 'Role', 'Action Type',
    'Entity Type', 'Entity ID', 'Entity Name', 'Description', 'Severity',
  ];
  const rows = events.map(e => [
    e.id,
    e.timestamp,
    e.actor,
    e.actorRole,
    e.actionType,
    e.entityType,
    e.entityId,
    e.entityName,
    e.description,
    e.severity,
  ].map(String).map(escapeCsvValue).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Diff Viewer ──────────────────────────────────────────────────────────────

function DiffViewer({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  if (!before && !after) {
    return <p className="text-slate-400 text-sm italic">No additional details available.</p>;
  }

  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]));

  const changedKeys = before
    ? allKeys.filter(k => JSON.stringify((before ?? {})[k]) !== JSON.stringify((after ?? {})[k]))
    : allKeys;

  if (changedKeys.length === 0) {
    return <p className="text-slate-400 text-sm italic">No field-level changes recorded.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Before</p>
        {before ? (
          <div className="flex flex-col gap-1.5">
            {changedKeys.map(key => (
              <div key={key} className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium">{key}</span>
                <span className="text-sm line-through text-red-500 font-mono">
                  {JSON.stringify(before[key])}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Not applicable (creation event)</p>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">After</p>
        {after ? (
          <div className="flex flex-col gap-1.5">
            {changedKeys.map(key => (
              <div key={key} className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium">{key}</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {JSON.stringify((after)[key])}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Not applicable (deletion event)</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditTrail({ auditEvents }: AuditTrailProps) {
  const defaultFrom = getDefaultFromDate();
  const defaultTo = getDefaultToDate();

  // Filter state
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [actorQuery, setActorQuery] = useState('');
  const [filterActionType, setFilterActionType] = useState<'all' | AuditActionType>('all');
  const [filterEntityType, setFilterEntityType] = useState<'all' | EntityType>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | Severity>('all');
  const [batchIdFilter, setBatchIdFilter] = useState<string | null>(null);

  // Expanded row state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);

  const isFilterActive =
    fromDate !== defaultFrom ||
    toDate !== defaultTo ||
    actorQuery !== '' ||
    filterActionType !== 'all' ||
    filterEntityType !== 'all' ||
    filterSeverity !== 'all';

  const filteredEvents = useMemo(() => {
    const q = actorQuery.toLowerCase();
    return auditEvents
      .filter(e => {
        // Batch filter: if active, only show events in the same batch or the batch parent
        if (batchIdFilter && e.batchId !== batchIdFilter && e.id !== batchIdFilter) return false;

        const eDate = e.timestamp.slice(0, 10);
        if (fromDate && eDate < fromDate) return false;
        if (toDate && eDate > toDate) return false;
        if (actorQuery && !e.actor.toLowerCase().includes(q) &&
          !e.entityName.toLowerCase().includes(q) &&
          !e.description.toLowerCase().includes(q) &&
          !(e.batchItems?.some(item => item.toLowerCase().includes(q)))) return false;
        if (filterActionType !== 'all' && e.actionType !== filterActionType) return false;
        if (filterEntityType !== 'all' && e.entityType !== filterEntityType) return false;
        if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [auditEvents, fromDate, toDate, actorQuery, filterActionType, filterEntityType, filterSeverity, batchIdFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEvents = filteredEvents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleClearFilters = () => {
    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setActorQuery('');
    setFilterActionType('all');
    setFilterEntityType('all');
    setFilterSeverity('all');
    setPage(1);
  };

  const handleFilterChange = (setter: () => void) => {
    setter();
    setPage(1);
    setExpandedId(null);
  };

  const handleExportCsv = () => {
    const csv = generateCsv(filteredEvents);
    const today = new Date('2026-03-26').toISOString().slice(0, 10);
    downloadCsv(csv, `audit-trail-${today}.csv`);
  };

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#E3000F] shrink-0">
              <ClipboardList size={22} />
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Audit Trail</h2>
          </div>
          <p className="text-slate-500 text-lg mt-1">
            Complete change history for compliance and regulatory review.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-bold text-slate-700 hover:bg-red-50 hover:text-[#E3000F] hover:border-[#E3000F] transition-all shadow-sm shrink-0"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Filter by:</span>
          {isFilterActive && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 text-sm font-bold text-[#E3000F] hover:text-red-700 transition-all"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => handleFilterChange(() => setFromDate(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => handleFilterChange(() => setToDate(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
            />
          </div>

          {/* Actor / keyword search */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Actor, entity, description…"
                value={actorQuery}
                onChange={e => handleFilterChange(() => setActorQuery(e.target.value))}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] w-56"
              />
            </div>
          </div>

          {/* Action Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Action Type</label>
            <select
              value={filterActionType}
              onChange={e => handleFilterChange(() => setFilterActionType(e.target.value as 'all' | AuditActionType))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
            >
              <option value="all">All Actions</option>
              <optgroup label="Intent">
                <option value="intent.create">Intent Created</option>
                <option value="intent.edit">Intent Edited</option>
                <option value="intent.delete">Intent Deleted</option>
                <option value="intent.toggle_status">Intent Status Toggled</option>
                <option value="intent.promote">Intent Promoted</option>
                <option value="intent.rollback">Intent Rolled Back</option>
              </optgroup>
              <optgroup label="Agent">
                <option value="agent.config_change">Agent Config Changed</option>
                <option value="agent.status_change">Agent Status Changed</option>
                <option value="agent.kill_switch">Agent Kill Switch</option>
              </optgroup>
              <optgroup label="Template">
                <option value="template.publish">Template Published</option>
                <option value="template.restore">Template Restored</option>
              </optgroup>
              <optgroup label="Guardrail">
                <option value="guardrail.policy_change">Guardrail Policy Changed</option>
              </optgroup>
              <optgroup label="System">
                <option value="system.kill_switch_activate">Kill Switch Activated</option>
                <option value="system.kill_switch_deactivate">Kill Switch Deactivated</option>
              </optgroup>
              <optgroup label="Approval">
                <option value="approval.submit">Approval Submitted</option>
                <option value="approval.approve">Approval Granted</option>
                <option value="approval.reject">Approval Rejected</option>
              </optgroup>
            </select>
          </div>

          {/* Entity Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entity Type</label>
            <select
              value={filterEntityType}
              onChange={e => handleFilterChange(() => setFilterEntityType(e.target.value as 'all' | EntityType))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
            >
              <option value="all">All Entities</option>
              <option value="intent">Intent</option>
              <option value="agent">Agent</option>
              <option value="template">Template</option>
              <option value="guardrail">Guardrail</option>
              <option value="system">System</option>
              <option value="approval">Approval</option>
            </select>
          </div>

          {/* Severity */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Severity</label>
            <select
              value={filterSeverity}
              onChange={e => handleFilterChange(() => setFilterSeverity(e.target.value as 'all' | Severity))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch filter chip */}
      {batchIdFilter && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 self-start">
          <span>Filtering by batch</span>
          <button onClick={() => setBatchIdFilter(null)} className="text-indigo-400 hover:text-indigo-600">✕</button>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-slate-500">
          Showing <span className="font-bold text-slate-700">{filteredEvents.length}</span> of{' '}
          <span className="font-bold text-slate-700">{auditEvents.length}</span> events
        </span>
        {totalPages > 1 && (
          <span className="text-sm text-slate-400">
            Page {safePage} of {totalPages}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ClipboardList size={48} className="text-slate-200" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-400">No audit events match your filters</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your date range or clearing filters</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Actor</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Entity</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Description</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Severity</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {pageEvents.map((event, index) => {
                const isExpanded = expandedId === event.id;
                const category = getActionCategory(event.actionType);
                const isCritical = event.severity === 'critical';

                return (
                  <React.Fragment key={event.id}>
                    <motion.tr
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      className={cn(
                        'border-b border-slate-100 hover:bg-slate-50/60 transition-all group',
                        isCritical && 'bg-red-50/40',
                      )}
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-slate-600">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                            {event.actor}
                          </span>
                          <span className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded-md self-start',
                            ROLE_BADGE[event.actorRole]
                          )}>
                            {event.actorRole}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-4">
                        <div className={cn(
                          'pl-3 py-0.5',
                          CATEGORY_BORDER[category] ?? 'border-l-4 border-l-slate-300',
                        )}>
                          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                            {ACTION_DISPLAY_NAMES[event.actionType] ?? event.actionType}
                          </span>
                        </div>
                      </td>

                      {/* Entity */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-slate-800 max-w-[180px] truncate" title={event.entityName}>
                            {event.entityName}
                          </span>
                          <span className="text-xs text-slate-400 capitalize">{event.entityType}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-4 max-w-[260px]">
                        <p className="text-sm text-slate-600 leading-snug line-clamp-2" title={event.description}>
                          {event.description}
                        </p>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          'inline-block text-xs font-bold px-2.5 py-1 rounded-full',
                          SEVERITY_BADGE[event.severity],
                        )}>
                          {SEVERITY_DISPLAY[event.severity]}
                        </span>
                      </td>

                      {/* Details toggle */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          className={cn(
                            'p-1.5 rounded-lg transition-all',
                            isExpanded
                              ? 'bg-slate-100 text-slate-700 rotate-90'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
                          )}
                          title="View diff details"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </motion.tr>

                    {/* Inline diff expansion */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className={cn(
                                'mx-4 my-3 p-4 rounded-xl border border-slate-200 bg-slate-50',
                              )}>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                  Change Details — {event.entityName}
                                </p>
                                <DiffViewer before={event.before} after={event.after} />

                                {/* Batch items */}
                                {event.batchItems && event.batchItems.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Batch includes</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {event.batchItems.map(item => (
                                        <span key={item} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg">
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Batch filter link */}
                                {event.batchId && (
                                  <div className="mt-2">
                                    <button
                                      onClick={() => setBatchIdFilter(event.batchId ?? null)}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                                    >
                                      View all events in this batch
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-600">
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
