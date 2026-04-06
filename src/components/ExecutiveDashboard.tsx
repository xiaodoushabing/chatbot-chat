import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Users,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  FileSearch,
  MoreHorizontal,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Brain,
  Eye,
  AlertTriangle,
  Layers,
  DollarSign,
  Download,
  TrendingDown,
  Power,
  X,
  Settings,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import GuardrailsConfig from './GuardrailsConfig';
import { PendingApproval, AuditEvent, AuditActionType } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const QUERY_DATA = [
  { name: 'Mon', queries: 4200, satisfaction: 88 },
  { name: 'Tue', queries: 4800, satisfaction: 91 },
  { name: 'Wed', queries: 5100, satisfaction: 89 },
  { name: 'Thu', queries: 7200, satisfaction: 82 },
  { name: 'Fri', queries: 5400, satisfaction: 90 },
  { name: 'Sat', queries: 3200, satisfaction: 94 },
  { name: 'Sun', queries: 2800, satisfaction: 95 },
];

const QUERY_DATA_30D = [
  { name: 'Mar 1', queries: 4100 }, { name: 'Mar 2', queries: 3800 }, { name: 'Mar 3', queries: 4500 },
  { name: 'Mar 4', queries: 4900 }, { name: 'Mar 5', queries: 5200 }, { name: 'Mar 6', queries: 5600 },
  { name: 'Mar 7', queries: 7100 }, { name: 'Mar 8', queries: 5300 }, { name: 'Mar 9', queries: 3100 },
  { name: 'Mar 10', queries: 2900 }, { name: 'Mar 11', queries: 4300 }, { name: 'Mar 12', queries: 4700 },
  { name: 'Mar 13', queries: 5000 }, { name: 'Mar 14', queries: 7400 }, { name: 'Mar 15', queries: 5500 },
  { name: 'Mar 16', queries: 3300 }, { name: 'Mar 17', queries: 2700 }, { name: 'Mar 18', queries: 4400 },
  { name: 'Mar 19', queries: 4600 }, { name: 'Mar 20', queries: 5300 }, { name: 'Mar 21', queries: 6800 },
  { name: 'Mar 22', queries: 5100 }, { name: 'Mar 23', queries: 3400 }, { name: 'Mar 24', queries: 2600 },
  { name: 'Mar 25', queries: 4200 }, { name: 'Mar 26', queries: 4800 }, { name: 'Mar 27', queries: 5100 },
  { name: 'Mar 28', queries: 7200 },
];

const INTENT_DATA = [
  { name: 'OCBC 360 Account', value: 45 },
  { name: 'Home Loans', value: 25 },
  { name: 'CPF Life & Retirement', value: 15 },
  { name: 'Wealth Advisory', value: 10 },
  { name: 'Others', value: 5 },
];

const INTENT_DATA_30D = [
  { name: 'OCBC 360 Account', value: 42 },
  { name: 'Home Loans', value: 27 },
  { name: 'CPF Life & Retirement', value: 16 },
  { name: 'Wealth Advisory', value: 10 },
  { name: 'Others', value: 5 },
];

const COLORS = ['#E3000F', '#1e293b', '#64748b', '#cbd5e1', '#f1f5f9'];

// Project selector options
type ProjectOption = 'Retirement Planning' | 'Home Loans' | 'Card Services' | 'All Projects';

const PROJECT_OPTIONS: ProjectOption[] = [
  'Retirement Planning',
  'Home Loans',
  'Card Services',
  'All Projects',
];

interface HeroContent {
  headline: string;
  body: string;
  highlight1: string;
  highlight2: string;
  buttonLabel: string;
}

const HERO_CONTENT: Record<string, Record<ProjectOption, HeroContent>> = {
  '7d': {
    'Retirement Planning': {
      headline: 'Trending: "OCBC 360 Account Changes"',
      body: '340% spike in queries about new OCBC 360 interest rate tiers. Customers asking about',
      highlight1: '"salary credit requirements"',
      highlight2: '"wealth bonus"',
      buttonLabel: 'Review 360 Policy',
    },
    'Home Loans': {
      headline: 'Trending: "Fixed Rate Lock-In Queries"',
      body: '218% spike in queries about fixed-rate packages. Customers asking about',
      highlight1: '"lock-in period penalties"',
      highlight2: '"refinancing options"',
      buttonLabel: 'Review Loan Policy',
    },
    'Card Services': {
      headline: 'Trending: "Miles Card Rewards Redemption"',
      body: '175% spike in queries about miles redemption. Customers asking about',
      highlight1: '"transfer partners"',
      highlight2: '"expiry waivers"',
      buttonLabel: 'Review Cards Policy',
    },
    'All Projects': {
      headline: 'Cross-Project: Multi-Domain Query Surge',
      body: 'Query volume up 29% across all use cases this week. Highest growth in',
      highlight1: '"retirement planning"',
      highlight2: '"home loan advisory"',
      buttonLabel: 'View All Intents',
    },
  },
  '30d': {
    'Retirement Planning': {
      headline: 'Opportunity: "CPF Life Payout Confusion"',
      body: 'Recurring pattern over 30 days — 1,240 queries on CPF Life payout options with 18% fallback rate. Top misunderstood areas:',
      highlight1: '"Standard vs Escalating Plan"',
      highlight2: '"deferral to age 70 benefit"',
      buttonLabel: 'Update CPF Life Intent',
    },
    'Home Loans': {
      headline: 'Opportunity: "Refinancing Window Queries"',
      body: 'Steady 30-day trend — 890 queries about refinancing timing. Customers consistently confused about',
      highlight1: '"lock-in expiry calculations"',
      highlight2: '"TDSR threshold changes"',
      buttonLabel: 'Improve Refinance FAQ',
    },
    'Card Services': {
      headline: 'Opportunity: "Miles Expiry Anxiety"',
      body: '30-day analysis reveals 640 queries about miles expiring. Common frustration around',
      highlight1: '"auto-extension eligibility"',
      highlight2: '"minimum spend to retain miles"',
      buttonLabel: 'Clarify Miles Policy',
    },
    'All Projects': {
      headline: 'Cross-Project: Emerging Retirement + Property Gap',
      body: '30-day data shows growing cross-domain queries up 34%. Users increasingly asking about',
      highlight1: '"CPF OA impact on retirement"',
      highlight2: '"downsizing for retirement income"',
      buttonLabel: 'Review Cross-Intent Routes',
    },
  },
};

// ─── Cost Intelligence mock data ─────────────────────────────────────────────

interface AgentCostRow {
  agent: string;
  sessions: number;
  sessionsDisplay: string;
  cost: number;
  costDisplay: string;
  costPer1k: string;
  trend: string;
  trendUp: boolean | null;
}

const AGENT_COST_DATA: AgentCostRow[] = [
  {
    agent: 'Retirement_Planner_Agent',
    sessions: 3420,
    sessionsDisplay: '3,420',
    cost: 312.40,
    costDisplay: '$312.40',
    costPer1k: '$91.34',
    trend: '↓ 5%',
    trendUp: false,
  },
  {
    agent: 'Loan_Advisory_Agent',
    sessions: 2180,
    sessionsDisplay: '2,180',
    cost: 287.60,
    costDisplay: '$287.60',
    costPer1k: '$131.93',
    trend: '↑ 3%',
    trendUp: true,
  },
  {
    agent: 'Card_Services_Agent',
    sessions: 1940,
    sessionsDisplay: '1,940',
    cost: 241.80,
    costDisplay: '$241.80',
    costPer1k: '$124.64',
    trend: '↓ 2%',
    trendUp: false,
  },
  {
    agent: 'Wealth_Advisory_Agent',
    sessions: 1650,
    sessionsDisplay: '1,650',
    cost: 213.10,
    costDisplay: '$213.10',
    costPer1k: '$129.15',
    trend: '↑ 7%',
    trendUp: true,
  },
  {
    agent: 'Fraud_Detection_Agent',
    sessions: 4210,
    sessionsDisplay: '4,210',
    cost: 192.40,
    costDisplay: '$192.40',
    costPer1k: '$45.70',
    trend: '↓ 1%',
    trendUp: false,
  },
  {
    agent: 'Investment_Insights_Agent',
    sessions: 0,
    sessionsDisplay: '0',
    cost: 0,
    costDisplay: '$0.00',
    costPer1k: '$0.00',
    trend: '—',
    trendUp: null,
  },
];

// ─── Per-agent performance mock data ─────────────────────────────────────────

interface SparkPoint { v: number }

interface AgentPerfRow {
  agent: string;
  active: boolean;
  sessions: string;
  fallbackRate: number;
  fallbackDisplay: string;
  latencyMs: number;
  latencyDisplay: string;
  satisfaction: number;
  satisfactionDisplay: string;
  sparkline: SparkPoint[];
}

const AGENT_PERF_DATA: AgentPerfRow[] = [
  {
    agent: 'Retirement_Planner_Agent',
    active: true,
    sessions: '3,420',
    fallbackRate: 3.2,
    fallbackDisplay: '3.2%',
    latencyMs: 1840,
    latencyDisplay: '1,840 ms',
    satisfaction: 91.3,
    satisfactionDisplay: '91.3%',
    sparkline: [{ v: 480 }, { v: 520 }, { v: 490 }, { v: 610 }, { v: 570 }, { v: 490 }, { v: 510 }],
  },
  {
    agent: 'Loan_Advisory_Agent',
    active: true,
    sessions: '2,180',
    fallbackRate: 6.1,
    fallbackDisplay: '6.1%',
    latencyMs: 2120,
    latencyDisplay: '2,120 ms',
    satisfaction: 87.4,
    satisfactionDisplay: '87.4%',
    sparkline: [{ v: 290 }, { v: 310 }, { v: 300 }, { v: 320 }, { v: 340 }, { v: 330 }, { v: 310 }],
  },
  {
    agent: 'Card_Services_Agent',
    active: true,
    sessions: '1,940',
    fallbackRate: 4.8,
    fallbackDisplay: '4.8%',
    latencyMs: 1650,
    latencyDisplay: '1,650 ms',
    satisfaction: 89.2,
    satisfactionDisplay: '89.2%',
    sparkline: [{ v: 260 }, { v: 280 }, { v: 270 }, { v: 290 }, { v: 285 }, { v: 270 }, { v: 278 }],
  },
  {
    agent: 'Wealth_Advisory_Agent',
    active: true,
    sessions: '1,650',
    fallbackRate: 11.3,
    fallbackDisplay: '11.3%',
    latencyMs: 2430,
    latencyDisplay: '2,430 ms',
    satisfaction: 82.1,
    satisfactionDisplay: '82.1%',
    sparkline: [{ v: 200 }, { v: 210 }, { v: 220 }, { v: 240 }, { v: 250 }, { v: 260 }, { v: 236 }],
  },
  {
    agent: 'Fraud_Detection_Agent',
    active: true,
    sessions: '4,210',
    fallbackRate: 1.4,
    fallbackDisplay: '1.4%',
    latencyMs: 420,
    latencyDisplay: '420 ms',
    satisfaction: 94.7,
    satisfactionDisplay: '94.7%',
    sparkline: [{ v: 580 }, { v: 610 }, { v: 590 }, { v: 620 }, { v: 600 }, { v: 610 }, { v: 601 }],
  },
  {
    agent: 'Investment_Insights_Agent',
    active: false,
    sessions: '0',
    fallbackRate: 0,
    fallbackDisplay: '—',
    latencyMs: 0,
    latencyDisplay: '—',
    satisfaction: 0,
    satisfactionDisplay: '—',
    sparkline: [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }, { v: 0 }],
  },
];

// ─── Time-range-dependent data ───────────────────────────────────────────────

const AGENT_PERF_DATA_30D: AgentPerfRow[] = [
  { agent: 'Retirement_Planner_Agent', active: true, sessions: '13,680', fallbackRate: 3.5, fallbackDisplay: '3.5%', latencyMs: 1880, latencyDisplay: '1,880 ms', satisfaction: 90.8, satisfactionDisplay: '90.8%',
    sparkline: [{ v: 460 },{ v: 480 },{ v: 520 },{ v: 490 },{ v: 510 },{ v: 530 },{ v: 490 },{ v: 500 },{ v: 540 },{ v: 510 },{ v: 480 },{ v: 520 },{ v: 550 },{ v: 490 },{ v: 500 },{ v: 530 },{ v: 560 },{ v: 510 },{ v: 490 },{ v: 520 },{ v: 540 },{ v: 570 },{ v: 530 },{ v: 490 },{ v: 510 },{ v: 550 },{ v: 580 },{ v: 520 },{ v: 490 },{ v: 510 }] },
  { agent: 'Loan_Advisory_Agent', active: true, sessions: '8,720', fallbackRate: 6.4, fallbackDisplay: '6.4%', latencyMs: 2180, latencyDisplay: '2,180 ms', satisfaction: 86.9, satisfactionDisplay: '86.9%',
    sparkline: [{ v: 280 },{ v: 290 },{ v: 310 },{ v: 300 },{ v: 290 },{ v: 320 },{ v: 310 },{ v: 300 },{ v: 330 },{ v: 320 },{ v: 290 },{ v: 310 },{ v: 340 },{ v: 320 },{ v: 300 },{ v: 320 },{ v: 340 },{ v: 310 },{ v: 290 },{ v: 310 },{ v: 330 },{ v: 350 },{ v: 320 },{ v: 300 },{ v: 310 },{ v: 330 },{ v: 340 },{ v: 310 },{ v: 290 },{ v: 310 }] },
  { agent: 'Card_Services_Agent', active: true, sessions: '7,760', fallbackRate: 5.1, fallbackDisplay: '5.1%', latencyMs: 1690, latencyDisplay: '1,690 ms', satisfaction: 88.7, satisfactionDisplay: '88.7%',
    sparkline: [{ v: 250 },{ v: 260 },{ v: 270 },{ v: 260 },{ v: 280 },{ v: 290 },{ v: 270 },{ v: 260 },{ v: 280 },{ v: 290 },{ v: 270 },{ v: 260 },{ v: 280 },{ v: 290 },{ v: 285 },{ v: 270 },{ v: 280 },{ v: 290 },{ v: 275 },{ v: 265 },{ v: 280 },{ v: 290 },{ v: 285 },{ v: 270 },{ v: 260 },{ v: 275 },{ v: 285 },{ v: 278 },{ v: 270 },{ v: 278 }] },
  { agent: 'Wealth_Advisory_Agent', active: true, sessions: '6,600', fallbackRate: 11.8, fallbackDisplay: '11.8%', latencyMs: 2480, latencyDisplay: '2,480 ms', satisfaction: 81.5, satisfactionDisplay: '81.5%',
    sparkline: [{ v: 190 },{ v: 200 },{ v: 210 },{ v: 220 },{ v: 210 },{ v: 230 },{ v: 240 },{ v: 220 },{ v: 210 },{ v: 230 },{ v: 240 },{ v: 250 },{ v: 230 },{ v: 220 },{ v: 240 },{ v: 250 },{ v: 260 },{ v: 240 },{ v: 230 },{ v: 250 },{ v: 260 },{ v: 250 },{ v: 240 },{ v: 250 },{ v: 260 },{ v: 250 },{ v: 240 },{ v: 250 },{ v: 236 },{ v: 236 }] },
  { agent: 'Fraud_Detection_Agent', active: true, sessions: '16,840', fallbackRate: 1.6, fallbackDisplay: '1.6%', latencyMs: 440, latencyDisplay: '440 ms', satisfaction: 94.2, satisfactionDisplay: '94.2%',
    sparkline: [{ v: 560 },{ v: 580 },{ v: 590 },{ v: 610 },{ v: 600 },{ v: 590 },{ v: 610 },{ v: 620 },{ v: 600 },{ v: 590 },{ v: 610 },{ v: 620 },{ v: 600 },{ v: 590 },{ v: 610 },{ v: 620 },{ v: 610 },{ v: 600 },{ v: 620 },{ v: 610 },{ v: 600 },{ v: 610 },{ v: 620 },{ v: 600 },{ v: 590 },{ v: 610 },{ v: 620 },{ v: 601 },{ v: 610 },{ v: 601 }] },
  { agent: 'Investment_Insights_Agent', active: false, sessions: '0', fallbackRate: 0, fallbackDisplay: '—', latencyMs: 0, latencyDisplay: '—', satisfaction: 0, satisfactionDisplay: '—',
    sparkline: [{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 },{ v: 0 }] },
];

const AGENT_COST_DATA_30D: AgentCostRow[] = [
  { agent: 'Retirement_Planner_Agent', sessions: 13680, sessionsDisplay: '13,680', cost: 1249.60, costDisplay: '$1,249.60', costPer1k: '$91.34', trend: '↓ 5%', trendUp: false },
  { agent: 'Loan_Advisory_Agent', sessions: 8720, sessionsDisplay: '8,720', cost: 1150.40, costDisplay: '$1,150.40', costPer1k: '$131.93', trend: '↑ 3%', trendUp: true },
  { agent: 'Card_Services_Agent', sessions: 7760, sessionsDisplay: '7,760', cost: 967.20, costDisplay: '$967.20', costPer1k: '$124.64', trend: '↓ 2%', trendUp: false },
  { agent: 'Wealth_Advisory_Agent', sessions: 6600, sessionsDisplay: '6,600', cost: 852.40, costDisplay: '$852.40', costPer1k: '$129.15', trend: '↑ 7%', trendUp: true },
  { agent: 'Fraud_Detection_Agent', sessions: 16840, sessionsDisplay: '16,840', cost: 769.60, costDisplay: '$769.60', costPer1k: '$45.70', trend: '↓ 1%', trendUp: false },
  { agent: 'Investment_Insights_Agent', sessions: 0, sessionsDisplay: '0', cost: 0, costDisplay: '$0.00', costPer1k: '$0.00', trend: '—', trendUp: null },
];

const STATS_BY_RANGE = {
  '7d': { interactions: '32,740', interactionsChange: '+12.5%', customers: '18,210', customersChange: '+8.2%', satisfaction: '91.3%', satisfactionChange: '+2.1%', fallback: '3.2%', fallbackChange: '-0.8%' },
  '30d': { interactions: '128,400', interactionsChange: '+9.3%', customers: '72,840', customersChange: '+6.1%', satisfaction: '89.7%', satisfactionChange: '+1.4%', fallback: '4.1%', fallbackChange: '-0.5%' },
};

const GUARDRAIL_BY_RANGE = {
  '7d': { hallucinations: 247, attacks: 89, riskAttempts: 12, hallPct: '0.75%', hallChange: '-12%', attackPct: '2.4%', attackChange: '+8%', vectors: 12 },
  '30d': { hallucinations: 1043, attacks: 347, riskAttempts: 48, hallPct: '0.81%', hallChange: '-9%', attackPct: '2.7%', attackChange: '+11%', vectors: 19 },
};

const COST_BY_RANGE = {
  '7d': { monthlyCost: '$1,247.30', costPer1k: '$0.038', projected: '$14,967', costChange: '-8% vs Feb', per1kChange: '+2%' },
  '30d': { monthlyCost: '$4,989.20', costPer1k: '$0.039', projected: '$14,967', costChange: '-6% vs Feb', per1kChange: '+3%' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface ExecutiveDashboardProps {
  onNavigate: (tab: string, opts?: { autoOpenCreate?: boolean }) => void;
  killSwitchActive: boolean;
  onUpdateKillSwitch: (active: boolean) => void;
  onAddApproval: (a: Omit<PendingApproval, 'id' | 'submittedAt' | 'status'>) => void;
  onAddAuditEvent: (e: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
  approvals: PendingApproval[];
}

export default function ExecutiveDashboard({ onNavigate, killSwitchActive, onUpdateKillSwitch, onAddApproval, onAddAuditEvent, approvals }: ExecutiveDashboardProps) {
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
  const [showAgentPerformance, setShowAgentPerformance] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectOption>('Retirement Planning');
  const [isExporting, setIsExporting] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showDeactivateSubmit, setShowDeactivateSubmit] = useState(false);
  const [showCostIntelligence, setShowCostIntelligence] = useState(false);
  const [showGuardrailConfig, setShowGuardrailConfig] = useState(false);
  const [showTisoConfirm, setShowTisoConfirm] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const guardrailConfigRef = useRef<HTMLDivElement>(null);
  const detailedAnalyticsRef = useRef<HTMLDivElement>(null);

  const scrollToDetailedAnalytics = () => {
    setShowDetailedAnalytics(true);
    setTimeout(() => {
      detailedAnalyticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const queryData = timeRange === '7d' ? QUERY_DATA : QUERY_DATA_30D;
  const intentData = timeRange === '7d' ? INTENT_DATA : INTENT_DATA_30D;
  const agentPerfData = timeRange === '7d' ? AGENT_PERF_DATA : AGENT_PERF_DATA_30D;
  const agentCostData = timeRange === '7d' ? AGENT_COST_DATA : AGENT_COST_DATA_30D;
  const stats = STATS_BY_RANGE[timeRange];
  const guardrails = GUARDRAIL_BY_RANGE[timeRange];
  const costStats = COST_BY_RANGE[timeRange];

  // Inject print CSS on mount
  useEffect(() => {
    const styleId = 'executive-dashboard-print-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.setAttribute('media', 'print');
    style.textContent = `
      /* Hide everything outside the dashboard content */
      body > *:not(#root) { display: none !important; }
      nav, aside, header, [data-sidebar], [data-topnav],
      .no-print, button, select { display: none !important; }

      /* Show dashboard content */
      #root { display: block !important; }
      .executive-dashboard-root { padding: 0 !important; }

      /* Print header */
      .executive-dashboard-root::before {
        content: "OCBC AI Chatbot — Executive Dashboard";
        display: block;
        font-size: 18px;
        font-weight: bold;
        border-bottom: 2px solid #E3000F;
        padding-bottom: 8px;
        margin-bottom: 24px;
        color: #0f172a;
      }

      /* Remove shadows and rounded corners for cleaner print */
      * { box-shadow: none !important; border-radius: 4px !important; }

      /* Avoid page breaks inside cards */
      .print-avoid-break { page-break-inside: avoid; }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const handleActivateKillSwitch = () => {
    setShowActivateConfirm(false);
    const alreadyPending = approvals.some(
      a => a.actionType === 'system.kill_switch_activate' && a.status === 'pending'
    );
    if (!alreadyPending) {
      onAddApproval({
        actionType: 'system.kill_switch_activate',
        entityName: 'Global Kill Switch',
        entityId: 'global-kill-switch',
        description: 'Activate global kill switch — disable all GenAI responses',
        detail: 'All LLM agent calls will be disabled. All queries will be served by template responses or exclusion messages. Takes effect upon checker approval.',
        submittedBy: 'System Admin',
      });
      onAddAuditEvent({
        actor: 'System Admin',
        actorRole: 'ADMIN',
        actionType: 'approval.submit' as AuditActionType,
        entityType: 'approval',
        entityId: 'kill-switch-activate-' + Date.now(),
        entityName: 'Global Kill Switch',
        description: 'Kill switch activation submitted for checker approval.',
        severity: 'critical',
      });
    }
  };

  const handleDeactivateSubmit = () => {
    setShowDeactivateSubmit(false);
    const alreadyPending = approvals.some(
      a => a.actionType === 'system.kill_switch_deactivate' && a.status === 'pending'
    );
    if (!alreadyPending) {
      onAddApproval({
        actionType: 'system.kill_switch_deactivate',
        entityName: 'Global Kill Switch',
        entityId: 'global-kill-switch',
        description: 'Deactivate global kill switch — re-enable GenAI responses',
        detail: 'Re-enabling GenAI will resume all LLM agent calls. All queries will be routed normally through intent matching and agent responses.',
        submittedBy: 'System Admin',
      });
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
  };

  const handleConfigureGuardrail = () => {
    setShowGuardrailConfig(true);
    setTimeout(() => {
      guardrailConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      window.print();
    }, 800);
  };

  const hero = HERO_CONTENT[timeRange][selectedProject];
  const today = new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="executive-dashboard-root flex flex-col min-h-screen">

      {/* Kill Switch Banner */}
      <AnimatePresence mode="wait">
        {killSwitchActive ? (
          <motion.div
            key="ks-active"
            initial={{ opacity: 0, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.8 }}
            className="bg-red-600 text-white px-6 py-4 flex items-center gap-4 shadow-lg shadow-red-900/30 relative overflow-hidden no-print"
          >
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
                <p className="font-black text-lg tracking-wide">KILL SWITCH ACTIVE</p>
                <p className="text-red-100 text-sm font-medium">All GenAI responses disabled — system serving templates and exclusions only</p>
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
            key="ks-inactive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-slate-900 text-white px-6 py-3 flex items-center gap-4 no-print"
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

      <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">

      {/* Header Section */}
      <div className="flex flex-col gap-3 no-print">
        {/* Title row — export on far right */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">Reports & Insights</h2>
            <p className="text-slate-500 text-base">
              Real-time intelligence, guardrail monitoring, and automated risk detection.
              {selectedProject !== 'All Projects' && (
                <span className="ml-2 text-slate-400 text-sm font-medium">
                  — {selectedProject}
                </span>
              )}
            </p>
          </div>
          {/* Export button — top right, slate */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              'shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm border',
              isExporting
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700'
            )}
          >
            <Download size={15} />
            {isExporting ? 'Preparing...' : 'Export Report'}
          </button>
        </div>

        {/* Filters row — date and project selector same height */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time filter */}
          <div className="flex items-center gap-1.5 bg-white h-10 px-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setTimeRange('7d')} className={cn("h-7 px-4 text-sm font-semibold rounded-lg", timeRange === '7d' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700")}>Last 7 Days</button>
            <button onClick={() => setTimeRange('30d')} className={cn("h-7 px-4 text-sm font-semibold rounded-lg", timeRange === '30d' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700")}>Last 30 Days</button>
          </div>

          {/* Project selector — same h-10 */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl shadow-sm h-10 px-3">
            <Layers size={16} className="text-slate-500 shrink-0" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value as ProjectOption)}
              className="text-sm font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-1"
            >
              {PROJECT_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Print-only header (hidden on screen) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-slate-900">OCBC AI Chatbot — Executive Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{today} &nbsp;|&nbsp; {selectedProject}</p>
        <div className="h-0.5 bg-[#E3000F] mt-3" />
      </div>

      {/* OCBC AI Insight Engine - Trending (Full Width, Hero) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-10 text-white relative overflow-hidden print-avoid-break">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Zap size={200} fill="currentColor" />
        </div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#E3000F]/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />


<div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-[#E3000F]/20 border border-[#E3000F]/30 rounded-full w-fit">
            <Zap size={18} className="text-red-400" fill="currentColor" />
            <span className="text-sm font-bold text-red-300 uppercase tracking-wider">OCBC AI Insight Engine</span>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-3xl font-black leading-tight">{hero.headline}</h3>
            <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
              {hero.body} <span className="text-white font-semibold">{hero.highlight1}</span> and{' '}
              <span className="text-white font-semibold">{hero.highlight2}</span>.
            </p>
            {selectedProject !== 'Retirement Planning' && (
              <span className="text-xs text-slate-500 font-medium">(demo data)</span>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-2 no-print">
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-base hover:bg-slate-100 transition-all shadow-lg">
              <FileSearch size={20} /> {hero.buttonLabel}
            </button>
            <button onClick={scrollToDetailedAnalytics} className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-base hover:bg-white/20 transition-all border border-white/10">
              <Search size={20} /> Analyze Intent Trends
            </button>
          </div>
        </div>
      </div>

      {/* Opportunity - Highlighted */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        className="p-8 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 shadow-lg shadow-indigo-100/50 flex flex-col md:flex-row items-start md:items-center gap-6 print-avoid-break"
      >
        <div className="p-4 rounded-2xl bg-indigo-100 shrink-0">
          <Sparkles size={28} className="text-indigo-600" />
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Opportunity Detected</span>
          </div>
          <h4 className="text-xl font-bold text-slate-900">New Topic Gaining Trend: "Sustainable Investing"</h4>
          <p className="text-base text-slate-600 leading-relaxed">
            Users frequently mention sustainable investing in retirement contexts. No existing intent covers this — creating one could improve satisfaction by an estimated 8%.
          </p>
        </div>
        <div className="flex flex-col gap-3 shrink-0 no-print">
          <button
            onClick={() => onNavigate('discovery', { autoOpenCreate: true })}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            Generate New Topic
          </button>
          <button onClick={scrollToDetailedAnalytics} className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all">
            View Trend Data
          </button>
        </div>
      </motion.div>

      {/* Guardrail Observability - Eye-catching */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hallucination Guard */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 text-white print-avoid-break">
          <div className="absolute top-0 right-0 opacity-10">
            <Brain size={160} />
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Brain size={24} />
                </div>
                <span className="text-base font-bold uppercase tracking-widest text-emerald-100">LLM Guardrail</span>
              </div>
              <button
                onClick={handleConfigureGuardrail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-lg transition-all no-print"
              >
                <Settings size={13} />
                Configure
              </button>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-7xl font-black leading-none">{guardrails.hallucinations}</span>
              <span className="text-xl font-semibold text-emerald-200 pb-1">hallucinations caught</span>
            </div>
            <p className="text-lg text-emerald-100 leading-relaxed">
              Deterministic fact-checking layer intercepted {guardrails.hallucinations} inaccurate responses {timeRange === '7d' ? 'this week' : 'this month'} before they reached customers.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <Eye size={18} />
                <span className="text-base font-bold">{guardrails.hallPct} of Total Queries</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <Activity size={18} />
                <span className="text-base font-bold">{guardrails.hallChange} vs Last Period</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Injection Shield */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-violet-700 rounded-3xl p-8 text-white print-avoid-break">
          <div className="absolute top-0 right-0 opacity-10">
            <ShieldCheck size={160} />
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <ShieldCheck size={24} />
                </div>
                <span className="text-base font-bold uppercase tracking-widest text-violet-100">Security Guardrail</span>
              </div>
              <button
                onClick={handleConfigureGuardrail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-lg transition-all no-print"
              >
                <Settings size={13} />
                Configure
              </button>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-7xl font-black leading-none">{guardrails.attacks}</span>
              <span className="text-xl font-semibold text-violet-200 pb-1">injection attacks blocked</span>
            </div>
            <p className="text-lg text-violet-100 leading-relaxed">
              Prompt injection detection shielded the chatbot from {guardrails.attacks} adversarial attempts across {guardrails.vectors} unique threat vectors.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <AlertTriangle size={18} />
                <span className="text-base font-bold">{guardrails.attackPct} of Total Queries</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <ShieldAlert size={18} />
                <span className="text-base font-bold">{guardrails.attackChange} vs Last Period</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Alert */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        className="p-6 rounded-2xl border border-rose-200 bg-rose-50 flex items-start gap-5 print-avoid-break"
      >
        <div className="p-3.5 rounded-xl bg-rose-100 shrink-0">
          <ShieldAlert size={24} className="text-rose-600" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-rose-500 uppercase tracking-widest">Risk</span>
            <button className="text-slate-400 hover:text-slate-600 no-print"><MoreHorizontal size={18} /></button>
          </div>
          <h4 className="text-lg font-bold text-slate-900">Potential Malicious Activity</h4>
          <p className="text-base text-slate-600 leading-relaxed">Detected {guardrails.riskAttempts} attempts to bypass financial advice guardrails using prompt injection techniques from {Math.ceil(guardrails.riskAttempts / 4)} unique IPs in the last {timeRange === '7d' ? '24 hours' : '7 days'}.</p>
          <div className="mt-3 no-print">
            <button onClick={() => setShowTisoConfirm(true)} className="px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-sm font-bold transition-all">
              Alert TISO
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Change 3: Per-Agent Performance Breakdown (Collapsible) ──────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAgentPerformance(!showAgentPerformance)}
          className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all no-print"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Activity size={20} className="text-blue-500" />
            </div>
            <span className="text-lg font-bold text-slate-900 uppercase tracking-widest">Agent Performance</span>
            <span className="text-sm text-slate-400 font-medium">Per-agent sessions, fallback, latency, satisfaction</span>
          </div>
          {showAgentPerformance ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {showAgentPerformance && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-8 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Agent</th>
                      <th className="text-center px-4 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Active</th>
                      <th className="px-4 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <span>Sessions</span>
                          <span className="text-slate-300 font-normal normal-case tracking-normal">{timeRange === '7d' ? '7-day' : '30-day'} trend</span>
                        </div>
                      </th>
                      <th className="text-right px-4 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Fallback Rate</th>
                      <th className="text-right px-4 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Avg Latency</th>
                      <th className="text-right px-8 py-4 text-sm font-bold text-slate-400 uppercase tracking-wider">Satisfaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentPerfData.map((row, i) => (
                      <tr
                        key={row.agent}
                        className={cn(
                          'border-b border-slate-50 transition-colors hover:bg-slate-50/60',
                          i === agentPerfData.length - 1 && 'border-b-0'
                        )}
                      >
                        <td className="px-8 py-4">
                          <span className="font-mono text-sm font-semibold text-slate-700">{row.agent}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                            row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                          )}>
                            {row.active ? '✓' : '–'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-700 font-medium tabular-nums w-12">{row.sessions}</span>
                            {row.active ? (
                              <LineChart width={80} height={30} data={row.sparkline}>
                                <Line
                                  type="monotone"
                                  dataKey="v"
                                  stroke="#E3000F"
                                  strokeWidth={1.5}
                                  dot={false}
                                />
                              </LineChart>
                            ) : (
                              <div className="w-20 h-[30px] flex items-center">
                                <span className="text-slate-300 text-xs">—</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {row.active ? (
                            <FallbackBadge rate={row.fallbackRate} display={row.fallbackDisplay} />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {row.active ? (
                            <span className={cn(
                              'text-base font-medium tabular-nums',
                              row.latencyMs > 2000 ? 'text-amber-600' : 'text-slate-700'
                            )}>
                              {row.latencyDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          {row.active ? (
                            <span className={cn(
                              'text-base font-medium tabular-nums',
                              row.satisfaction < 85 ? 'text-amber-600' : 'text-slate-700'
                            )}>
                              {row.satisfactionDisplay}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-8 py-4 border-t border-slate-50 flex flex-wrap gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Fallback &lt; 5% (good)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Fallback 5–10% / Latency &gt; 2s / Satisfaction &lt; 85%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Fallback &gt; 10% (critical)</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detailed Analytics - Collapsible */}
      <div ref={detailedAnalyticsRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
          className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all no-print"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <TrendingUp size={20} className="text-indigo-500" />
            </div>
            <span className="text-base font-bold text-slate-900 uppercase tracking-widest">Detailed Analytics</span>
            <span className="text-sm text-slate-400 font-medium">Interaction volume, top intents, customers</span>
          </div>
          {showDetailedAnalytics ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {showDetailedAnalytics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-8 pb-8 flex flex-col gap-6 border-t border-slate-100 pt-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Customer Interactions"
                    value={stats.interactions}
                    change={stats.interactionsChange}
                    trend="up"
                    icon={<MessageSquare size={22} className="text-[#E3000F]" />}
                  />
                  <StatCard
                    title="Active Customers"
                    value={stats.customers}
                    change={stats.customersChange}
                    trend="up"
                    icon={<Users size={22} className="text-emerald-600" />}
                  />
                  <StatCard
                    title="Avg Satisfaction"
                    value={stats.satisfaction}
                    change={stats.satisfactionChange}
                    trend="up"
                    icon={<Activity size={22} className="text-indigo-600" />}
                  />
                  <StatCard
                    title="Fallback Rate"
                    value={stats.fallback}
                    change={stats.fallbackChange}
                    trend="down"
                    icon={<TrendingUp size={22} className="text-amber-600" />}
                  />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Interaction Volume */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">Interaction Volume</h3>
                      <TrendingUp size={18} className="text-slate-400" />
                    </div>
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={queryData}>
                          <defs>
                            <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#E3000F" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#E3000F" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 21, fill: '#94a3b8'}} />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '21px' }}
                          />
                          <Area type="monotone" dataKey="queries" stroke="#E3000F" strokeWidth={3} fillOpacity={1} fill="url(#colorQueries)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Intents */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">Top Intents</h3>
                      <Activity size={18} className="text-slate-400" />
                    </div>
                    <div className="h-[260px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={intentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {intentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-3 ml-4">
                        {intentData.map((item, i) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                            <span className="text-sm font-medium text-slate-600">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Cost Intelligence (collapsible) ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-avoid-break">
        <button
          onClick={() => setShowCostIntelligence(!showCostIntelligence)}
          className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all no-print"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <DollarSign size={20} className="text-amber-500" />
            </div>
            <span className="text-lg font-bold text-slate-900 uppercase tracking-widest">Cost Intelligence</span>
            <span className="text-sm text-slate-400 font-medium">AI-powered usage analytics</span>
          </div>
          {showCostIntelligence ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {showCostIntelligence && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-6 px-8 pb-8 border-t border-slate-100 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/20 flex flex-col gap-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Monthly AI Cost</span>
                    <span className="text-4xl font-black text-white leading-none">{costStats.monthlyCost}</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">March 2026</span>
                      <span className="flex items-center gap-1 text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg">
                        <TrendingDown size={13} />{costStats.costChange}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/20 flex flex-col gap-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Cost per 1,000 Queries</span>
                    <span className="text-4xl font-black text-white leading-none">{costStats.costPer1k}</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Rolling 30-day avg</span>
                      <span className="flex items-center gap-1 text-sm font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">
                        <TrendingUp size={13} />{costStats.per1kChange}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/20 flex flex-col gap-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Projected Annual Cost</span>
                    <span className="text-4xl font-black text-white leading-none">{costStats.projected}</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-slate-400">At current query volume</span>
                      <span className="text-xs font-semibold text-emerald-400">vs $180K self-hosted GPU estimate</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 rounded-2xl border border-amber-500/20 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700/60">
                    <span className="text-base font-bold text-amber-400 uppercase tracking-widest">Per-Agent Cost Breakdown</span>
                    <span className="ml-3 text-sm text-slate-500">Sorted by cost, March 2026</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-base">
                      <thead>
                        <tr className="border-b border-slate-700/60">
                          <th className="text-left px-6 py-3 text-sm font-bold text-slate-400 uppercase tracking-wider">Agent</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-slate-400 uppercase tracking-wider">Sessions</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-slate-400 uppercase tracking-wider">Cost This Month</th>
                          <th className="text-right px-4 py-3 text-sm font-bold text-slate-400 uppercase tracking-wider">Cost / 1K Sessions</th>
                          <th className="text-right px-6 py-3 text-sm font-bold text-slate-400 uppercase tracking-wider">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentCostData.map((row, i) => (
                          <tr key={row.agent} className={cn('border-b border-slate-800/60 transition-colors hover:bg-slate-800/40', i === agentCostData.length - 1 && 'border-b-0')}>
                            <td className="px-6 py-4">
                              <span className={cn('font-mono text-sm font-semibold', row.sessions === 0 ? 'text-slate-500' : 'text-slate-200')}>{row.agent}</span>
                              {row.sessions === 0 && <span className="ml-2 text-sm text-slate-600">(inactive)</span>}
                            </td>
                            <td className="px-4 py-4 text-right text-slate-300 font-medium tabular-nums">{row.sessionsDisplay}</td>
                            <td className="px-4 py-4 text-right font-bold tabular-nums">
                              <span className={row.cost === 0 ? 'text-slate-600' : 'text-amber-300'}>{row.costDisplay}</span>
                            </td>
                            <td className="px-4 py-4 text-right text-slate-400 tabular-nums">{row.costPer1k}</td>
                            <td className="px-6 py-4 text-right">
                              {row.trendUp === null ? <span className="text-slate-600">—</span> : (
                                <span className={cn('text-sm font-bold', row.trendUp ? 'text-rose-400' : 'text-emerald-400')}>{row.trend}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Guardrail Configuration ──────────────────────────────────────────── */}
      <div ref={guardrailConfigRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm no-print">
        <button
          onClick={() => {
            const expanding = !showGuardrailConfig;
            setShowGuardrailConfig(expanding);
            if (expanding) {
              setTimeout(() => {
                guardrailConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }, 350);
            }
          }}
          className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>
            <span className="text-lg font-bold text-slate-900 uppercase tracking-widest">Guardrail Configuration</span>
            <span className="text-sm text-slate-400 font-medium">LLM & security policy settings</span>
          </div>
          {showGuardrailConfig ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {showGuardrailConfig && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-slate-100"
            >
              <GuardrailsConfig onAddApproval={onAddApproval} onAddAuditEvent={onAddAuditEvent} embedded />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </div>{/* end inner content div */}

      {/* TISO Alert Confirmation Modal */}
      <AnimatePresence>
        {showTisoConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTisoConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-100 rounded-xl shrink-0">
                  <ShieldAlert size={24} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Alert TISO</h3>
                  <p className="text-sm text-slate-500 mt-1">Technology and Information Security Officer</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to send a security alert to the TISO regarding <span className="font-semibold text-slate-900">{guardrails.riskAttempts} detected prompt injection attempts</span> from {Math.ceil(guardrails.riskAttempts / 4)} unique IPs. This will notify the security team for immediate investigation.
              </p>
              <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                <p className="text-xs text-rose-700 font-medium">This action will be logged in the audit trail and cannot be undone.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTisoConfirm(false)}
                  className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onAddAuditEvent({
                      actor: 'System Admin',
                      actorRole: 'ADMIN',
                      actionType: 'security.alert' as AuditActionType,
                      entityType: 'guardrail',
                      entityId: 'tiso-alert-' + Date.now(),
                      entityName: 'TISO Security Alert',
                      description: `TISO alerted — ${guardrails.riskAttempts} prompt injection attempts detected from ${Math.ceil(guardrails.riskAttempts / 4)} unique IPs.`,
                      severity: 'critical',
                    });
                    setShowTisoConfirm(false);
                  }}
                  className="flex-1 px-5 py-3 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
                >
                  Confirm Alert
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kill Switch — Activate Confirmation Modal */}
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
                <button onClick={() => setShowActivateConfirm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col gap-2">
                  <p className="text-sm font-bold text-red-900">Impact Summary (upon approval)</p>
                  <ul className="text-sm text-red-700 flex flex-col gap-1.5">
                    <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />All LLM agent calls will be disabled</li>
                    <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />All queries will be served by template responses or exclusion messages</li>
                    <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />Requires checker approval before taking effect</li>
                    <li className="flex items-start gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />Re-enable also requires checker approval</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-600">This is an emergency action. Use only when there is an active security incident, model misbehavior, or compliance violation.</p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={() => setShowActivateConfirm(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 text-sm">Cancel</button>
                  <button
                    onClick={handleActivateKillSwitch}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#E3000F] hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-200"
                  >
                    <Power size={15} />
                    Submit for Approval
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kill Switch — Deactivate Submit Modal */}
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
                <button onClick={() => setShowDeactivateSubmit(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-sm font-bold text-amber-900 mb-1">Checker approval required</p>
                  <p className="text-sm text-amber-700">Deactivating the kill switch requires a second actor to approve. GenAI will remain disabled until approved.</p>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={() => setShowDeactivateSubmit(false)} className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 text-sm">Cancel</button>
                  <button
                    onClick={handleDeactivateSubmit}
                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm"
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

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ title, value, change, trend, icon }: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="p-2.5 bg-slate-50 rounded-lg">{icon}</div>
        <span className={cn(
          "text-sm font-bold flex items-center gap-0.5",
          trend === 'up' ? "text-emerald-600" : "text-rose-600"
        )}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {change}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-3xl font-bold text-slate-900">{value}</span>
      </div>
    </div>
  );
}

function FallbackBadge({ rate, display }: { rate: number; display: string }) {
  const color =
    rate > 10
      ? 'text-rose-600 bg-rose-50'
      : rate > 5
      ? 'text-amber-600 bg-amber-50'
      : 'text-emerald-600 bg-emerald-50';

  return (
    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg tabular-nums', color)}>
      {display}
    </span>
  );
}
