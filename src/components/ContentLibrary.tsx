import React, { useState } from 'react';
import { Library, FileText, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import TemplateManagement from './TemplateManagement';
import DocumentManagement from './DocumentManagement';
import { PendingApproval, AuditEvent } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SubView = 'templates' | 'documents';

interface ContentLibraryProps {
  onAddApproval: (a: Omit<PendingApproval, 'id' | 'submittedAt' | 'status'>) => void;
  onAddAuditEvent: (e: Omit<AuditEvent, 'id' | 'timestamp'>) => void;
  pendingApprovals: PendingApproval[];
}

export default function ContentLibrary({ onAddApproval, onAddAuditEvent, pendingApprovals }: ContentLibraryProps) {
  const [activeView, setActiveView] = useState<SubView>('templates');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Library size={24} className="text-[#E3000F]" />
          <h1 className="text-2xl font-black text-slate-900">Content Library</h1>
        </div>
        <p className="text-slate-500 text-sm ml-9">Manage response templates and knowledge documents</p>
      </div>

      {/* Sub-view tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveView('templates')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
            activeView === 'templates'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <FileText size={16} />
          Templates
        </button>
        <button
          onClick={() => setActiveView('documents')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
            activeView === 'documents'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Database size={16} />
          Documents
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeView === 'templates' ? <TemplateManagement onAddApproval={onAddApproval} onAddAuditEvent={onAddAuditEvent} /> : <DocumentManagement onAddApproval={onAddApproval} onAddAuditEvent={onAddAuditEvent} pendingApprovals={pendingApprovals} />}
      </motion.div>
    </div>
  );
}
