import {
  BULK_CENTER_GROUPS,
  BULK_CENTER_MULTIPLIER,
  BULK_HORIZON_DAYS,
  BULK_OPERATIONS,
  BULK_PRODUCTS,
  SAMPLE_CENTERS,
  SAMPLE_ORDERS,
} from '../constants/seed-data';
import { WorkCenterDoc, WorkOrderDoc, WorkOrderStatus } from '../models/documents';
import { addDays, startOfDay, toIsoDate } from './date-utils';
import { createWorkCenterDoc, createWorkOrderDoc } from './documents';
import { mulberry32, pick, randomInt } from './random';

export interface SeedData {
  centers: WorkCenterDoc[];
  orders: WorkOrderDoc[];
}

export function seedData(): SeedData {
  const today = startOfDay(new Date());
  const centers = SAMPLE_CENTERS.map((name) => createWorkCenterDoc({ name }));
  const orders: WorkOrderDoc[] = SAMPLE_ORDERS.map((order) =>
    createWorkOrderDoc({
      name: order.name,
      status: order.status,
      startDate: toIsoDate(addDays(today, order.startOffset)),
      endDate: toIsoDate(addDays(today, order.endOffset)),
      workCenterId: centers[order.center].docId,
    }),
  );
  const bulk = bulkData(today);
  return { centers: [...centers, ...bulk.centers], orders: [...orders, ...bulk.orders] };
}

function bulkData(today: Date): SeedData {
  const rnd = mulberry32(0x5eed);
  const horizonEnd = addDays(today, BULK_HORIZON_DAYS);
  const centers: WorkCenterDoc[] = [];
  const orders: WorkOrderDoc[] = [];

  for (const [family, count] of BULK_CENTER_GROUPS) {
    for (let n = 1; n <= count * BULK_CENTER_MULTIPLIER; n++) {
      const center = createWorkCenterDoc({ name: `${family} ${n}` });
      centers.push(center);

      let cursor = addDays(today, -BULK_HORIZON_DAYS - randomInt(rnd, 0, 30));
      for (;;) {
        const gap = rnd() < 0.3 ? randomInt(rnd, 14, 40) : randomInt(rnd, 2, 14);
        const start = addDays(cursor, gap);
        if (start.getTime() > horizonEnd.getTime()) break;
        const end = addDays(start, rnd() < 0.2 ? randomInt(rnd, 14, 35) : randomInt(rnd, 45, 150));
        orders.push(
          createWorkOrderDoc({
            name: `${pick(rnd, BULK_OPERATIONS)} ${pick(rnd, BULK_PRODUCTS)} (Lot ${randomInt(rnd, 1000, 9999)})`,
            status: statusFor(rnd, start, end, today),
            startDate: toIsoDate(start),
            endDate: toIsoDate(end),
            workCenterId: center.docId,
          }),
        );
        cursor = addDays(end, 1);
      }
    }
  }

  return { centers, orders };
}

function statusFor(rnd: () => number, start: Date, end: Date, today: Date): WorkOrderStatus {
  if (end.getTime() < today.getTime()) return rnd() < 0.88 ? 'complete' : 'blocked';
  if (start.getTime() <= today.getTime()) return rnd() < 0.7 ? 'in-progress' : 'blocked';
  return rnd() < 0.85 ? 'open' : 'blocked';
}
