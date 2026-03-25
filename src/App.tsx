import React, { useState } from 'react';
import {
  Zap,
  MessageSquare,
  Settings,
  Menu,
  X,
  ChevronRight,
  Bot,
  ShieldCheck,
  LogOut,
  Bell,
  User,
  Activity,
  Users2,
  ClipboardList,
  ShieldAlert,
  Power,
  CheckSquare,
  Library,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import IntentDiscovery from './components/IntentDiscovery';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import ChatbotPreview from './components/ChatbotPreview';
import ActiveIntents from './components/ActiveIntents';
import ActiveAgents from './components/ActiveAgents';
import AuditTrail from './components/AuditTrail';
import GuardrailsConfig from './components/GuardrailsConfig';
import AdminControlInterface from './components/AdminControlInterface';
import ContentLibrary from './components/ContentLibrary';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ocbcLogo from './assets/Logo-ocbc.png';
import { PendingApproval, AuditEvent, AuditActionType } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'discovery' | 'dashboard' | 'preview' | 'active-intents' | 'active-agents' | 'audit-trail' | 'guardrails' | 'change-control' | 'content-library';

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_APPROVALS: PendingApproval[] = [
  {
    id: 'approval-001',
    actionType: 'intent.promote_batch',
    entityName: 'Intent Promotion Batch',
    entityId: 'sync-001',
    description: 'Promote 2 intents to Production',
    detail: 'Intents approved in staging: CPF Withdrawal Planning, SRS Account Enquiry. Submitted after staging review on 2026-03-25.',
    submittedBy: 'Sarah Chen (BA)',
    submittedAt: '2026-03-25T14:32:00.000Z',
    status: 'pending',
    batchItems: ['CPF Withdrawal Planning', 'SRS Account Enquiry'],
  },
  {
    id: 'approval-002',
    actionType: 'guardrail.policy_change',
    entityName: 'Guardrail Policy',
    entityId: 'guardrail-config',
    description: 'Blocked topics list updated',
    detail: 'Added "cryptocurrency investments" to blocked topics. Triggered by new compliance directive MAS-2026-03.',
    submittedBy: 'James Lim (DEV)',
    submittedAt: '2026-03-26T09:15:00.000Z',
    status: 'pending',
  },
  {
    id: 'approval-003',
    actionType: 'agent.config_change',
    entityName: 'Retirement_Planner_Agent',
    entityId: 'agent-retirement',
    description: 'System prompt updated',
    detail: 'Updated system prompt to include new CPF LIFE scheme details effective April 2026. Model temperature unchanged.',
    submittedBy: 'James Lim (DEV)',
    submittedAt: '2026-03-26T10:45:00.000Z',
    status: 'pending',
  },
];

const SEED_AUDIT_EVENTS: AuditEvent[] = [
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
    severity: 'critical',
  },
  {
    id: 'evt-004',
    timestamp: '2026-03-25T11:05:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.approve',
    entityType: 'approval',
    entityId: 'intent-CPF-001',
    entityName: 'CPF_Retirement_Advisory',
    description: 'Maker-checker approval granted for CPF_Retirement_Advisory staging-to-production promotion.',
    before: { approvalStatus: 'pending', checkerDecision: null },
    after: { approvalStatus: 'approved', checkerDecision: 'Sarah Chen', decidedAt: '2026-03-25T11:05:00Z' },
    severity: 'warning',
    batchItems: ['CPF_Retirement_Advisory'],
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
    severity: 'warning',
    batchId: 'evt-004',
  },
  {
    id: 'evt-006',
    timestamp: '2026-03-24T16:55:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.reject',
    entityType: 'approval',
    entityId: 'intent-INVEST-007',
    entityName: 'Investment_Product_Inquiry',
    description: 'Maker-checker approval rejected. Response text contained unverified performance claim. Sent back to BA for revision.',
    before: { approvalStatus: 'pending', checkerDecision: null },
    after: { approvalStatus: 'rejected', checkerDecision: 'Sarah Chen', rejectReason: 'Unverified performance claim in response' },
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
    severity: 'info',
  },
  {
    id: 'evt-012',
    timestamp: '2026-03-23T11:00:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'approval.submit',
    entityType: 'approval',
    entityId: 'doc-MAS-CPF-2026',
    entityName: 'MAS CPF Guidelines 2026.pdf',
    description: 'New regulatory document uploaded and queued for indexing. Domain tagged: retirement-planning, cpf.',
    after: { filename: 'MAS CPF Guidelines 2026.pdf', indexedStatus: 'pending', domains: ['retirement-planning', 'cpf'] },
    severity: 'info',
  },
  {
    id: 'evt-013',
    timestamp: '2026-03-22T16:30:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.submit',
    entityType: 'approval',
    entityId: 'intent-INTL-006',
    entityName: 'International_Transfer',
    description: 'Submitted International_Transfer intent edits for maker-checker approval prior to production push.',
    after: { approvalStatus: 'pending', submittedBy: 'Sarah Chen', submittedAt: '2026-03-22T16:30:00Z' },
    severity: 'warning',
  },
  {
    id: 'evt-014',
    timestamp: '2026-03-22T09:15:00Z',
    actor: 'Admin',
    actorRole: 'ADMIN',
    actionType: 'system.kill_switch_activate',
    entityType: 'system',
    entityId: 'user-admin-001',
    entityName: 'Admin',
    description: 'Admin user logged in from 10.0.1.45 (Singapore region).',
    severity: 'info',
  },
  {
    id: 'evt-015',
    timestamp: '2026-03-22T08:50:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'system.kill_switch_activate',
    entityType: 'system',
    entityId: 'user-sarah-001',
    entityName: 'Sarah Chen',
    description: 'BA user Sarah Chen logged in from 10.0.1.23 (Singapore region).',
    severity: 'info',
  },
  {
    id: 'evt-016',
    timestamp: '2026-03-21T17:00:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'system.kill_switch_deactivate',
    entityType: 'system',
    entityId: 'user-james-001',
    entityName: 'James Lim',
    description: 'DEV user James Lim logged out after session of 7h 23m.',
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
    severity: 'warning',
  },
  {
    id: 'evt-018',
    timestamp: '2026-03-21T11:20:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'template.publish',
    entityType: 'template',
    entityId: 'doc-OCBC-360-FAQ',
    entityName: 'OCBC 360 Account FAQ v2.pdf',
    description: 'Document updated with revised interest rate information. Re-indexing triggered automatically.',
    before: { version: 1, indexedStatus: 'indexed', updatedAt: '2026-02-15T10:00:00Z' },
    after: { version: 2, indexedStatus: 'pending', updatedAt: '2026-03-21T11:20:00Z' },
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
    severity: 'info',
  },
  {
    id: 'evt-021',
    timestamp: '2026-03-20T08:30:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'template.publish',
    entityType: 'template',
    entityId: 'tmpl-home-loan-002',
    entityName: 'Home Loan Impact Disclaimer Template',
    description: 'New template created with MAS-compliant disclaimer language for home loan repayment impact responses.',
    after: { name: 'Home Loan Impact Disclaimer Template', status: 'draft', variables: ['customer_name', 'loan_amount'] },
    severity: 'info',
  },
  {
    id: 'evt-022',
    timestamp: '2026-03-19T16:10:00Z',
    actor: 'Sarah Chen',
    actorRole: 'BA',
    actionType: 'approval.approve',
    entityType: 'approval',
    entityId: 'intent-LIFE-003',
    entityName: 'OCBC_Life_Goals_Retirement',
    description: 'Approved OCBC_Life_Goals_Retirement intent edit. Response accuracy verified against MAS guidelines.',
    before: { approvalStatus: 'pending' },
    after: { approvalStatus: 'approved', decidedAt: '2026-03-19T16:10:00Z' },
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
    severity: 'warning',
  },
  {
    id: 'evt-027',
    timestamp: '2026-03-23T10:20:00Z',
    actor: 'James Lim',
    actorRole: 'DEV',
    actionType: 'template.restore',
    entityType: 'template',
    entityId: 'doc-OCBC-2024-rates',
    entityName: 'OCBC Interest Rates 2024.pdf',
    description: 'Outdated interest rate document soft-deleted. De-index event emitted to remove from OpenSearch.',
    before: { indexedStatus: 'indexed', active: true },
    after: { indexedStatus: 'inactive', active: false, removedAt: '2026-03-23T10:20:00Z' },
    severity: 'info',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('active-intents');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [autoOpenCreate, setAutoOpenCreate] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(SEED_APPROVALS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(SEED_AUDIT_EVENTS);

  const addApproval = (a: Omit<PendingApproval, 'id' | 'submittedAt' | 'status'>) => {
    setPendingApprovals(prev => [{
      ...a,
      id: String(Date.now()),
      submittedAt: new Date().toISOString(),
      status: 'pending' as const
    }, ...prev]);
  };

  const addAuditEvent = (e: Omit<AuditEvent, 'id' | 'timestamp'>) => {
    setAuditEvents(prev => [{
      ...e,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString()
    }, ...prev]);
  };

  const processApproval = (id: string, decision: 'approved' | 'rejected', note?: string) => {
    setPendingApprovals(prev => {
      const approval = prev.find(a => a.id === id);
      if (!approval) return prev;

      addAuditEvent({
        actor: 'System Admin',
        actorRole: 'ADMIN',
        actionType: `approval.${decision}` as AuditActionType,
        entityType: 'approval',
        entityId: id,
        entityName: approval.entityName,
        description: `${decision === 'approved' ? 'Approved' : 'Rejected'}: ${approval.description}`,
        severity: 'info',
        batchItems: approval.batchItems
      });

      if (decision === 'approved' && approval.batchItems?.length) {
        approval.batchItems.forEach((itemName, i) => {
          setTimeout(() => {
            addAuditEvent({
              actor: 'System Admin',
              actorRole: 'ADMIN',
              actionType: 'intent.promote' as AuditActionType,
              entityType: 'intent',
              entityId: `intent-${itemName.toLowerCase().replace(/\s+/g, '-')}`,
              entityName: itemName,
              description: 'Promoted to Production (batch approval)',
              severity: 'info',
              batchId: id,
              batchItems: approval.batchItems
            });
          }, i * 10);
        });
      }

      return prev.map(a => a.id === id ? { ...a, status: decision, actionReviewNote: note } : a);
    });
  };

  const navItems = [
    { id: 'active-intents', label: 'Active Topics', icon: <MessageSquare size={22} />, description: 'Manage Live Database' },
    { id: 'discovery', label: 'Intent Discovery', icon: <Zap size={22} />, description: 'Automated Knowledge Sync' },
    { id: 'dashboard', label: 'Observability', icon: <Activity size={22} />, description: 'Intelligence & Monitoring' },
    { id: 'preview', label: 'Chatbot Preview', icon: <Bot size={22} />, description: 'Next-Gen Experience' },
    { id: 'active-agents', label: 'Active Agents', icon: <Users2 size={22} />, description: 'Manage AI Agents' },
    { id: 'content-library', label: 'Content Library', icon: <Library size={22} />, description: 'Templates & Documents' },
    { id: 'guardrails', label: 'Guardrails', icon: <ShieldAlert size={22} />, description: 'Policy & Provider Config' },
    { id: 'audit-trail', label: 'Audit Trail', icon: <ClipboardList size={22} />, description: 'Compliance & Change History' },
    { id: 'change-control', label: 'Change Control', icon: <CheckSquare size={22} />, description: 'Kill Switch & Approvals' },
  ];

  const handleDeploySuccess = () => {
    setActiveTab('active-intents');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans selection:bg-red-100 selection:text-red-900">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col shadow-xl lg:shadow-none",
          isSidebarOpen ? "w-72" : "w-20"
        )}
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center px-4 border-b border-slate-100 shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <img
                src={ocbcLogo}
                alt="OCBC Logo"
                className="h-8 object-contain"
              />
              <div className="flex flex-col border-l-2 border-slate-200 pl-3 whitespace-nowrap">
                <span className="font-black text-lg tracking-tight leading-none text-slate-900">AI Admin</span>
                <span className="text-xs font-bold text-[#E3000F] uppercase tracking-widest mt-1">Suite</span>
              </div>
            </div>
          ) : (
            <div className="w-14 h-14 bg-[#E3000F] rounded-xl flex items-center justify-center text-white font-black text-[0.6rem] shadow-lg shadow-red-200 shrink-0 mx-auto tracking-wide">
              OCBC
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "group flex items-center gap-3 p-2.5 rounded-xl transition-all relative",
                activeTab === item.id
                  ? "bg-red-50 text-[#E3000F]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "shrink-0 transition-transform group-hover:scale-110",
                activeTab === item.id ? "text-[#E3000F]" : "text-slate-400"
              )}>
                {item.icon}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col items-start overflow-hidden whitespace-nowrap">
                  <span className="font-bold text-lg">{item.label}</span>
                  <span className="text-xs font-medium opacity-60">{item.description}</span>
                </div>
              )}
              {activeTab === item.id && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 w-1.5 h-9 bg-[#E3000F] rounded-r-full"
                />
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-100">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100",
            !isSidebarOpen && "justify-center"
          )}>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[#E3000F] shrink-0">
              <User size={20} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">System Admin</span>
                <span className="text-xs text-slate-500 truncate">Chatbot Administrator</span>
              </div>
            )}
            {isSidebarOpen && <LogOut size={16} className="ml-auto text-slate-400 hover:text-rose-500 cursor-pointer" />}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out min-h-screen flex flex-col",
          isSidebarOpen ? "pl-72" : "pl-20"
        )}
      >
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"
            >
              <Menu size={22} />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2 text-base font-medium text-slate-500">
              <span>Admin</span>
              <ChevronRight size={16} />
              <span className="text-slate-900 font-bold">
                {navItems.find(n => n.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {killSwitchActive && (
              <button
                onClick={() => setActiveTab('change-control')}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg animate-pulse hover:bg-red-700 transition-all"
              >
                <Power size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">Kill Switch Active</span>
              </button>
            )}
            <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl relative transition-all">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#E3000F] rounded-full border-2 border-white" />
            </button>
            <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
              <Settings size={22} />
            </button>
            {killSwitchActive ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <X size={16} className="text-red-600" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-widest">GenAI Disabled</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">System Secure</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'discovery' && <IntentDiscovery onDeploy={handleDeploySuccess} onAddApproval={addApproval} onAddAuditEvent={addAuditEvent} />}
              {activeTab === 'dashboard' && <ExecutiveDashboard onNavigate={(tab, opts) => { setActiveTab(tab as Tab); if (opts?.autoOpenCreate) setAutoOpenCreate(true); }} />}
              {activeTab === 'active-intents' && <ActiveIntents onAddApproval={addApproval} onAddAuditEvent={addAuditEvent} autoOpenCreate={autoOpenCreate} onClearAutoOpen={() => setAutoOpenCreate(false)} />}
              {activeTab === 'active-agents' && <ActiveAgents onAddApproval={addApproval} onAddAuditEvent={addAuditEvent} onNavigate={(tab) => setActiveTab(tab as Tab)} />}
              {activeTab === 'audit-trail' && <AuditTrail auditEvents={auditEvents} />}
              {activeTab === 'guardrails' && <GuardrailsConfig onAddApproval={addApproval} onAddAuditEvent={addAuditEvent} />}
              {activeTab === 'change-control' && <AdminControlInterface approvals={pendingApprovals} onApprovalDecision={processApproval} onAddAuditEvent={addAuditEvent} onKillSwitchChange={setKillSwitchActive} />}
              {activeTab === 'content-library' && <ContentLibrary />}
              {activeTab === 'preview' && (
                <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
                  <div className="max-w-lg w-full">
                    <div className="mb-8 text-center">
                      <h2 className="text-3xl font-bold text-slate-900">Experience OCBC Next-Gen Banking</h2>
                      <p className="text-slate-500 mt-3 text-base">Test the OCBC retirement planner chatbot with real-time dashboard context and life-event awareness.</p>
                    </div>
                    <ChatbotPreview />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
