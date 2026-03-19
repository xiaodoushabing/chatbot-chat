import React, { useState } from 'react';
import {
  Search,
  Filter,
  Edit3,
  Trash2,
  MessageSquare,
  X,
  Plus,
  AlertTriangle,
  ShieldCheck,
  Power,
  PowerOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type RiskLevel = 'high' | 'low';

interface Topic {
  id: string;
  name: string;
  queries: number;
  responseMode: 'genai' | 'template';
  riskLevel: RiskLevel;
  status: 'active' | 'inactive';
  utterances: string[];
  response: string;
}

const INITIAL_TOPICS: Topic[] = [
  {
    id: '1', name: 'OCBC_360_Salary_Credit', queries: 1840, responseMode: 'genai', riskLevel: 'low', status: 'active',
    utterances: ['What is the minimum salary credit for OCBC 360?', 'How does salary credit affect my 360 interest?', 'Can I use GIRO for salary credit?'],
    response: 'To earn the Salary bonus interest on your OCBC 360 Account, you need to credit a minimum salary of S$1,800 through GIRO.'
  },
  {
    id: '2', name: 'Home_Loan_Repayment_Impact', queries: 920, responseMode: 'genai', riskLevel: 'high', status: 'active',
    utterances: ['I am getting a new house, how does it affect my savings?', 'Impact of mortgage on OCBC 360 wealth bonus'],
    response: 'Taking up an OCBC Home Loan can help you earn the Wealth bonus on your 360 Account. However, a new mortgage will reduce your monthly disposable income.'
  },
  {
    id: '3', name: 'OCBC_Life_Goals_Retirement', queries: 2310, responseMode: 'genai', riskLevel: 'low', status: 'active',
    utterances: ['How do I set up a retirement goal in OCBC app?', 'OCBC Life Goals retirement calculator'],
    response: 'You can set up a retirement goal using OCBC Life Goals in the OCBC Digital app.'
  },
  {
    id: '4', name: 'Account_Balance_Query', queries: 1240, responseMode: 'genai', riskLevel: 'low', status: 'active',
    utterances: ['What is my account balance?', 'Show me my balance', 'How much money do I have?'],
    response: 'I can help you check your account balance. Please log in to your OCBC Digital app or visit any OCBC ATM.'
  },
  {
    id: '5', name: 'Card_Replacement', queries: 850, responseMode: 'genai', riskLevel: 'low', status: 'active',
    utterances: ['I lost my card', 'How to replace my debit card?', 'My card is damaged'],
    response: 'You can request a card replacement through the OCBC Digital app under Card Services, or visit any OCBC branch.'
  },
  {
    id: '6', name: 'International_Transfer', queries: 2100, responseMode: 'genai', riskLevel: 'high', status: 'active',
    utterances: ['How to send money overseas?', 'International transfer fees', 'Transfer to Malaysia'],
    response: 'You can make international transfers through OCBC Digital app. Fees vary by destination and transfer method.'
  },
];

const RISK_CONFIG = {
  high: { label: 'High Risk', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', hint: 'Sensitive financial topic — template recommended' },
  low: { label: 'Low Risk', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', hint: 'Safe for GenAI responses' },
};

export default function ActiveIntents() {
  const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = topics.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleResponseMode = (id: string) => {
    setTopics(prev => prev.map(t =>
      t.id === id ? { ...t, responseMode: t.responseMode === 'genai' ? 'template' : 'genai' } : t
    ));
  };

  const handleToggleStatus = (id: string) => {
    setTopics(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t
    ));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      setTopics(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTopic) {
      setTopics(prev => prev.map(t => t.id === editingTopic.id ? editingTopic : t));
      setEditingTopic(null);
    }
  };

  const handleRemoveUtterance = (index: number) => {
    if (editingTopic) {
      setEditingTopic({ ...editingTopic, utterances: editingTopic.utterances.filter((_, i) => i !== index) });
    }
  };

  const handleAddUtterance = () => {
    if (editingTopic) {
      setEditingTopic({ ...editingTopic, utterances: [...editingTopic.utterances, ''] });
    }
  };

  const handleUtteranceChange = (index: number, value: string) => {
    if (editingTopic) {
      const newUtterances = [...editingTopic.utterances];
      newUtterances[index] = value;
      setEditingTopic({ ...editingTopic, utterances: newUtterances });
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Active Topics</h2>
          <p className="text-slate-500 text-lg">Manage chatbot topics and response modes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input type="text" placeholder="Filter topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-lg focus:ring-2 focus:ring-[#E3000F] outline-none transition-all w-72" />
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
              <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-widest">Topic</th>
              <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-widest">Risk</th>
              <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-widest">Response Mode</th>
              <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-widest text-center">Queries</th>
              <th className="px-6 py-4 text-base font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTopics.map((topic) => {
              const risk = RISK_CONFIG[topic.riskLevel];
              const RiskIcon = risk.icon;
              return (
              <motion.tr key={topic.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-all group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-[#E3000F]">
                      <MessageSquare size={18} />
                    </div>
                    <span className="font-bold text-slate-900 text-lg">{topic.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border", risk.bg, risk.border)} title={risk.hint}>
                    <RiskIcon size={16} className={risk.color} />
                    <span className={cn("text-sm font-bold", risk.color)}>{risk.label}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <button onClick={() => handleToggleResponseMode(topic.id)}
                    className={cn("relative inline-flex items-center h-9 rounded-full px-1 transition-colors duration-200 w-[8rem]",
                      topic.responseMode === 'genai' ? "bg-indigo-600" : "bg-slate-300")}>
                    <span className={cn("inline-block w-7 h-7 rounded-full bg-white shadow-sm transform transition-transform duration-200",
                      topic.responseMode === 'genai' ? "translate-x-[5.25rem]" : "translate-x-0")} />
                    <span className={cn("absolute text-xs font-bold uppercase tracking-wider",
                      topic.responseMode === 'genai' ? "left-2.5 text-white" : "right-2 text-slate-600")}>
                      {topic.responseMode === 'genai' ? 'GenAI' : 'Template'}
                    </span>
                  </button>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="text-lg font-mono text-slate-600">{topic.queries.toLocaleString()}</span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleToggleStatus(topic.id)}
                      title={topic.status === 'active' ? "Deactivate" : "Activate"}
                      className={cn("p-2.5 rounded-lg transition-all",
                        topic.status === 'active' ? "hover:bg-amber-50 text-slate-400 hover:text-amber-600" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600")}>
                      {topic.status === 'active' ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>
                    <button onClick={() => setEditingTopic({ ...topic })} title="Edit" className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-[#E3000F] rounded-lg transition-all">
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(topic.id)} title="Delete" className="p-2.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </motion.tr>
              );
            })}
            {filteredTopics.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-lg">No topics found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-lg text-slate-500">Showing {filteredTopics.length} of {topics.length} topics</span>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTopic && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingTopic(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Edit Topic</h3>
                <button onClick={() => setEditingTopic(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-bold text-slate-700">Topic Name</label>
                  <input type="text" value={editingTopic.name} onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg outline-none focus:ring-2 focus:ring-[#E3000F]" required />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-bold text-slate-700">Response Mode</label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setEditingTopic({ ...editingTopic, responseMode: 'template' })}
                      className={cn("px-5 py-2.5 rounded-xl text-base font-bold transition-all",
                        editingTopic.responseMode === 'template' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                      Template
                    </button>
                    <button type="button" onClick={() => setEditingTopic({ ...editingTopic, responseMode: 'genai' })}
                      className={cn("px-5 py-2.5 rounded-xl text-base font-bold transition-all",
                        editingTopic.responseMode === 'genai' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                      GenAI
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-lg font-bold text-slate-700">Utterances ({editingTopic.utterances.length})</label>
                    <button type="button" onClick={handleAddUtterance} className="text-base font-bold text-[#E3000F] hover:text-red-700 flex items-center gap-1">
                      <Plus size={16} /> Add
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {editingTopic.utterances.map((utt, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={utt} onChange={(e) => handleUtteranceChange(i, e.target.value)} placeholder="Enter utterance..."
                          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-lg outline-none focus:ring-2 focus:ring-[#E3000F]" />
                        <button type="button" onClick={() => handleRemoveUtterance(i)} className="p-2.5 text-slate-400 hover:text-[#E3000F] transition-colors shrink-0">
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-lg font-bold text-slate-700">Response</label>
                  <textarea value={editingTopic.response} onChange={(e) => setEditingTopic({ ...editingTopic, response: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg outline-none focus:ring-2 focus:ring-[#E3000F] min-h-[120px] resize-y" required />
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingTopic(null)} className="px-6 py-3 font-bold text-slate-600 hover:text-slate-900 transition-all text-lg">Cancel</button>
                  <button type="submit" className="px-8 py-3 bg-[#E3000F] hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all text-lg">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}