import { WorkCenterData, WorkCenterDoc, WorkOrderData, WorkOrderDoc } from '../models/documents';

let uid = 0;

export function docId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(uid++).toString(36)}`;
}

export function createWorkCenterDoc(data: WorkCenterData): WorkCenterDoc {
  return { docId: docId('wc'), docType: 'workCenter', data };
}

export function createWorkOrderDoc(data: WorkOrderData): WorkOrderDoc {
  return { docId: docId('wo'), docType: 'workOrder', data };
}
