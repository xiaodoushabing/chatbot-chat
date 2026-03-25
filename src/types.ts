export type ApprovalActionType =
  | 'intent.toggle_status' | 'intent.edit' | 'intent.rollback' | 'intent.promote_batch'
  | 'agent.config_change' | 'agent.status_change' | 'agent.kill_switch'
  | 'guardrail.policy_change'
  | 'template.publish' | 'template.restore'
  | 'system.kill_switch_deactivate';

export interface PendingApproval {
  id: string;
  actionType: ApprovalActionType;
  entityName: string;
  entityId: string;
  description: string;
  detail: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  actionReviewNote?: string;
  batchItems?: string[];
}

export type AuditActionType =
  | 'intent.create' | 'intent.edit' | 'intent.delete' | 'intent.toggle_status'
  | 'intent.rollback' | 'intent.promote'
  | 'agent.config_change' | 'agent.status_change' | 'agent.kill_switch'
  | 'template.publish' | 'template.restore'
  | 'guardrail.policy_change'
  | 'system.kill_switch_activate' | 'system.kill_switch_deactivate'
  | 'approval.submit' | 'approval.approve' | 'approval.reject';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: 'BA' | 'DEV' | 'ADMIN';
  actionType: AuditActionType;
  entityType: 'intent' | 'agent' | 'template' | 'guardrail' | 'system' | 'approval';
  entityId: string;
  entityName: string;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  batchId?: string;
  batchItems?: string[];
}
