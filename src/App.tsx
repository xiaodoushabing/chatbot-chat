import React, { useState } from 'react';
import {
  LayoutDashboard,
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
  Search,
  User,
  Activity,
  Users2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import IntentDiscovery from './components/IntentDiscovery';
import ExecutiveDashboard from './components/ExecutiveDashboard';
import ChatbotPreview from './components/ChatbotPreview';
import ActiveIntents from './components/ActiveIntents';
import ActiveAgents from './components/ActiveAgents';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ocbcLogo from './assets/Logo-ocbc.png';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'discovery' | 'dashboard' | 'preview' | 'active-intents' | 'active-agents';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('discovery');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'discovery', label: 'Intent Discovery', icon: <Zap size={20} />, description: 'Automated Knowledge Sync' },
    { id: 'dashboard', label: 'Observability', icon: <Activity size={20} />, description: 'Intelligence & Monitoring' },
    { id: 'preview', label: 'Chatbot Preview', icon: <Bot size={20} />, description: 'Next-Gen Experience' },
    { id: 'active-intents', label: 'Active Intents', icon: <MessageSquare size={20} />, description: 'Manage Live Database' },
    { id: 'active-agents', label: 'Active Agents', icon: <Users2 size={20} />, description: 'Manage AI Agents' },
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
        <div className="h-20 flex items-center px-6 border-b border-slate-100 shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3">
              <img
                src={ocbcLogo}
                alt="OCBC Logo"
                className="h-7 object-contain"
              />
              <div className="flex flex-col border-l-2 border-slate-200 pl-3">
                <span className="font-black text-sm tracking-tight leading-none text-slate-900">AI Admin</span>
                <span className="text-[9px] font-bold text-[#E3000F] uppercase tracking-widest mt-0.5">Suite</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#E3000F] rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-red-200 shrink-0 mx-auto">
              OCBC
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 flex flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "group flex items-center gap-4 p-3 rounded-xl transition-all relative",
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
                  <span className="font-bold text-sm">{item.label}</span>
                  <span className="text-[10px] font-medium opacity-60">{item.description}</span>
                </div>
              )}
              {activeTab === item.id && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-8 bg-[#E3000F] rounded-r-full"
                />
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-100">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100",
            !isSidebarOpen && "justify-center"
          )}>
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-[#E3000F] shrink-0">
              <User size={18} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold truncate">System Admin</span>
                <span className="text-[10px] text-slate-500 truncate">Chatbot Administrator</span>
              </div>
            )}
            {isSidebarOpen && <LogOut size={14} className="ml-auto text-slate-400 hover:text-rose-500 cursor-pointer" />}
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
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <span>Admin</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-bold">
                {navItems.find(n => n.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 group focus-within:ring-2 focus-within:ring-[#E3000F] transition-all">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search intents, logs..."
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl relative transition-all">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#E3000F] rounded-full border-2 border-white" />
              </button>
              <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
                <Settings size={20} />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">System Secure</span>
              </div>
            </div>
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
              {activeTab === 'discovery' && <IntentDiscovery onDeploy={handleDeploySuccess} />}
              {activeTab === 'dashboard' && <ExecutiveDashboard />}
              {activeTab === 'active-intents' && <ActiveIntents />}
              {activeTab === 'active-agents' && <ActiveAgents />}
              {activeTab === 'preview' && (
                <div className="p-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
                  <div className="max-w-md w-full">
                    <div className="mb-8 text-center">
                      <h2 className="text-2xl font-bold text-slate-900">Experience OCBC Next-Gen Banking</h2>
                      <p className="text-slate-500 mt-2">Test the OCBC retirement planner chatbot with real-time dashboard context and life-event awareness.</p>
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
