import { Injectable, computed, effect, signal } from '@angular/core';
import { WorkCenterDoc, WorkOrderData, WorkOrderDoc } from '../models/documents';
import { rangesOverlap } from '../utils/date-utils';
import { createWorkOrderDoc } from '../utils/documents';
import { SeedData, seedData } from '../utils/seed-data';

const STORAGE_KEY = 'naologic.schedule.v1';

@Injectable({ providedIn: 'root' })
export class WorkOrderService {
  private readonly workCentersState = signal<WorkCenterDoc[]>([]);
  private readonly workOrdersState = signal<WorkOrderDoc[]>([]);

  public readonly workCenters = this.workCentersState.asReadonly();

  public readonly orderCount = computed(() => this.workOrdersState().length);

  public readonly ordersByCenter = computed(() => {
    const map = new Map<string, WorkOrderDoc[]>();
    for (const order of this.workOrdersState()) {
      const list = map.get(order.data.workCenterId) ?? [];
      list.push(order);
      map.set(order.data.workCenterId, list);
    }
    return map;
  });

  constructor() {
    // Restore the saved board so edits survive a refresh; fall back to sample data
    // the first time, or when storage is empty or unreadable.
    const board = loadBoard() ?? seedData();
    this.workCentersState.set(board.centers);
    this.workOrdersState.set(board.orders);

    // Save after any change. Centers are static, but we store them too so every
    // order still points at the right work center after a reload.
    effect(() => {
      saveBoard({ centers: this.workCentersState(), orders: this.workOrdersState() });
    });
  }

  public createWorkOrder(data: WorkOrderData): WorkOrderDoc {
    const doc = createWorkOrderDoc(data);
    this.workOrdersState.update((orders) => [...orders, doc]);
    return doc;
  }

  public updateWorkOrder(id: string, data: WorkOrderData): void {
    this.workOrdersState.update((orders) =>
      orders.map((o) => (o.docId === id ? { ...o, data: { ...data } } : o)),
    );
  }

  public deleteWorkOrder(id: string): void {
    this.workOrdersState.update((orders) => orders.filter((o) => o.docId !== id));
  }

  public findOverlap(data: Pick<WorkOrderData, 'workCenterId' | 'startDate' | 'endDate'>, excludeId?: string): WorkOrderDoc | null {
    return (
      this.workOrdersState().find(
        (o) =>
          o.docId !== excludeId &&
          o.data.workCenterId === data.workCenterId &&
          rangesOverlap(data.startDate, data.endDate, o.data.startDate, o.data.endDate),
      ) ?? null
    );
  }
}

function loadBoard(): SeedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.centers) && Array.isArray(parsed?.orders)) {
      return parsed as SeedData;
    }
  } catch {
    // Corrupt JSON or storage disabled — ignore and fall back to sample data.
  }
  return null;
}

function saveBoard(board: SeedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    // Storage full or blocked (private mode); the board still works in memory.
    // @upgrade: move persistence to IndexedDB so a large board never hits the quota.
  }
}
