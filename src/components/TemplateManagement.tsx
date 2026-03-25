import React, { useState } from 'react';
import {
  Edit3,
  Eye,
  History,
  Power,
  PowerOff,
  Trash2,
  X,
  Clock,
  Plus,
  Check,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TemplateVersion {
  versionNumber: number;
  contentMarkdown: string;
  changedBy: string;
  changedAt: string;
  changeDescription: string;
}

interface Template {
  id: string;
  name: string;
  contentMarkdown: string;
  variables: string[];
  linkedIntents: string[];
  status: 'active' | 'inactive';
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  versions: TemplateVersion[];
  pendingApproval?: boolean;
}

const MOCK_INTENT_OPTIONS = [
  'OCBC_Life_Goals_Retirement',
  'Home_Loan_Repayment_Impact',
  'International_Transfer',
  'Card_Replacement',
  'Investment_Product_Inquiry',
  'OCBC_360_Salary_Credit',
  'Account_Balance_Query',
  'CPF_Retirement_Advisory',
];

const SAMPLE_VARIABLE_VALUES: Record<string, string> = {
  user_name: 'Ahmad Razali',
  cpf_balance: 'S$128,450',
  monthly_repayment: 'S$2,340',
  product_name: 'OCBC 360 Account',
  account_number: '***-***-8821',
  transfer_limit: 'S$50,000',
};

const INITIAL_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'CPF_Life_Standard_Response',
    contentMarkdown:
      'Dear {{user_name}},\n\nThank you for enquiring about CPF LIFE. Based on your current CPF balance of {{cpf_balance}}, you are on track for a comfortable retirement.\n\nCPF LIFE provides lifelong monthly payouts from your payout eligibility age. There are three plans to choose from: Basic, Standard, and Escalating.\n\nOur retirement specialists are available at any OCBC branch to help you make the best choice for your needs.',
    variables: ['user_name', 'cpf_balance'],
    linkedIntents: ['OCBC_Life_Goals_Retirement'],
    status: 'active',
    createdBy: 'Sarah Chen',
    updatedBy: 'Sarah Chen',
    updatedAt: '2026-03-24 14:32',
    versions: [
      {
        versionNumber: 3,
        contentMarkdown: 'Dear {{user_name}}, your CPF balance is {{cpf_balance}}...',
        changedBy: 'Sarah Chen',
        changedAt: '2026-03-24 14:32',
        changeDescription: 'Added CPF LIFE plan options detail',
      },
      {
        versionNumber: 2,
        contentMarkdown: 'Dear {{user_name}}, thank you for enquiring about CPF LIFE...',
        changedBy: 'Admin',
        changedAt: '2026-03-15 10:00',
        changeDescription: 'Tone revision — made warmer',
      },
      {
        versionNumber: 1,
        contentMarkdown: 'CPF LIFE provides lifelong monthly payouts...',
        changedBy: 'Sarah Chen',
        changedAt: '2026-03-01 09:00',
        changeDescription: 'Initial template created',
      },
    ],
  },
  {
    id: '2',
    name: 'Home_Loan_High_Risk_Response',
    contentMarkdown:
      'Thank you for your enquiry about home loan repayment impact.\n\nYour estimated monthly repayment of {{monthly_repayment}} will affect your monthly cash flow. We strongly recommend consulting with an OCBC mortgage specialist before proceeding.\n\nPlease note: This information is provided for general guidance only and does not constitute financial advice.',
    variables: ['monthly_repayment'],
    linkedIntents: ['Home_Loan_Repayment_Impact'],
    status: 'active',
    createdBy: 'Admin',
    updatedBy: 'Admin',
    updatedAt: '2026-03-20 11:15',
    versions: [
      {
        versionNumber: 2,
        contentMarkdown: 'Your estimated monthly repayment of {{monthly_repayment}}...',
        changedBy: 'Admin',
        changedAt: '2026-03-20 11:15',
        changeDescription: 'Added disclaimer for high-risk compliance',
      },
      {
        versionNumber: 1,
        contentMarkdown: 'Home loan repayment impact information...',
        changedBy: 'Admin',
        changedAt: '2026-03-10 09:30',
        changeDescription: 'Initial template created',
      },
    ],
  },
  {
    id: '3',
    name: 'Transfer_Compliance_Response',
    contentMarkdown:
      'International transfers are subject to MAS regulations and OCBC\'s compliance requirements.\n\nYour transfer limit is {{transfer_limit}} per day. All transactions above S$5,000 may require additional documentation under MAS Notice 626.\n\nIMPORTANT NOTICE: OCBC will never ask you to transfer funds to a third-party account for security verification. If you receive such a request, it may be fraudulent. Please contact our fraud hotline immediately at 1800-363-3333.\n\nFor further assistance, please visit any OCBC branch or call our 24/7 customer service.',
    variables: ['transfer_limit'],
    linkedIntents: ['International_Transfer'],
    status: 'active',
    createdBy: 'Compliance Team',
    updatedBy: 'Compliance Team',
    updatedAt: '2026-03-22 16:00',
    versions: [
      {
        versionNumber: 2,
        contentMarkdown: 'International transfers subject to MAS...',
        changedBy: 'Compliance Team',
        changedAt: '2026-03-22 16:00',
        changeDescription: 'Added MAS Notice 626 reference and fraud warning',
      },
      {
        versionNumber: 1,
        contentMarkdown: 'International transfer information...',
        changedBy: 'Admin',
        changedAt: '2026-03-05 10:00',
        changeDescription: 'Initial template created',
      },
    ],
  },
  {
    id: '4',
    name: 'Card_Replacement_Response',
    contentMarkdown:
      'We\'re sorry to hear about your card issue. Here\'s how to get your replacement:\n\n1. **OCBC Digital App**: Go to Card Services → Replace Card → Select reason\n2. **Online Banking**: Log in → Cards → Request Replacement\n3. **Branch Visit**: Bring your NRIC/Passport for same-day replacement\n4. **24/7 Hotline**: Call 1800-363-3333\n\nYour replacement card will arrive within 5–7 business days. Your existing card will be deactivated immediately upon request.',
    variables: [],
    linkedIntents: ['Card_Replacement'],
    status: 'active',
    createdBy: 'Sarah Chen',
    updatedBy: 'Sarah Chen',
    updatedAt: '2026-03-18 09:45',
    versions: [
      {
        versionNumber: 1,
        contentMarkdown: 'Card replacement instructions...',
        changedBy: 'Sarah Chen',
        changedAt: '2026-03-18 09:45',
        changeDescription: 'Initial template created',
      },
    ],
  },
  {
    id: '5',
    name: 'Excluded_Topic_Response',
    contentMarkdown:
      'Thank you for your query. This topic falls outside the scope of our AI assistant\'s current capabilities.\n\nFor personalised advice on investments, insurance, and wealth management, please:\n\n- **Visit any OCBC branch** to speak with a financial advisor\n- **Call us at 1800-363-3333** (24/7)\n- **Book an appointment** at ocbc.com/book-appointment\n\nOur team of specialists is ready to assist you.',
    variables: [],
    linkedIntents: [],
    status: 'active',
    createdBy: 'Admin',
    updatedBy: 'Admin',
    updatedAt: '2026-03-10 08:00',
    versions: [
      {
        versionNumber: 1,
        contentMarkdown: 'This topic is outside our scope...',
        changedBy: 'Admin',
        changedAt: '2026-03-10 08:00',
        changeDescription: 'Initial exclusion response template',
      },
    ],
  },
];

interface ToastMsg {
  id: number;
  message: string;
}

let toastIdCounter = 0;

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

function substituteVariables(content: string): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return SAMPLE_VARIABLE_VALUES[key] ?? `[${key}]`;
  });
}

interface MakerCheckerCallback {
  onPublish: (templateName: string, content: string) => void;
}

interface TemplateManagementProps extends MakerCheckerCallback {}

export default function TemplateManagement({ onPublish }: TemplateManagementProps) {
  const [templates, setTemplates] = useState<Template[]>(INITIAL_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const showToast = (message: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  const filteredTemplates = templates.filter(t => {
    if (!t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const handleToggleStatus = (id: string) => {
    setTemplates(prev =>
      prev.map(t =>
        t.id === id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t
      )
    );
    const tpl = templates.find(t => t.id === id);
    showToast(`Template ${tpl?.status === 'active' ? 'deactivated' : 'activated'}`);
  };

  const handleDelete = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (window.confirm(`Delete template "${tpl?.name}"? This cannot be undone.`)) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      showToast('Template deleted');
    }
  };

  const handleSaveEdit = () => {
    if (!editingTemplate) return;
    setTemplates(prev =>
      prev.map(t =>
        t.id === editingTemplate.id
          ? {
              ...editingTemplate,
              variables: extractVariables(editingTemplate.contentMarkdown),
              updatedAt: '2026-03-26 ' + new Date().toTimeString().slice(0, 5),
              updatedBy: 'System Admin',
            }
          : t
      )
    );
    setEditingTemplate(null);
    showToast('Template saved');
  };

  const handlePublish = () => {
    if (!editingTemplate) return;
    setShowPublishConfirm(true);
  };

  const handleConfirmPublish = () => {
    if (!editingTemplate) return;
    const updated = {
      ...editingTemplate,
      variables: extractVariables(editingTemplate.contentMarkdown),
      updatedAt: '2026-03-26 ' + new Date().toTimeString().slice(0, 5),
      updatedBy: 'System Admin',
      pendingApproval: true,
    };
    setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    onPublish(editingTemplate.name, editingTemplate.contentMarkdown);
    setShowPublishConfirm(false);
    setEditingTemplate(null);
    showToast('Template submitted for approval');
  };

  const handleRestoreVersion = (version: TemplateVersion) => {
    if (!historyTemplate) return;
    if (
      window.confirm(
        `Restore to v${version.versionNumber} from ${version.changedAt}? Current content will be overwritten.`
      )
    ) {
      setTemplates(prev =>
        prev.map(t =>
          t.id === historyTemplate.id
            ? {
                ...t,
                contentMarkdown: version.contentMarkdown,
                variables: extractVariables(version.contentMarkdown),
                updatedAt: '2026-03-26 ' + new Date().toTimeString().slice(0, 5),
                updatedBy: 'System Admin',
              }
            : t
        )
      );
      setHistoryTemplate(null);
      showToast(`Restored to v${version.versionNumber}`);
    }
  };

  const liveVariables = editingTemplate
    ? extractVariables(editingTemplate.contentMarkdown)
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Template Management</h3>
          <p className="text-slate-500 text-sm mt-1">
            Manage static response templates served by the routing engine.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-4 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#E3000F] outline-none transition-all w-56"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => {
              const newTemplate: Template = {
                id: String(Date.now()),
                name: 'New_Template',
                contentMarkdown: '',
                variables: [],
                linkedIntents: [],
                status: 'inactive',
                createdBy: 'System Admin',
                updatedBy: 'System Admin',
                updatedAt: '2026-03-26',
                versions: [],
              };
              setEditingTemplate(newTemplate);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#E3000F] hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-red-200"
          >
            <Plus size={16} />
            New Template
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                Template Name
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                Linked Intents
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                Variables
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                Status
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                Last Updated
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredTemplates.map(tpl => (
                <motion.tr
                  key={tpl.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-all group"
                >
                  {/* Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-[#E3000F] shrink-0">
                        <FileText size={15} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{tpl.name}</span>
                          {tpl.pendingApproval && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-600 text-xs font-bold">
                              <Clock size={10} />
                              Pending
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">by {tpl.updatedBy}</span>
                      </div>
                    </div>
                  </td>

                  {/* Linked Intents */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tpl.linkedIntents.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">None</span>
                      ) : (
                        tpl.linkedIntents.map(intent => (
                          <span
                            key={intent}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium"
                          >
                            {intent}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  {/* Variables */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {tpl.variables.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">None</span>
                      ) : (
                        tpl.variables.map(v => (
                          <span
                            key={v}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-xs font-mono"
                          >
                            {`{{${v}}}`}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold',
                        tpl.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      )}
                    >
                      {tpl.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Last Updated */}
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500">{tpl.updatedAt}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => setEditingTemplate({ ...tpl })}
                        title="Edit"
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-[#E3000F] rounded-lg transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        title="Preview"
                        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => setHistoryTemplate(tpl)}
                        title="Version History"
                        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(tpl.id)}
                        title={tpl.status === 'active' ? 'Deactivate' : 'Activate'}
                        className={cn(
                          'p-2 rounded-lg transition-all',
                          tpl.status === 'active'
                            ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                            : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'
                        )}
                      >
                        {tpl.status === 'active' ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        title="Delete"
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filteredTemplates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                  No templates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <span className="text-sm text-slate-500 px-1">
        Showing {filteredTemplates.length} of {templates.length} templates
      </span>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditingTemplate(null); setShowPublishConfirm(false); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-slate-900">Edit Template</h3>
                <button
                  onClick={() => { setEditingTemplate(null); setShowPublishConfirm(false); }}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {/* Template Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Template Name</label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E3000F]"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">
                    Template Content
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      Use {'{{variable_name}}'} for dynamic substitution
                    </span>
                  </label>
                  <textarea
                    value={editingTemplate.contentMarkdown}
                    onChange={e =>
                      setEditingTemplate({ ...editingTemplate, contentMarkdown: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E3000F] min-h-[200px] resize-y font-mono leading-relaxed"
                    placeholder="Enter template content..."
                  />
                </div>

                {/* Detected Variables */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Detected Variables
                  </label>
                  <div className="flex flex-wrap gap-2 min-h-[32px]">
                    {liveVariables.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        No variables detected — use {'{{variable_name}}'} syntax
                      </span>
                    ) : (
                      liveVariables.map(v => (
                        <span
                          key={v}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-xs font-mono"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Linked Intents */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Linked Intents</label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {MOCK_INTENT_OPTIONS.map(intent => (
                      <label
                        key={intent}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={editingTemplate.linkedIntents.includes(intent)}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...editingTemplate.linkedIntents, intent]
                              : editingTemplate.linkedIntents.filter(i => i !== intent);
                            setEditingTemplate({ ...editingTemplate, linkedIntents: next });
                          }}
                          className="w-4 h-4 accent-[#E3000F] rounded"
                        />
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">
                          {intent}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Status</label>
                  <div className="flex items-center gap-3">
                    {(['active', 'inactive'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditingTemplate({ ...editingTemplate, status: s })}
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm font-bold transition-all',
                          editingTemplate.status === s
                            ? s === 'active'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-500 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        )}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Publish Confirmation inline */}
                <AnimatePresence>
                  {showPublishConfirm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-amber-900">
                              Submit for Checker Approval
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Publishing requires a second actor to approve. The template will be
                              marked as pending until approved. It will not go live until approved.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => setShowPublishConfirm(false)}
                            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmPublish}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all"
                          >
                            <Check size={14} />
                            Submit for Approval
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => { setEditingTemplate(null); setShowPublishConfirm(false); }}
                  className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={showPublishConfirm}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check size={14} />
                  Publish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewTemplate(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Template Preview</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{previewTemplate.name}</p>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-50">
                {/* Chat bubble */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-[#E3000F] rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-black">O</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600">OCBC Assistant</span>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-none shadow-sm border border-slate-200 p-4 max-w-[90%]">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {substituteVariables(previewTemplate.contentMarkdown)}
                    </p>
                  </div>
                </div>

                {/* Variable legend */}
                {previewTemplate.variables.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                    <p className="text-xs font-bold text-violet-700 uppercase tracking-widest">
                      Sample Values Used
                    </p>
                    {previewTemplate.variables.map(v => (
                      <div key={v} className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-violet-600">{`{{${v}}}`}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-medium text-slate-700">
                          {SAMPLE_VARIABLE_VALUES[v] ?? `[${v}]`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Version History Side Panel */}
      <AnimatePresence>
        {historyTemplate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryTemplate(null)}
              className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[100] w-96 bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Version History</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[250px]">
                    {historyTemplate.name}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryTemplate(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                {historyTemplate.versions.map((version, i) => (
                  <motion.div
                    key={version.versionNumber}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex flex-col gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            v{version.versionNumber}
                          </span>
                          {i === 0 && (
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-800">
                          {version.changeDescription}
                        </span>
                        <span className="text-xs text-slate-500">{version.changedBy}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{version.changedAt}</span>
                    </div>

                    <div className="p-2 bg-white border border-slate-100 rounded-lg">
                      <p className="text-xs text-slate-500 font-mono line-clamp-3">
                        {version.contentMarkdown}
                      </p>
                    </div>

                    {i !== 0 && (
                      <button
                        onClick={() => handleRestoreVersion(version)}
                        className="self-start flex items-center gap-1.5 text-xs font-bold text-[#E3000F] hover:text-red-700 border border-[#E3000F] rounded-lg px-3 py-1.5 hover:bg-red-50 transition-all"
                      >
                        <RotateCcw size={11} />
                        Restore
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-2xl whitespace-nowrap"
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
