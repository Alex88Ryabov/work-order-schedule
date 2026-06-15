import { WorkOrderDoc } from '../models/documents';

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

/** One work center row: just the data, no geometry. Covers all rows, visible or not. */
export interface TimelineRowMeta {
  centerId: string;
  centerName: string;
  orders: WorkOrderDoc[];
}

/** A row prepared for rendering: its position in the full list plus only the bars worth drawing. */
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
