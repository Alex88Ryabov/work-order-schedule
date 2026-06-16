import { WorkOrderDoc, WorkOrderStatus } from '../models/documents';

export interface CreateRequest {
  workCenterId: string;
  startDate: string;
  endDate: string;
}

export interface TimelineBar {
  doc: WorkOrderDoc;
  left: number;
  width: number;
  statusClass: string;
  statusLabel: string;
}

export interface TimelineRowMeta {
  centerId: string;
  centerName: string;
  orders: WorkOrderDoc[];
}

export interface TimelineRow {
  index: number;
  centerId: string;
  centerName: string;
  top: number;
  height: number;
  barTop: number;
  bars: TimelineBar[];
}

export interface GhostState {
  row: number;
  left: number;
  width: number;
  top: number;
  tipTop: number;
}

export interface BarTooltip {
  left: number;
  top: number;
  below: boolean;
  name: string;
  status: WorkOrderStatus;
  statusLabel: string;
  range: string;
}
