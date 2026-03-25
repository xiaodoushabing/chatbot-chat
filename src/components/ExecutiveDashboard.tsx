import React, { useState, useEffect } from 'react';
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

const INTENT_DATA = [
  { name: 'OCBC 360 Account', value: 45 },
  { name: 'Home Loans', value: 25 },
  { name: 'CPF Life & Retirement', value: 15 },
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

const HERO_CONTENT: Record<ProjectOption, HeroContent> = {
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface ExecutiveDashboardProps {
  onNavigate: (tab: string, opts?: { autoOpenCreate?: boolean }) => void;
}

export default function ExecutiveDashboard({ onNavigate }: ExecutiveDashboardProps) {
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
  const [showAgentPerformance, setShowAgentPerformance] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectOption>('Retirement Planning');
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      window.print();
    }, 800);
  };

  const hero = HERO_CONTENT[selectedProject];
  const today = new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="executive-dashboard-root flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Observability</h2>
          <p className="text-slate-500 text-base">
            Real-time intelligence, guardrail monitoring, and automated risk detection.
            {selectedProject !== 'All Projects' && (
              <span className="ml-2 text-slate-400 text-sm font-medium">
                — {selectedProject}
              </span>
            )}
          </p>
        </div>

        {/* Controls row: time filter + project selector + export */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time filter */}
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button className="px-5 py-2.5 text-sm font-semibold bg-slate-50 text-slate-900 rounded-lg">Last 7 Days</button>
            <button className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700">Last 30 Days</button>
          </div>

          {/* Project selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl shadow-sm px-3 py-2">
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

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm',
              isExporting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-700'
            )}
          >
            <Download size={16} />
            {isExporting ? 'Preparing...' : 'Export Report'}
          </button>
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
            <button className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-base hover:bg-white/20 transition-all border border-white/10">
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
            onClick={() => onNavigate('active-intents', { autoOpenCreate: true })}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            Generate New Intent
          </button>
          <button className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all">
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
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Brain size={24} />
              </div>
              <span className="text-base font-bold uppercase tracking-widest text-emerald-100">LLM Guardrail</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-7xl font-black leading-none">247</span>
              <span className="text-xl font-semibold text-emerald-200 pb-1">hallucinations caught</span>
            </div>
            <p className="text-lg text-emerald-100 leading-relaxed">
              Deterministic fact-checking layer intercepted 247 inaccurate responses this week before they reached customers.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <Eye size={18} />
                <span className="text-base font-bold">0.75% of Total Queries</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <Activity size={18} />
                <span className="text-base font-bold">-12% vs Last Period</span>
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
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <ShieldCheck size={24} />
              </div>
              <span className="text-base font-bold uppercase tracking-widest text-violet-100">Security Guardrail</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-7xl font-black leading-none">89</span>
              <span className="text-xl font-semibold text-violet-200 pb-1">injection attacks blocked</span>
            </div>
            <p className="text-lg text-violet-100 leading-relaxed">
              Prompt injection detection shielded the chatbot from 89 adversarial attempts across 12 unique threat vectors.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <AlertTriangle size={18} />
                <span className="text-base font-bold">2.4% of Total Queries</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <ShieldAlert size={18} />
                <span className="text-base font-bold">+8% vs Last Period</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change 2: Cost Intelligence ──────────────────────────────────────── */}
      <div className="flex flex-col gap-6 print-avoid-break">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <DollarSign size={20} className="text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest">Cost Intelligence</h3>
          <span className="text-xs font-medium text-slate-400 ml-1">AI-powered usage analytics</span>
        </div>

        {/* Three stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Monthly Bedrock Cost */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/20 flex flex-col gap-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Monthly AI Cost</span>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-white leading-none">$1,247.30</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">March 2026</span>
              <span className="flex items-center gap-1 text-sm font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-lg">
                <TrendingDown size={13} />
                -8% vs Feb
              </span>
            </div>
          </div>

          {/* Cost per 1K Queries */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/20 flex flex-col gap-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Cost per 1,000 Queries</span>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-white leading-none">$0.038</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Rolling 30-day avg</span>
              <span className="flex items-center gap-1 text-sm font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">
                <TrendingUp size={13} />
                +2%
              </span>
            </div>
          </div>

          {/* Projected Annual Cost */}
          <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/20 flex flex-col gap-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Projected Annual Cost</span>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-white leading-none">$14,967</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-slate-400">At current query volume</span>
              <span className="text-xs font-semibold text-emerald-400">
                vs $180K self-hosted GPU estimate
              </span>
            </div>
          </div>
        </div>

        {/* Per-agent cost breakdown table */}
        <div className="bg-slate-900 rounded-2xl border border-amber-500/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/60">
            <span className="text-sm font-bold text-amber-400 uppercase tracking-widest">Per-Agent Cost Breakdown</span>
            <span className="ml-3 text-xs text-slate-500">Sorted by cost, March 2026</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Agent</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Sessions</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Cost This Month</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Cost / 1K Sessions</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody>
                {AGENT_COST_DATA.map((row, i) => (
                  <tr
                    key={row.agent}
                    className={cn(
                      'border-b border-slate-800/60 transition-colors hover:bg-slate-800/40',
                      i === AGENT_COST_DATA.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-6 py-4">
                      <span className={cn(
                        'font-mono text-xs font-semibold',
                        row.sessions === 0 ? 'text-slate-500' : 'text-slate-200'
                      )}>
                        {row.agent}
                      </span>
                      {row.sessions === 0 && (
                        <span className="ml-2 text-xs text-slate-600">(inactive)</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-300 font-medium tabular-nums">
                      {row.sessionsDisplay}
                    </td>
                    <td className="px-4 py-4 text-right font-bold tabular-nums">
                      <span className={row.cost === 0 ? 'text-slate-600' : 'text-amber-300'}>
                        {row.costDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-400 tabular-nums">
                      {row.costPer1k}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.trendUp === null ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span className={cn(
                          'text-xs font-bold',
                          row.trendUp ? 'text-rose-400' : 'text-emerald-400'
                        )}>
                          {row.trend}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <p className="text-base text-slate-600 leading-relaxed">Detected 12 attempts to bypass financial advice guardrails using prompt injection techniques from 3 unique IPs in the last 24 hours.</p>
          <div className="mt-3 no-print">
            <button className="px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-sm font-bold transition-all">
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
            <Activity size={20} className="text-slate-400" />
            <span className="text-base font-bold text-slate-900 uppercase tracking-widest">Agent Performance</span>
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Agent</th>
                      <th className="text-center px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Active</th>
                      <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex flex-col">
                          <span>Sessions</span>
                          <span className="text-slate-300 font-normal normal-case tracking-normal">7-day trend</span>
                        </div>
                      </th>
                      <th className="text-right px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Fallback Rate</th>
                      <th className="text-right px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Latency</th>
                      <th className="text-right px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Satisfaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AGENT_PERF_DATA.map((row, i) => (
                      <tr
                        key={row.agent}
                        className={cn(
                          'border-b border-slate-50 transition-colors hover:bg-slate-50/60',
                          i === AGENT_PERF_DATA.length - 1 && 'border-b-0'
                        )}
                      >
                        <td className="px-8 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-700">{row.agent}</span>
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
                              'text-sm font-medium tabular-nums',
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
                              'text-sm font-medium tabular-nums',
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
                <div className="px-8 py-4 border-t border-slate-50 flex flex-wrap gap-4 text-xs text-slate-400">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
          className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all no-print"
        >
          <div className="flex items-center gap-4">
            <Activity size={20} className="text-slate-400" />
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
                    value="32,740"
                    change="+12.5%"
                    trend="up"
                    icon={<MessageSquare size={22} className="text-[#E3000F]" />}
                  />
                  <StatCard
                    title="Active Customers"
                    value="18,210"
                    change="+8.2%"
                    trend="up"
                    icon={<Users size={22} className="text-emerald-600" />}
                  />
                  <StatCard
                    title="Avg Satisfaction"
                    value="91.3%"
                    change="+2.1%"
                    trend="up"
                    icon={<Activity size={22} className="text-indigo-600" />}
                  />
                  <StatCard
                    title="Fallback Rate"
                    value="3.2%"
                    change="-0.8%"
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
                        <AreaChart data={QUERY_DATA}>
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
                            data={INTENT_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {INTENT_DATA.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-3 ml-4">
                        {INTENT_DATA.map((item, i) => (
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
