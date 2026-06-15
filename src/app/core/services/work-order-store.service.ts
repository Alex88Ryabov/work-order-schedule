import { Injectable, computed, signal } from '@angular/core';
import { WorkCenterDoc, WorkOrderData, WorkOrderDoc } from '../models/documents';
import { rangesOverlap } from '../utils/date-utils';
import { createWorkOrderDoc } from '../utils/documents';
import { seedData } from '../utils/seed-data';

@Injectable({ providedIn: 'root' })
export class WorkOrderStore {
  private readonly seeded = seedData();

  private readonly workCentersState = signal<WorkCenterDoc[]>(this.seeded.centers);
  private readonly workOrdersState = signal<WorkOrderDoc[]>(this.seeded.orders);

  readonly workCenters = this.workCentersState.asReadonly();
  readonly workOrders = this.workOrdersState.asReadonly();

  readonly ordersByCenter = computed(() => {
    const map = new Map<string, WorkOrderDoc[]>();
    for (const order of this.workOrdersState()) {
      const list = map.get(order.data.workCenterId) ?? [];
      list.push(order);
      map.set(order.data.workCenterId, list);
    }
    return map;
  });

  createWorkOrder(data: WorkOrderData): WorkOrderDoc {
    const doc = createWorkOrderDoc(data);
    this.workOrdersState.update((orders) => [...orders, doc]);
    return doc;
  }

  updateWorkOrder(id: string, data: WorkOrderData): void {
    this.workOrdersState.update((orders) =>
      orders.map((o) => (o.docId === id ? { ...o, data: { ...data } } : o)),
    );
  }

  deleteWorkOrder(id: string): void {
    this.workOrdersState.update((orders) => orders.filter((o) => o.docId !== id));
  }

  /** First work order on the same work center whose [start, end] intersects the given range. */
  findOverlap(data: Pick<WorkOrderData, 'workCenterId' | 'startDate' | 'endDate'>, excludeId?: string): WorkOrderDoc | null {
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
