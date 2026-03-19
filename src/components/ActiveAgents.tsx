import React, { useState } from 'react';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  Clock,
  Power,
  PowerOff,
  X,
  Bot,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AgentStatus = 'active' | 'inactive';

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  lastUpdated: string;
  sessionsHandled: number;
  status: AgentStatus;
}

const INITIAL_AGENTS: Agent[] = [
  { id: '1', name: 'Retirement_Planner_Agent', description: 'Handles retirement planning queries, CPF projections, and life-event impact analysis.', category: 'Wealth', lastUpdated: '1 hour ago', sessionsHandled: 3420, status: 'active' },
  { id: '2', name: 'Account_Enquiry_Agent', description: 'Resolves balance checks, transaction history, and account-related FAQs.', category: 'General', lastUpdated: '30 mins ago', sessionsHandled: 8900, status: 'active' },
  { id: '3', name: 'Loan_Advisory_Agent', description: 'Provides home loan, personal loan, and refinancing guidance with affordability checks.', category: 'Loans', lastUpdated: '2 hours ago', sessionsHandled: 2150, status: 'active' },
  { id: '4', name: 'Card_Services_Agent', description: 'Manages card replacement, activation, limit adjustments, and dispute resolution.', category: 'Services', lastUpdated: '3 hours ago', sessionsHandled: 1870, status: 'active' },
  { id: '5', name: 'Investment_Insights_Agent', description: 'Delivers market insights, portfolio recommendations, and sustainable investing guidance.', category: 'Wealth', lastUpdated: '1 day ago', sessionsHandled: 980, status: 'inactive' },
  { id: '6', name: 'Fraud_Detection_Agent', description: 'Monitors conversations for prompt injection, social engineering, and suspicious activity patterns.', category: 'Security', lastUpdated: '5 mins ago', sessionsHandled: 12400, status: 'active' },
];

export default function ActiveAgents() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = (id: string) => {
    setAgents(prev => prev.map(agent =>
      agent.id === id
        ? { ...agent, status: agent.status === 'active' ? 'inactive' : 'active' }
        : agent
    ));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this agent?')) {
      setAgents(prev => prev.filter(agent => agent.id !== id));
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgent) {
      setAgents(prev => prev.map(agent =>
        agent.id === editingAgent.id ? editingAgent : agent
      ));
      setEditingAgent(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Active Agents</h2>
          <p className="text-slate-500 text-base">Manage AI agents available for this chatbot instance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Filter agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-[#E3000F] outline-none transition-all w-72"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all">
            <Filter size={22} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Agent Name</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest text-center">Sessions</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Last Active</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgents.map((agent) => (
              <motion.tr
                key={agent.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-all group"
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-[#E3000F]">
                      <Bot size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 text-base">{agent.name}</span>
                      <span className="text-sm text-slate-500 max-w-xs truncate">{agent.description}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                    {agent.category}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", agent.status === 'active' ? "bg-emerald-500" : "bg-slate-400")} />
                    <span className={cn("text-sm font-bold uppercase tracking-wider", agent.status === 'active' ? "text-emerald-700" : "text-slate-500")}>
                      {agent.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="text-base font-mono text-slate-600">{agent.sessionsHandled.toLocaleString()}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={16} />
                    <span className="text-sm">{agent.lastUpdated}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleToggleStatus(agent.id)}
                      title={agent.status === 'active' ? "Deactivate" : "Activate"}
                      className={cn(
                        "p-2.5 rounded-lg transition-all",
                        agent.status === 'active' ? "hover:bg-amber-50 text-slate-400 hover:text-amber-600" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                      )}
                    >
                      {agent.status === 'active' ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>
                    <button
                      onClick={() => setEditingAgent(agent)}
                      title="Edit"
                      className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-[#E3000F] rounded-lg transition-all"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      title="Delete"
                      className="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filteredAgents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-base">
                  No agents configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-base text-slate-500">Showing {filteredAgents.length} of {agents.length} agents</span>
        <div className="flex gap-2">
          <button className="px-5 py-2.5 text-base font-bold text-slate-400 cursor-not-allowed">Previous</button>
          <button className="px-5 py-2.5 text-base font-bold text-[#E3000F] hover:bg-red-50 rounded-lg transition-all">Next</button>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingAgent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAgent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Edit Agent</h3>
                <button
                  onClick={() => setEditingAgent(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-700">Agent Name</label>
                  <input
                    type="text"
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-[#E3000F]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-700">Description</label>
                  <textarea
                    value={editingAgent.description}
                    onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-[#E3000F] min-h-[80px] resize-y"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-700">Category</label>
                  <input
                    type="text"
                    value={editingAgent.category}
                    onChange={(e) => setEditingAgent({ ...editingAgent, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-[#E3000F]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-base font-bold text-slate-700">Status</label>
                  <select
                    value={editingAgent.status}
                    onChange={(e) => setEditingAgent({ ...editingAgent, status: e.target.value as AgentStatus })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:ring-2 focus:ring-[#E3000F]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingAgent(null)}
                    className="px-6 py-3 font-bold text-slate-600 hover:text-slate-900 transition-all text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#E3000F] hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all text-base"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
