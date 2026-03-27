import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Trash2,
  X,
  Upload,
  Database,
  FileText,
  Globe,
  File,
  CheckCircle,
  Clock,
  AlertCircle,
  Tag,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PendingApproval, AuditEvent, AuditActionType } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type FileType = 'pdf' | 'docx' | 'txt' | 'url';
type IndexedStatus = 'pending' | 'indexed' | 'failed' | 'stale';

interface KnowledgeDocument {
  id: string;
  filename: string;
  fileType: FileType;
  uploader: string;
  uploadedAt: string;
  domains: string[];
  indexedStatus: IndexedStatus;
  lastIndexedAt?: string;
  providerUsed: string;
  isActive: boolean;
  fileSizeKb: number;
  chunkCount?: number;
  pendingApproval?: boolean;
}

interface ActivityLogEntry {
  documentName: string;
  timestamp: string;
  result: 'success' | 'failed';
  detail: string;
}

const DOMAIN_OPTIONS = ['Retirement Planning', 'Home Loans', 'Card Services', 'Compliance'];

const DOCUMENT_LINKS: Record<string, string> = {
  'OCBC_CPF_Life_Product_Guide.pdf': 'https://www.ocbc.com/personal-banking/insurance/cpf-life',
  'OCBC_Home_Loan_Policy_2025.docx': 'https://www.ocbc.com/personal-banking/loans/home-loans',
  'OCBC_Card_Services_FAQ.pdf': 'https://www.ocbc.com/personal-banking/cards',
  'OCBC_360_Account_Handbook.pdf': 'https://www.ocbc.com/personal-banking/deposits/360-account',
  'OCBC_Wealth_Advisory_Guidelines.pdf': 'https://www.ocbc.com/personal-banking/investments',
};

const INITIAL_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: '1',
    filename: 'OCBC_CPF_Life_Product_Guide.pdf',
    fileType: 'pdf',
    uploader: 'Sarah Chen',
    uploadedAt: '2026-03-10 09:00',
    domains: ['Retirement Planning'],
    indexedStatus: 'indexed',
    lastIndexedAt: '2026-03-10 09:45',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 2840,
    chunkCount: 47,
  },
  {
    id: '2',
    filename: 'OCBC_Home_Loan_Policy_2025.docx',
    fileType: 'docx',
    uploader: 'Admin',
    uploadedAt: '2026-03-12 14:30',
    domains: ['Home Loans'],
    indexedStatus: 'indexed',
    lastIndexedAt: '2026-03-12 15:00',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 1120,
    chunkCount: 31,
  },
  {
    id: '3',
    filename: 'OCBC_Card_Services_FAQ.pdf',
    fileType: 'pdf',
    uploader: 'Sarah Chen',
    uploadedAt: '2026-03-14 11:15',
    domains: ['Card Services'],
    indexedStatus: 'indexed',
    lastIndexedAt: '2026-03-14 11:50',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 980,
    chunkCount: 22,
  },
  {
    id: '4',
    filename: 'CPF_Retirement_Sum_Schemes.pdf',
    fileType: 'pdf',
    uploader: 'Admin',
    uploadedAt: '2026-02-20 10:00',
    domains: ['Retirement Planning'],
    indexedStatus: 'stale',
    lastIndexedAt: '2026-02-20 10:35',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 3200,
    chunkCount: 58,
  },
  {
    id: '5',
    filename: 'International_Transfer_Compliance.docx',
    fileType: 'docx',
    uploader: 'Compliance Team',
    uploadedAt: '2026-03-18 16:00',
    domains: ['Compliance'],
    indexedStatus: 'indexed',
    lastIndexedAt: '2026-03-18 16:30',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 760,
    chunkCount: 18,
  },
  {
    id: '6',
    filename: 'OCBC_360_Account_Handbook.pdf',
    fileType: 'pdf',
    uploader: 'Sarah Chen',
    uploadedAt: '2026-03-26 08:00',
    domains: ['Retirement Planning', 'Card Services'],
    indexedStatus: 'pending',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 1650,
  },
  {
    id: '7',
    filename: 'https://www.ocbc.com/personal-banking/investments/cpf',
    fileType: 'url',
    uploader: 'Admin',
    uploadedAt: '2026-03-22 09:30',
    domains: ['Retirement Planning'],
    indexedStatus: 'failed',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 0,
  },
  {
    id: '8',
    filename: 'OCBC_Wealth_Advisory_Guidelines.pdf',
    fileType: 'pdf',
    uploader: 'Admin',
    uploadedAt: '2026-03-05 13:00',
    domains: ['Retirement Planning'],
    indexedStatus: 'indexed',
    lastIndexedAt: '2026-03-05 13:40',
    providerUsed: 'External ES Hub',
    isActive: true,
    fileSizeKb: 4100,
    chunkCount: 55,
  },
];

const ACTIVITY_LOG: ActivityLogEntry[] = [
  {
    documentName: 'OCBC_360_Account_Handbook.pdf',
    timestamp: '2026-03-26 08:12',
    result: 'success',
    detail: 'Ingestion queued — awaiting chunk processing',
  },
  {
    documentName: 'https://www.ocbc.com/personal-banking/investments/cpf',
    timestamp: '2026-03-22 09:45',
    result: 'failed',
    detail: 'URL fetch timeout after 30s',
  },
  {
    documentName: 'International_Transfer_Compliance.docx',
    timestamp: '2026-03-18 16:30',
    result: 'success',
    detail: '18 chunks indexed successfully',
  },
  {
    documentName: 'OCBC_Card_Services_FAQ.pdf',
    timestamp: '2026-03-14 11:50',
    result: 'success',
    detail: '22 chunks indexed successfully',
  },
  {
    documentName: 'OCBC_Home_Loan_Policy_2025.docx',
    timestamp: '2026-03-12 15:00',
    result: 'success',
    detail: '31 chunks indexed successfully',
  },
];

interface ToastMsg {
  id: number;
  message: string;
}

let toastIdCounter = 0;

const STATUS_CONFIG: Record<
  IndexedStatus,
  { label: string; bgClass: string; textClass: string; borderClass: string; pulse?: boolean }
> = {
  indexed: {
    label: 'Indexed',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
  },
  pending: {
    label: 'Pending',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    pulse: true,
  },
  failed: {
    label: 'Failed',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  stale: {
    label: 'Stale',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-200',
  },
};

const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
  pdf: <FileText size={18} className="text-red-500" />,
  docx: <File size={18} className="text-blue-500" />,
  txt: <FileText size={18} className="text-slate-400" />,
  url: <Globe size={18} className="text-emerald-500" />,
};

function formatFileSize(kb: number): string {
  if (kb === 0) return '—';
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

interface DocumentManagementProps {
  onAddApproval: (a: Omit<PendingApproval, 'id' | 'submittedAt' | 'status'>) => void;
  onAddAuditEvent: (e: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
  pendingApprovals: PendingApproval[];
}

export default function DocumentManagement({ onAddApproval, onAddAuditEvent, pendingApprovals }: DocumentManagementProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(INITIAL_DOCUMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | IndexedStatus>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showFullReindexConfirm, setShowFullReindexConfirm] = useState(false);

  // Collapsible right panel sections (collapsed by default)
  const [showIndexingHub, setShowIndexingHub] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [showDomainTags, setShowDomainTags] = useState(false);

  // Approval persistence
  const appliedApprovalIds = useRef<Set<string>>(new Set());

  // Upload form state
  const [uploadFile, setUploadFile] = useState<string>('');
  const [uploadType, setUploadType] = useState<FileType>('pdf');
  const [uploadDomains, setUploadDomains] = useState<string[]>([]);

  // Apply approved/rejected changes
  useEffect(() => {
    pendingApprovals.forEach(ap => {
      if (appliedApprovalIds.current.has(ap.id)) return;
      if (ap.status === 'approved') {
        appliedApprovalIds.current.add(ap.id);
        const p = ap.payload;
        if (!p) return;
        if (ap.actionType === 'document.reindex' && p.docId) {
          setDocuments(prev => prev.map(d =>
            d.id === p.docId ? { ...d, indexedStatus: 'pending', pendingApproval: false } : d
          ));
        } else if (ap.actionType === 'document.delete' && p.docId) {
          setDocuments(prev => prev.filter(d => d.id !== p.docId));
        } else if (ap.actionType === 'document.full_reindex') {
          setDocuments(prev => prev.map(d =>
            d.indexedStatus === 'stale' || d.indexedStatus === 'failed'
              ? { ...d, indexedStatus: 'pending', pendingApproval: false }
              : d
          ));
        }
      } else if (ap.status === 'rejected') {
        appliedApprovalIds.current.add(ap.id);
        const p = ap.payload;
        if (!p) return;
        if ((ap.actionType === 'document.reindex' || ap.actionType === 'document.delete') && p.docId) {
          setDocuments(prev => prev.map(d =>
            d.id === p.docId ? { ...d, pendingApproval: false } : d
          ));
        }
      }
    });
  }, [pendingApprovals]);

  const showToast = (message: string) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  };

  const filteredDocuments = documents.filter(d => {
    const searchTarget = d.filename.toLowerCase();
    if (!searchTarget.includes(searchQuery.toLowerCase())) return false;
    if (filterDomain !== 'all' && !d.domains.includes(filterDomain)) return false;
    if (filterStatus !== 'all' && d.indexedStatus !== filterStatus) return false;
    return true;
  });

  const handleReindex = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    onAddApproval({
      actionType: 'document.reindex',
      entityName: doc.filename,
      entityId: id,
      description: `Re-index document: ${doc.filename}`,
      detail: 'Document will be re-queued for chunk processing upon approval.',
      submittedBy: 'System Admin',
      payload: { docId: id },
    });
    onAddAuditEvent({
      actor: 'System Admin',
      actorRole: 'ADMIN',
      actionType: 'approval.submit' as AuditActionType,
      entityType: 'document',
      entityId: 'doc-reindex-' + id,
      entityName: doc.filename,
      description: `Re-index submitted for approval: ${doc.filename}`,
      severity: 'info',
    });
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, pendingApproval: true } : d));
    showToast('Re-index submitted for approval');
  };

  const handleRemove = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    const id = deleteConfirmId;
    if (!id) return;
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    onAddApproval({
      actionType: 'document.delete',
      entityName: doc.filename,
      entityId: id,
      description: `Delete document: ${doc.filename}`,
      detail: 'Document will be deactivated and de-indexed upon approval.',
      submittedBy: 'System Admin',
      payload: { docId: id },
    });
    onAddAuditEvent({
      actor: 'System Admin',
      actorRole: 'ADMIN',
      actionType: 'approval.submit' as AuditActionType,
      entityType: 'document',
      entityId: 'doc-delete-' + id,
      entityName: doc.filename,
      description: `Document deletion submitted for approval: ${doc.filename}`,
      severity: 'warning',
    });
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, pendingApproval: true } : d));
    setDeleteConfirmId(null);
    showToast('Deletion submitted for approval');
  };

  const handleUpload = () => {
    if (!uploadFile.trim()) return;
    setIsUploading(true);
    setTimeout(() => {
      const newDoc: KnowledgeDocument = {
        id: String(Date.now()),
        filename: uploadFile,
        fileType: uploadType,
        uploader: 'System Admin',
        uploadedAt: '2026-03-26 ' + new Date().toTimeString().slice(0, 5),
        domains: uploadDomains,
        indexedStatus: 'pending',
        providerUsed: 'External ES Hub',
        isActive: true,
        fileSizeKb: Math.floor(Math.random() * 2000) + 500,
      };
      setDocuments(prev => [newDoc, ...prev]);
      setIsUploading(false);
      setShowUploadModal(false);
      setUploadFile('');
      setUploadType('pdf');
      setUploadDomains([]);
      showToast('Document uploaded — indexing queued');
    }, 1500);
  };

  const handleTriggerFullReindex = () => {
    onAddApproval({
      actionType: 'document.full_reindex',
      entityName: 'Knowledge Base',
      entityId: 'full-reindex',
      description: 'Trigger full re-index for all stale and failed documents',
      detail: 'All stale/failed documents will be re-queued for chunk processing upon approval.',
      submittedBy: 'System Admin',
      payload: { type: 'full_reindex' },
    });
    onAddAuditEvent({
      actor: 'System Admin',
      actorRole: 'ADMIN',
      actionType: 'approval.submit' as AuditActionType,
      entityType: 'document',
      entityId: 'full-reindex-' + Date.now(),
      entityName: 'Knowledge Base',
      description: 'Full re-index submitted for approval.',
      severity: 'warning',
    });
    setShowFullReindexConfirm(false);
    showToast('Full re-index submitted for approval');
  };

  const pendingCount = documents.filter(d => d.indexedStatus === 'pending').length;
  const indexedCount = documents.filter(d => d.indexedStatus === 'indexed').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Document Management</h3>
          <p className="text-slate-500 text-sm mt-1">
            Manage knowledge documents that feed the semantic search and RAG layers.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-emerald-200"
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      <div className="flex gap-6">
        {/* Left Panel — Document List (60%) */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Search + Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#E3000F] outline-none transition-all"
              />
            </div>
            <select
              value={filterDomain}
              onChange={e => setFilterDomain(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
            >
              <option value="all">All Domains</option>
              {DOMAIN_OPTIONS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[#E3000F] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="indexed">Indexed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="stale">Stale</option>
            </select>
          </div>

          {/* Document Cards */}
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {filteredDocuments.map(doc => {
                const statusCfg = STATUS_CONFIG[doc.indexedStatus];
                const isExpanded = expandedDocId === doc.id;

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* File Icon */}
                      <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        {FILE_TYPE_ICONS[doc.fileType]}
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 justify-between">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {doc.fileType === 'url' ? (
                                <a
                                  href={doc.filename}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-blue-600 hover:text-blue-800 text-sm truncate underline underline-offset-2"
                                  title={doc.filename}
                                >
                                  {doc.filename}
                                </a>
                              ) : (
                                <span
                                  className="font-bold text-slate-900 text-sm truncate"
                                  title={doc.filename}
                                >
                                  {doc.filename}
                                </span>
                              )}
                              {DOCUMENT_LINKS[doc.filename] && (
                                <a
                                  href={DOCUMENT_LINKS[doc.filename]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-slate-400 hover:text-[#E3000F] transition-colors"
                                  title="View on OCBC website"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-400">
                                {doc.uploader} · {doc.uploadedAt}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatFileSize(doc.fileSizeKb)}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 flex items-center gap-2">
                            <div
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold',
                                statusCfg.bgClass,
                                statusCfg.textClass,
                                statusCfg.borderClass
                              )}
                            >
                              {doc.indexedStatus === 'indexed' && <CheckCircle size={11} />}
                              {doc.indexedStatus === 'pending' && (
                                <motion.span
                                  animate={{ opacity: [1, 0.3, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.4 }}
                                  className="inline-block"
                                >
                                  <Clock size={11} />
                                </motion.span>
                              )}
                              {doc.indexedStatus === 'failed' && <AlertCircle size={11} />}
                              {doc.indexedStatus === 'stale' && <RefreshCw size={11} />}
                              {statusCfg.label}
                            </div>
                          </div>
                        </div>

                        {/* Domains + Chunk count */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {doc.domains.map(domain => (
                            <span
                              key={domain}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium"
                            >
                              <Tag size={9} />
                              {domain}
                            </span>
                          ))}
                          {doc.chunkCount !== undefined && (
                            <span className="text-xs text-slate-400 font-medium">
                              {doc.chunkCount} chunks
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.pendingApproval ? (
                          <span className="text-xs text-amber-600 font-bold px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg">Pending</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReindex(doc.id)}
                              title="Submit Re-index for Approval"
                              className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-all"
                            >
                              <RefreshCw size={15} />
                            </button>
                            <button
                              onClick={() => handleRemove(doc.id)}
                              title="Submit Deletion for Approval"
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                          title="Details"
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                        >
                          <ChevronDown
                            size={15}
                            className={cn('transition-transform', isExpanded && 'rotate-180')}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 font-medium">Provider</span>
                              <p className="font-bold text-slate-700 mt-0.5">{doc.providerUsed}</p>
                            </div>
                            {doc.lastIndexedAt && (
                              <div>
                                <span className="text-slate-400 font-medium">Last Indexed</span>
                                <p className="font-bold text-slate-700 mt-0.5">{doc.lastIndexedAt}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-400 font-medium">File Type</span>
                              <p className="font-bold text-slate-700 mt-0.5 uppercase">{doc.fileType}</p>
                            </div>
                            {doc.indexedStatus === 'failed' && (
                              <div className="col-span-2">
                                <span className="text-red-500 font-medium">Error</span>
                                <p className="font-medium text-red-600 mt-0.5">
                                  URL fetch timeout — check network connectivity or try a different URL.
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredDocuments.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-2xl">
                No documents match your filters.
              </div>
            )}
          </div>

          <span className="text-xs text-slate-400 px-1">
            Showing {filteredDocuments.length} of {documents.length} documents
          </span>
        </div>

        {/* Right Panel — Indexing Hub (40%) */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          {/* Hub Status Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowIndexingHub(!showIndexingHub)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-2">
                <Database size={16} className="text-slate-600" />
                <h4 className="font-bold text-slate-900 text-sm">Indexing Hub</h4>
              </div>
              <ChevronDown size={15} className={cn('text-slate-400 transition-transform', showIndexingHub && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {showIndexingHub && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-100">
                    {/* Provider Badge */}
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl mt-4">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-sm font-bold text-slate-700">External ES Hub</span>
                      <span className="ml-auto text-xs font-medium text-emerald-600">Online</span>
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Queue depth</span>
                        <span className="text-sm font-bold text-amber-600">{pendingCount} pending</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Last successful run</span>
                        <span className="text-sm font-bold text-slate-700">2 minutes ago</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-slate-500 font-medium">Total indexed</span>
                        <span className="text-sm font-bold text-slate-700">{indexedCount + 150} documents</span>
                      </div>
                    </div>
                    {/* Trigger Re-index */}
                    <button
                      onClick={() => setShowFullReindexConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 w-full justify-center border border-amber-300 text-amber-700 font-bold rounded-xl text-sm hover:bg-amber-50 transition-all"
                    >
                      <RefreshCw size={14} />
                      Trigger Full Re-index
                    </button>
                    {/* Reindex Approval Confirmation */}
                    <AnimatePresence>
                      {showFullReindexConfirm && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2">
                            <p className="text-xs font-bold text-amber-900">Submit full re-index for approval?</p>
                            <p className="text-xs text-amber-700">All stale/failed documents will be re-queued upon checker approval.</p>
                            <div className="flex gap-2">
                              <button onClick={() => setShowFullReindexConfirm(false)} className="flex-1 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-all">Cancel</button>
                              <button onClick={handleTriggerFullReindex} className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all">Submit</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Domain Tag Management */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowDomainTags(!showDomainTags)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
            >
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Tag size={14} className="text-slate-500" />
                Domain Tags
              </h4>
              <ChevronDown size={15} className={cn('text-slate-400 transition-transform', showDomainTags && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {showDomainTags && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-5 pb-5 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    {DOMAIN_OPTIONS.map(domain => {
                      const count = documents.filter(d => d.domains.includes(domain)).length;
                      return (
                        <div key={domain} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-xs font-medium text-slate-700">{domain}</span>
                          <span className="text-xs font-bold text-slate-400">{count} docs</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Activity Log */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowRecentActivity(!showRecentActivity)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-all"
            >
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock size={14} className="text-slate-500" />
                Recent Activity
              </h4>
              <ChevronDown size={15} className={cn('text-slate-400 transition-transform', showRecentActivity && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {showRecentActivity && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="px-5 pb-5 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    {ACTIVITY_LOG.map((entry, i) => (
                      <div key={i} className="flex flex-col gap-0.5 py-2 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', entry.result === 'success' ? 'bg-emerald-500' : 'bg-red-500')} />
                          <span className="text-xs font-bold text-slate-700 truncate" title={entry.documentName}>
                            {entry.documentName.length > 32 ? entry.documentName.slice(0, 32) + '…' : entry.documentName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 pl-3.5">{entry.detail}</p>
                        <span className="text-xs text-slate-300 pl-3.5">{entry.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirmId && (() => {
          const doc = documents.find(d => d.id === deleteConfirmId);
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <Trash2 size={20} className="text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Remove Document</h3>
                  </div>
                  <button onClick={() => setDeleteConfirmId(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <p className="text-sm text-slate-600">Submit removal of <span className="font-bold text-slate-900">"{doc?.filename}"</span> for checker approval? The document will be deactivated and de-indexed upon approval.</p>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button onClick={() => setDeleteConfirmId(null)} className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 text-sm">Cancel</button>
                    <button onClick={handleConfirmDelete} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-200">
                      <Trash2 size={15} />
                      Submit for Approval
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUploading && setShowUploadModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Upload Document</h3>
                <button
                  onClick={() => !isUploading && setShowUploadModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  disabled={isUploading}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5">
                {/* Drag-drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) setUploadFile(file.name);
                  }}
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-all cursor-pointer',
                    dragOver
                      ? 'border-[#E3000F] bg-red-50'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  )}
                >
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Upload size={22} className="text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">
                      Drag and drop a file here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">or enter a filename / URL below</p>
                  </div>
                </div>

                {/* File Name / URL */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Filename or URL</label>
                  <input
                    type="text"
                    placeholder="e.g. OCBC_Guide.pdf or https://..."
                    value={uploadFile}
                    onChange={e => setUploadFile(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#E3000F]"
                  />
                </div>

                {/* File Type */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">File Type</label>
                  <div className="flex items-center gap-2">
                    {(['pdf', 'docx', 'txt', 'url'] as FileType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setUploadType(type)}
                        className={cn(
                          'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all',
                          uploadType === type
                            ? 'bg-[#E3000F] text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Domains */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Domains</label>
                  <div className="flex flex-wrap gap-2">
                    {DOMAIN_OPTIONS.map(domain => (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => {
                          setUploadDomains(prev =>
                            prev.includes(domain)
                              ? prev.filter(d => d !== domain)
                              : [...prev, domain]
                          );
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                          uploadDomains.includes(domain)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        )}
                      >
                        {domain}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    disabled={isUploading}
                    className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 transition-all text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading || !uploadFile.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="inline-block"
                        >
                          <RefreshCw size={14} />
                        </motion.span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
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
