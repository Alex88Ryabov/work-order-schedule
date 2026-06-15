import { WorkOrderDoc } from '../models/documents';

export type PanelState =
  | { mode: 'create'; workCenterId: string; startDate: string; endDate: string }
  | { mode: 'edit'; doc: WorkOrderDoc };
