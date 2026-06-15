export type DocType = 'workCenter' | 'workOrder';

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

export interface NaoDocument<TType extends DocType, TData> {
  docId: string;
  docType: TType;
  data: TData;
}

export interface WorkCenterData {
  name: string;
}

export interface WorkOrderData {
  name: string;
  status: WorkOrderStatus;
  /** ISO date, e.g. "2026-06-10" (inclusive) */
  startDate: string;
  /** ISO date (inclusive) */
  endDate: string;
  workCenterId: string;
}

export type WorkCenterDoc = NaoDocument<'workCenter', WorkCenterData>;
export type WorkOrderDoc = NaoDocument<'workOrder', WorkOrderData>;

export interface WorkOrderStatusOption {
  value: WorkOrderStatus;
  label: string;
}
