import React, { useState } from 'react';
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
  AlertTriangle
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
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export default function ExecutiveDashboard() {
  const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Observability</h2>
          <p className="text-slate-500 text-base">Real-time intelligence, guardrail monitoring, and automated risk detection.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button className="px-5 py-2.5 text-sm font-semibold bg-slate-50 text-slate-900 rounded-lg">Last 7 Days</button>
          <button className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700">Last 30 Days</button>
        </div>
      </div>

      {/* OCBC AI Insight Engine - Trending (Full Width, Hero) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-10 text-white relative overflow-hidden">
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
            <h3 className="text-3xl font-black leading-tight">Trending: "OCBC 360 Account Changes"</h3>
            <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
              340% spike in queries about new OCBC 360 interest rate tiers. Customers asking about <span className="text-white font-semibold">"salary credit requirements"</span> and <span className="text-white font-semibold">"wealth bonus"</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 mt-2">
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-base hover:bg-slate-100 transition-all shadow-lg">
              <FileSearch size={20} /> Review 360 Policy
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
        className="p-8 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 shadow-lg shadow-indigo-100/50 flex flex-col md:flex-row items-start md:items-center gap-6"
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
        <div className="flex flex-col gap-3 shrink-0">
          <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
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
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl p-8 text-white">
          <div className="absolute top-0 right-0 opacity-10">
            <Brain size={160} />
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Brain size={24} />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-100">LLM Guardrail</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-black leading-none">247</span>
              <span className="text-lg font-semibold text-emerald-200 pb-1">hallucinations caught</span>
            </div>
            <p className="text-base text-emerald-100 leading-relaxed">
              Deterministic fact-checking layer intercepted 247 inaccurate responses this week before they reached customers.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <Eye size={16} />
                <span className="text-sm font-bold">0.75% Caught</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <Activity size={16} />
                <span className="text-sm font-bold">-12% vs Last Period</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Injection Shield */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-violet-700 rounded-3xl p-8 text-white">
          <div className="absolute top-0 right-0 opacity-10">
            <ShieldCheck size={160} />
          </div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <ShieldCheck size={24} />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest text-violet-100">Security Guardrail</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-black leading-none">89</span>
              <span className="text-lg font-semibold text-violet-200 pb-1">injection attacks blocked</span>
            </div>
            <p className="text-base text-violet-100 leading-relaxed">
              Prompt injection detection shielded the chatbot from 89 adversarial attempts across 12 unique threat vectors.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <AlertTriangle size={16} />
                <span className="text-sm font-bold">2.4% Caught</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/15 rounded-xl">
                <ShieldAlert size={16} />
                <span className="text-sm font-bold">+8% vs Last Period</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Alert */}
      <motion.div
        whileHover={{ scale: 1.005 }}
        className="p-6 rounded-2xl border border-rose-200 bg-rose-50 flex items-start gap-5"
      >
        <div className="p-3.5 rounded-xl bg-rose-100 shrink-0">
          <ShieldAlert size={24} className="text-rose-600" />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-rose-500 uppercase tracking-widest">Risk</span>
            <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={18} /></button>
          </div>
          <h4 className="text-lg font-bold text-slate-900">Potential Malicious Activity</h4>
          <p className="text-base text-slate-600 leading-relaxed">Detected 12 attempts to bypass financial advice guardrails using prompt injection techniques from 3 unique IPs in the last 24 hours.</p>
          <div className="mt-3">
            <button className="px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl text-sm font-bold transition-all">
              Alert TISO
            </button>
          </div>
        </div>
      </motion.div>

      {/* Detailed Analytics - Collapsible */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
          className="w-full px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-all"
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
