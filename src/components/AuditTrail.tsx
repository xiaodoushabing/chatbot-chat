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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Types ───────────────────────────────────────────────────────────────────

type AuditActionType =
  | 'intent.create' | 'intent.edit' | 'intent.delete' | 'intent.approve'
  | 'intent.promote' | 'intent.rollback'
  | 'agent.config_change' | 'agent.status_change'
  | 'template.create' | 'template.edit' | 'template.publish' | 'template.restore'
  | 'document.add' | 'document.remove' | 'document.update'
  | 'guardrail.policy_change'
  | 'system.kill_switch_activate' | 'system.kill_switch_deactivate'
  | 'approval.submit' | 'approval.approve' | 'approval.reject' | 'approval.expire'
  | 'auth.login' | 'auth.logout';

type EntityType = 'intent' | 'agent' | 'template' | 'document' | 'guardrail' | 'system' | 'auth';
type ActorRole = 'BA' | 'DEV' | 'ADMIN';
type Severity = 'info' | 'warning' | 'critical';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: ActorRole;
  actionType: AuditActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  useCase: string;
  severity: Severity;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_EVENTS: AuditEvent[] = [
  {
    id: 'evt-001',
    timestamp: '2026-03-26T08:14:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'system.kill_switch_activate',
    entityType: 'system',
    entityId: 'global-kill-switch',
    entityName: 'Global Kill Switch',
    description: 'Kill switch activated globally — all GenAI paths bypassed. Triggered after anomalous guardrail hit spike.',
    before: { active: false, activatedBy: null },
    after: { active: true, activatedBy: 'Admin', reason: 'Guardrail spike investigation' },
    useCase: 'retirement-planning',
    severity: 'critical',
  },
  {
    id: 'evt-002',
    timestamp: '2026-03-26T09:47:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'system.kill_switch_deactivate',
    entityType: 'system',
    entityId: 'global-kill-switch',
    entityName: 'Global Kill Switch',
    description: 'Kill switch deactivated — normal GenAI routing resumed after investigation cleared.',
    before: { active: true, activatedBy: 'Admin' },
    after: { active: false, activatedBy: null },
    useCase: 'retirement-planning',
    severity: 'critical',
  },
  {
    id: 'evt-003',
    timestamp: '2026-03-25T14:22:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'guardrail.policy_change',
    entityType: 'guardrail',
    entityId: 'guardrail-policy-001',
    entityName: 'Retirement Advisory Guardrail',
    description: 'Injection sensitivity threshold raised from 0.7 to 0.85. Blocked topics list updated to include "cryptocurrency".',
    before: { injectionSensitivity: 0.7, blockedTopics: ['gambling', 'illegal_activity'], deniedWords: ['guarantee', 'promise'] },
    after: { injectionSensitivity: 0.85, blockedTopics: ['gambling', 'illegal_activity', 'cryptocurrency'], deniedWords: ['guarantee', 'promise'] },
    useCase: 'retirement-planning',
    severity: 'critical',
  },
  {
    id: 'evt-004',
    timestamp: '2026-03-25T11:05:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.approve',
    entityType: 'intent',
    entityId: 'intent-CPF-001',
    entityName: 'CPF_Retirement_Advisory',
    description: 'Maker-checker approval granted for CPF_Retirement_Advisory staging-to-production promotion.',
    before: { approvalStatus: 'pending', checkerDecision: null },
    after: { approvalStatus: 'approved', checkerDecision: 'Sarah Chen', decidedAt: '2026-03-25T11:05:00Z' },
    useCase: 'retirement-planning',
    severity: 'warning',
  },
  {
    id: 'evt-005',
    timestamp: '2026-03-25T10:30:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'intent.promote',
    entityType: 'intent',
    entityId: 'intent-CPF-001',
    entityName: 'CPF_Retirement_Advisory',
    description: 'Intent promoted from staging to production environment. S3 snapshot taken before promotion.',
    before: { environment: 'staging', snapshotId: null },
    after: { environment: 'production', snapshotId: 'snap-CPF-001-v3', promotedAt: '2026-03-25T10:30:00Z' },
    useCase: 'retirement-planning',
    severity: 'warning',
  },
  {
    id: 'evt-006',
    timestamp: '2026-03-24T16:55:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.reject',
    entityType: 'intent',
    entityId: 'intent-INVEST-007',
    entityName: 'Investment_Product_Inquiry',
    description: 'Maker-checker approval rejected. Response text contained unverified performance claim. Sent back to BA for revision.',
    before: { approvalStatus: 'pending', checkerDecision: null },
    after: { approvalStatus: 'rejected', checkerDecision: 'Sarah Chen', rejectReason: 'Unverified performance claim in response' },
    useCase: 'account-services',
    severity: 'critical',
  },
  {
    id: 'evt-007',
    timestamp: '2026-03-24T15:10:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'intent.rollback',
    entityType: 'intent',
    entityId: 'intent-INTL-006',
    entityName: 'International_Transfer',
    description: 'Intent rolled back to snapshot snap-INTL-006-v4 after production regression detected in GenAI response quality.',
    before: { responseVersion: 'v5', snapshotId: 'snap-INTL-006-v5' },
    after: { responseVersion: 'v4', snapshotId: 'snap-INTL-006-v4', rolledBackAt: '2026-03-24T15:10:00Z' },
    useCase: 'account-services',
    severity: 'warning',
  },
  {
    id: 'evt-008',
    timestamp: '2026-03-24T13:30:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'agent.config_change',
    entityType: 'agent',
    entityId: 'agent-retirement-001',
    entityName: 'Retirement Planning Agent',
    description: 'Model temperature lowered from 0.8 to 0.4 to reduce response variability. Max tokens increased to 1024.',
    before: { modelId: 'anthropic.claude-3-5-sonnet', temperature: 0.8, maxTokens: 512 },
    after: { modelId: 'anthropic.claude-3-5-sonnet', temperature: 0.4, maxTokens: 1024 },
    useCase: 'retirement-planning',
    severity: 'warning',
  },
  {
    id: 'evt-009',
    timestamp: '2026-03-24T10:05:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'intent.create',
    entityType: 'intent',
    entityId: 'intent-SRS-009',
    entityName: 'SRS_Tax_Relief_Query',
    description: 'New intent created in staging: SRS tax relief calculator query. 5 utterances added, GenAI response mode assigned.',
    after: { name: 'SRS_Tax_Relief_Query', environment: 'staging', responseMode: 'genai', riskLevel: 'low', utteranceCount: 5 },
    useCase: 'retirement-planning',
    severity: 'info',
  },
  {
    id: 'evt-010',
    timestamp: '2026-03-23T17:45:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'template.publish',
    entityType: 'template',
    entityId: 'tmpl-card-replace-001',
    entityName: 'Card Replacement Template v3',
    description: 'Template published and linked to Card_Replacement intent. Version 3 supersedes previous template.',
    before: { status: 'draft', linkedIntents: ['intent-CARD-005'] },
    after: { status: 'published', linkedIntents: ['intent-CARD-005'], publishedAt: '2026-03-23T17:45:00Z' },
    useCase: 'account-services',
    severity: 'info',
  },
  {
    id: 'evt-011',
    timestamp: '2026-03-23T14:20:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'intent.edit',
    entityType: 'intent',
    entityId: 'intent-360-001',
    entityName: 'OCBC_360_Salary_Credit',
    description: 'Updated utterances: added 2 new phrasings for salary GIRO setup. Removed 1 outdated utterance.',
    before: { utteranceCount: 3, updatedAt: '2026-03-20T09:15:00Z' },
    after: { utteranceCount: 4, updatedAt: '2026-03-23T14:20:00Z' },
    useCase: 'account-services',
    severity: 'info',
  },
  {
    id: 'evt-012',
    timestamp: '2026-03-23T11:00:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'document.add',
    entityType: 'document',
    entityId: 'doc-MAS-CPF-2026',
    entityName: 'MAS CPF Guidelines 2026.pdf',
    description: 'New regulatory document uploaded and queued for indexing. Domain tagged: retirement-planning, cpf.',
    after: { filename: 'MAS CPF Guidelines 2026.pdf', indexedStatus: 'pending', domains: ['retirement-planning', 'cpf'] },
    useCase: 'retirement-planning',
    severity: 'info',
  },
  {
    id: 'evt-013',
    timestamp: '2026-03-22T16:30:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.submit',
    entityType: 'intent',
    entityId: 'intent-INTL-006',
    entityName: 'International_Transfer',
    description: 'Submitted International_Transfer intent edits for maker-checker approval prior to production push.',
    after: { approvalStatus: 'pending', submittedBy: 'Sarah Chen', submittedAt: '2026-03-22T16:30:00Z' },
    useCase: 'account-services',
    severity: 'warning',
  },
  {
    id: 'evt-014',
    timestamp: '2026-03-22T09:15:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'auth.login',
    entityType: 'auth',
    entityId: 'user-admin-001',
    entityName: 'Admin',
    description: 'Admin user logged in from 10.0.1.45 (Singapore region).',
    useCase: 'account-services',
    severity: 'info',
  },
  {
    id: 'evt-015',
    timestamp: '2026-03-22T08:50:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'auth.login',
    entityType: 'auth',
    entityId: 'user-sarah-001',
    entityName: 'Sarah Chen',
    description: 'BA user Sarah Chen logged in from 10.0.1.23 (Singapore region).',
    useCase: 'retirement-planning',
    severity: 'info',
  },
  {
    id: 'evt-016',
    timestamp: '2026-03-21T17:00:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'auth.logout',
    entityType: 'auth',
    entityId: 'user-james-001',
    entityName: 'James Lim',
    description: 'DEV user James Lim logged out after session of 7h 23m.',
    useCase: 'retirement-planning',
    severity: 'info',
  },
  {
    id: 'evt-017',
    timestamp: '2026-03-21T14:40:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'intent.promote',
    entityType: 'intent',
    entityId: 'intent-LIFE-003',
    entityName: 'OCBC_Life_Goals_Retirement',
    description: 'Intent promoted from staging to production. Version 5 snapshot created prior to promotion.',
    before: { environment: 'staging', version: 4 },
    after: { environment: 'production', version: 5, snapshotId: 'snap-LIFE-003-v5' },
    useCase: 'retirement-planning',
    severity: 'warning',
  },
  {
    id: 'evt-018',
    timestamp: '2026-03-21T11:20:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'document.update',
    entityType: 'document',
    entityId: 'doc-OCBC-360-FAQ',
    entityName: 'OCBC 360 Account FAQ v2.pdf',
    description: 'Document updated with revised interest rate information. Re-indexing triggered automatically.',
    before: { version: 1, indexedStatus: 'indexed', updatedAt: '2026-02-15T10:00:00Z' },
    after: { version: 2, indexedStatus: 'pending', updatedAt: '2026-03-21T11:20:00Z' },
    useCase: 'account-services',
    severity: 'info',
  },
  {
    id: 'evt-019',
    timestamp: '2026-03-20T15:55:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'system.kill_switch_activate',
    entityType: 'system',
    entityId: 'global-kill-switch',
    entityName: 'Global Kill Switch',
    description: 'Kill switch activated for emergency maintenance window — Bedrock API degraded. All requests served via templates.',
    before: { active: false },
    after: { active: true, reason: 'Bedrock API degraded — emergency maintenance', activatedBy: 'Admin' },
    useCase: 'retirement-planning',
    severity: 'critical',
  },
  {
    id: 'evt-020',
    timestamp: '2026-03-20T10:12:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'intent.edit',
    entityType: 'intent',
    entityId: 'intent-HOME-002',
    entityName: 'Home_Loan_Repayment_Impact',
    description: 'Risk level changed from low to high following compliance review. Response mode unchanged (GenAI).',
    before: { riskLevel: 'low', updatedAt: '2026-03-10T09:00:00Z' },
    after: { riskLevel: 'high', updatedAt: '2026-03-20T10:12:00Z' },
    useCase: 'account-services',
    severity: 'info',
  },
  {
    id: 'evt-021',
    timestamp: '2026-03-20T08:30:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'template.create',
    entityType: 'template',
    entityId: 'tmpl-home-loan-002',
    entityName: 'Home Loan Impact Disclaimer Template',
    description: 'New template created with MAS-compliant disclaimer language for home loan repayment impact responses.',
    after: { name: 'Home Loan Impact Disclaimer Template', status: 'draft', variables: ['customer_name', 'loan_amount'] },
    useCase: 'account-services',
    severity: 'info',
  },
  {
    id: 'evt-022',
    timestamp: '2026-03-19T16:10:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.approve',
    entityType: 'intent',
    entityId: 'intent-LIFE-003',
    entityName: 'OCBC_Life_Goals_Retirement',
    description: 'Approved OCBC_Life_Goals_Retirement intent edit. Response accuracy verified against MAS guidelines.',
    before: { approvalStatus: 'pending' },
    after: { approvalStatus: 'approved', decidedAt: '2026-03-19T16:10:00Z' },
    useCase: 'retirement-planning',
    severity: 'warning',
  },
  {
    id: 'evt-023',
    timestamp: '2026-03-19T14:00:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'agent.status_change',
    entityType: 'agent',
    entityId: 'agent-account-002',
    entityName: 'Account Services Agent',
    description: 'Agent status changed from inactive to active after successful integration test.',
    before: { status: 'inactive' },
    after: { status: 'active', activatedAt: '2026-03-19T14:00:00Z' },
    useCase: 'account-services',
    severity: 'warning',
  },
  {
    id: 'evt-024',
    timestamp: '2026-03-19T09:45:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'intent.delete',
    entityType: 'intent',
    entityId: 'intent-DEPR-010',
    entityName: 'Fixed_Deposit_Rates_Legacy',
    description: 'Deprecated intent deleted. Intent had been inactive for 90+ days with zero queries in last 30 days.',
    before: { status: 'inactive', queries30d: 0, createdAt: '2024-06-01T00:00:00Z' },
    useCase: 'account-services',
    severity: 'info',
  },
  {
    id: 'evt-025',
    timestamp: '2026-03-20T17:30:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'system.kill_switch_deactivate',
    entityType: 'system',
    entityId: 'global-kill-switch',
    entityName: 'Global Kill Switch',
    description: 'Kill switch deactivated after Bedrock service restored. Normal routing resumed. Total downtime: 7h 18m.',
    before: { active: true, activatedBy: 'Admin', reason: 'Bedrock API degraded' },
    after: { active: false, deactivatedAt: '2026-03-20T17:30:00Z' },
    useCase: 'retirement-planning',
    severity: 'critical',
  },
  {
    id: 'evt-026',
    timestamp: '2026-03-22T15:00:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'intent.rollback',
    entityType: 'intent',
    entityId: 'intent-360-001',
    entityName: 'OCBC_360_Salary_Credit',
    description: 'Intent rolled back to v2 snapshot after user complaints about changed response tone.',
    before: { version: 3, snapshotId: 'snap-360-001-v3' },
    after: { version: 2, snapshotId: 'snap-360-001-v2', rolledBackAt: '2026-03-22T15:00:00Z' },
    useCase: 'account-services',
    severity: 'warning',
  },
  {
    id: 'evt-027',
    timestamp: '2026-03-23T10:20:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'document.remove',
    entityType: 'document',
    entityId: 'doc-OCBC-2024-rates',
    entityName: 'OCBC Interest Rates 2024.pdf',
    description: 'Outdated interest rate document soft-deleted. De-index event emitted to remove from OpenSearch.',
    before: { indexedStatus: 'indexed', active: true },
    after: { indexedStatus: 'inactive', active: false, removedAt: '2026-03-23T10:20:00Z' },
    useCase: 'account-services',
    severity: 'info',
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTION_DISPLAY_NAMES: Record<AuditActionType, string> = {
  'intent.create': 'Intent Created',
  'intent.edit': 'Intent Edited',
  'intent.delete': 'Intent Deleted',
  'intent.approve': 'Intent Approved',
  'intent.promote': 'Intent Promoted',
  'intent.rollback': 'Intent Rolled Back',
  'agent.config_change': 'Agent Config Changed',
  'agent.status_change': 'Agent Status Changed',
  'template.create': 'Template Created',
  'template.edit': 'Template Edited',
  'template.publish': 'Template Published',
  'template.restore': 'Template Restored',
  'document.add': 'Document Added',
  'document.remove': 'Document Removed',
  'document.update': 'Document Updated',
  'guardrail.policy_change': 'Guardrail Policy Changed',
  'system.kill_switch_activate': 'Kill Switch Activated',
  'system.kill_switch_deactivate': 'Kill Switch Deactivated',
  'approval.submit': 'Approval Submitted',
  'approval.approve': 'Approval Granted',
  'approval.reject': 'Approval Rejected',
  'approval.expire': 'Approval Expired',
  'auth.login': 'User Login',
  'auth.logout': 'User Logout',
};

type ActionCategory = 'intent' | 'agent' | 'template' | 'document' | 'guardrail' | 'system' | 'approval' | 'auth';

function getActionCategory(actionType: AuditActionType): ActionCategory {
  const prefix = actionType.split('.')[0] as ActionCategory;
  return prefix;
}

const CATEGORY_BORDER: Record<ActionCategory, string> = {
  intent: 'border-l-4 border-l-emerald-500',
  agent: 'border-l-4 border-l-purple-500',
  template: 'border-l-4 border-l-amber-500',
  document: 'border-l-4 border-l-sky-500',
  guardrail: 'border-l-4 border-l-orange-500',
  system: 'border-l-4 border-l-[#E3000F]',
  approval: 'border-l-4 border-l-indigo-500',
  auth: 'border-l-4 border-l-slate-400',
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
    'Entity Type', 'Entity ID', 'Entity Name', 'Description', 'Severity', 'Use Case',
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
    e.useCase,
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

export default function AuditTrail() {
  const defaultFrom = getDefaultFromDate();
  const defaultTo = getDefaultToDate();

  // Filter state
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [actorQuery, setActorQuery] = useState('');
  const [filterActionType, setFilterActionType] = useState<'all' | AuditActionType>('all');
  const [filterEntityType, setFilterEntityType] = useState<'all' | EntityType>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | Severity>('all');

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
    return MOCK_EVENTS
      .filter(e => {
        const eDate = e.timestamp.slice(0, 10);
        if (fromDate && eDate < fromDate) return false;
        if (toDate && eDate > toDate) return false;
        if (actorQuery && !e.actor.toLowerCase().includes(actorQuery.toLowerCase())) return false;
        if (filterActionType !== 'all' && e.actionType !== filterActionType) return false;
        if (filterEntityType !== 'all' && e.entityType !== filterEntityType) return false;
        if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [fromDate, toDate, actorQuery, filterActionType, filterEntityType, filterSeverity]);

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

          {/* Actor search */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Actor</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search actor…"
                value={actorQuery}
                onChange={e => handleFilterChange(() => setActorQuery(e.target.value))}
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] w-44"
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
                <option value="intent.approve">Intent Approved</option>
                <option value="intent.promote">Intent Promoted</option>
                <option value="intent.rollback">Intent Rolled Back</option>
              </optgroup>
              <optgroup label="Agent">
                <option value="agent.config_change">Agent Config Changed</option>
                <option value="agent.status_change">Agent Status Changed</option>
              </optgroup>
              <optgroup label="Template">
                <option value="template.create">Template Created</option>
                <option value="template.edit">Template Edited</option>
                <option value="template.publish">Template Published</option>
                <option value="template.restore">Template Restored</option>
              </optgroup>
              <optgroup label="Document">
                <option value="document.add">Document Added</option>
                <option value="document.remove">Document Removed</option>
                <option value="document.update">Document Updated</option>
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
                <option value="approval.expire">Approval Expired</option>
              </optgroup>
              <optgroup label="Auth">
                <option value="auth.login">User Login</option>
                <option value="auth.logout">User Logout</option>
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
              <option value="document">Document</option>
              <option value="guardrail">Guardrail</option>
              <option value="system">System</option>
              <option value="auth">Auth</option>
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

      {/* Summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-slate-500">
          Showing <span className="font-bold text-slate-700">{filteredEvents.length}</span> of{' '}
          <span className="font-bold text-slate-700">{MOCK_EVENTS.length}</span> events
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
                          CATEGORY_BORDER[category],
                        )}>
                          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                            {ACTION_DISPLAY_NAMES[event.actionType]}
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
