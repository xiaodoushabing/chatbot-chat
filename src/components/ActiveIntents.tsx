import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  ExternalLink,
  MessageSquare,
  Clock,
  Power,
  PowerOff,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type IntentStatus = 'active' | 'inactive';

interface Intent {
  id: string;
  name: string;
  category: string;
  lastUpdated: string;
  queries: number;
  status: IntentStatus;
}

const INITIAL_INTENTS: Intent[] = [
  { id: '1', name: 'OCBC_360_Salary_Credit', category: 'Accounts', lastUpdated: '2 mins ago', queries: 0, status: 'active' },
  { id: '2', name: 'Home_Loan_Repayment_Impact', category: 'Loans', lastUpdated: '2 mins ago', queries: 0, status: 'active' },
  { id: '3', name: 'OCBC_Life_Goals_Retirement', category: 'Wealth', lastUpdated: '2 mins ago', queries: 0, status: 'active' },
  { id: '4', name: 'Account_Balance_Query', category: 'General', lastUpdated: '2 days ago', queries: 1240, status: 'active' },
  { id: '5', name: 'Card_Replacement', category: 'Services', lastUpdated: '5 days ago', queries: 850, status: 'active' },
  { id: '6', name: 'International_Transfer', category: 'Payments', lastUpdated: '1 week ago', queries: 2100, status: 'active' },
];

export default function ActiveIntents() {
  const [intents, setIntents] = useState<Intent[]>(INITIAL_INTENTS);
  const [editingIntent, setEditingIntent] = useState<Intent | null>(null);

  const handleToggleStatus = (id: string) => {
    setIntents(prev => prev.map(intent => 
      intent.id === id 
        ? { ...intent, status: intent.status === 'active' ? 'inactive' : 'active' } 
        : intent
    ));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this intent?')) {
      setIntents(prev => prev.filter(intent => intent.id !== id));
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIntent) {
      setIntents(prev => prev.map(intent => 
        intent.id === editingIntent.id ? editingIntent : intent
      ));
      setEditingIntent(null);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Active Intent Database</h2>
          <p className="text-slate-500">Manage and monitor all live chatbot intents and their performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter intents..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#E3000F] outline-none transition-all w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Intent Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Queries</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Last Updated</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {intents.map((intent) => (
              <motion.tr 
                key={intent.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-all group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-[#E3000F]">
                      <MessageSquare size={16} />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{intent.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {intent.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", intent.status === 'active' ? "bg-emerald-500" : "bg-slate-400")} />
                    <span className={cn("text-xs font-bold uppercase tracking-wider", intent.status === 'active' ? "text-emerald-700" : "text-slate-500")}>
                      {intent.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-mono text-slate-600">{intent.queries.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock size={14} />
                    <span className="text-xs">{intent.lastUpdated}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => handleToggleStatus(intent.id)}
                      title={intent.status === 'active' ? "Deactivate" : "Activate"}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        intent.status === 'active' ? "hover:bg-amber-50 text-slate-400 hover:text-amber-600" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                      )}
                    >
                      {intent.status === 'active' ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button 
                      onClick={() => setEditingIntent(intent)}
                      title="Edit"
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-[#E3000F] rounded-lg transition-all"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(intent.id)}
                      title="Delete"
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {intents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No active intents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-slate-500">Showing {intents.length} of {intents.length} intents</span>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-bold text-slate-400 cursor-not-allowed">Previous</button>
          <button className="px-4 py-2 text-sm font-bold text-[#E3000F] hover:bg-red-50 rounded-lg transition-all">Next</button>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingIntent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingIntent(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Edit Intent</h3>
                <button 
                  onClick={() => setEditingIntent(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Intent Name</label>
                  <input 
                    type="text" 
                    value={editingIntent.name}
                    onChange={(e) => setEditingIntent({ ...editingIntent, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Category</label>
                  <input 
                    type="text" 
                    value={editingIntent.category}
                    onChange={(e) => setEditingIntent({ ...editingIntent, category: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Status</label>
                  <select 
                    value={editingIntent.status}
                    onChange={(e) => setEditingIntent({ ...editingIntent, status: e.target.value as IntentStatus })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="mt-4 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setEditingIntent(null)}
                    className="px-6 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-2.5 bg-[#E3000F] hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all"
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
