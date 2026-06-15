import { WorkOrderStatus, WorkOrderStatusOption } from '../models/documents';

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  complete: 'Complete',
  blocked: 'Blocked',
};

export const WORK_ORDER_STATUSES: WorkOrderStatusOption[] = (
  Object.keys(STATUS_LABELS) as WorkOrderStatus[]
).map((value) => ({ value, label: STATUS_LABELS[value] }));
