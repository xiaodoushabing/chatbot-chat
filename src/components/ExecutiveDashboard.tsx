import React from 'react';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  FileSearch, 
  Bell, 
  MoreHorizontal,
  Activity,
  Zap
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
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const QUERY_DATA = [
  { name: 'Mon', queries: 4200, satisfaction: 88 },
  { name: 'Tue', queries: 4800, satisfaction: 91 },
  { name: 'Wed', queries: 5100, satisfaction: 89 },
  { name: 'Thu', queries: 7200, satisfaction: 82 }, // Spike
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
  return (
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">OCBC Executive Performance Suite</h2>
          <p className="text-slate-500">Real-time intelligence and automated risk detection.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button className="px-4 py-2 text-sm font-semibold bg-slate-50 text-slate-900 rounded-lg">Last 7 Days</button>
          <button className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Last 30 Days</button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Deterministic Data (4/12) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              title="Customer Interactions" 
              value="32,740" 
              change="+12.5%" 
              trend="up" 
              icon={<MessageSquare size={20} className="text-[#E3000F]" />} 
            />
            <StatCard 
              title="Active Customers" 
              value="18,210" 
              change="+8.2%" 
              trend="up" 
              icon={<Users size={20} className="text-emerald-600" />} 
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Interaction Volume</h3>
              <TrendingUp size={16} className="text-slate-400" />
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={QUERY_DATA}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E3000F" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#E3000F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="queries" stroke="#E3000F" strokeWidth={3} fillOpacity={1} fill="url(#colorQueries)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Top Intents</h3>
              <Activity size={16} className="text-slate-400" />
            </div>
            <div className="h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={INTENT_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
              <div className="flex flex-col gap-2 ml-4">
                {INTENT_DATA.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-xs font-medium text-slate-600">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI-Driven Analytics (7/12) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap size={120} fill="currentColor" />
            </div>
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-2 px-3 py-1 bg-[#E3000F]/20 border border-[#E3000F]/30 rounded-full w-fit">
                <Zap size={14} className="text-red-400" fill="currentColor" />
                <span className="text-xs font-bold text-red-300 uppercase tracking-wider">OCBC AI Insight Engine</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold">Trending: "OCBC 360 Account Changes"</h3>
                <p className="text-slate-400 max-w-lg">
                  We've detected a 340% spike in queries related to the new OCBC 360 Account interest rate tiers. Customers are specifically asking about "salary credit requirements" and "wealth bonus".
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all">
                  <FileSearch size={18} /> REVIEW 360 POLICY
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all border border-white/10">
                  <Search size={18} /> ANALYZE INTENT TRENDS
                </button>
              </div>
            </div>
          </div>

          {/* Actionable Insights List */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest px-2">Critical Alerts & Suggestions</h3>
            
            <InsightCard 
              type="spike"
              title="Abnormal Query Volume Detected"
              description="Intent 'Housing_Loan_Impact' has seen a 45% increase in the last 4 hours. Current response accuracy is dropping."
              actionLabel="REVIEW THIS INTENT"
              onAction={() => {}}
              icon={<TrendingUp className="text-amber-500" />}
            />

            <InsightCard 
              type="risk"
              title="Potential Malicious Activity"
              description="Detected 12 attempts to bypass financial advice guardrails using prompt injection techniques from 3 unique IPs."
              actionLabel="ALERT TISO"
              variant="danger"
              onAction={() => {}}
              icon={<ShieldAlert className="text-rose-500" />}
            />

            <InsightCard 
              type="opportunity"
              title="New Topic Gaining Trend"
              description="Users are frequently mentioning 'Sustainable Investing' in retirement contexts. No existing intent matches this topic."
              actionLabel="GENERATE NEW INTENT"
              onAction={() => {}}
              icon={<ArrowUpRight className="text-indigo-500" />}
            />
          </div>
        </div>
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
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className={cn(
          "text-xs font-bold flex items-center gap-0.5",
          trend === 'up' ? "text-emerald-600" : "text-rose-600"
        )}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
    </div>
  );
}

function InsightCard({ 
  title, 
  description, 
  actionLabel, 
  onAction, 
  icon, 
  variant = 'default',
  type
}: { 
  title: string; 
  description: string; 
  actionLabel: string; 
  onAction: () => void; 
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  type: string;
}) {
  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className={cn(
        "p-5 rounded-2xl border flex items-start gap-4 transition-all",
        variant === 'danger' ? "bg-rose-50 border-rose-100" : "bg-white border-slate-200 shadow-sm"
      )}
    >
      <div className={cn(
        "p-3 rounded-xl",
        variant === 'danger' ? "bg-rose-100" : "bg-slate-50"
      )}>
        {icon}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{type}</span>
          <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16} /></button>
        </div>
        <h4 className="font-bold text-slate-900">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        <div className="mt-3">
          <button 
            onClick={onAction}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              variant === 'danger' ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
