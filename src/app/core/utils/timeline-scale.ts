import { TimelineColumn, TimelineScale, ScaleUnit } from '../interfaces/timeline-scale';
import { addDays, addHours, addMonths, startOfDay, startOfMonth, startOfWeek } from './date-utils';

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const DAY_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function hourLabel(d: Date): string {
  return d.getHours() === 0 ? DAY_LABEL.format(d) : `${String(d.getHours()).padStart(2, '0')}:00`;
}

export function buildScale(unit: ScaleUnit, now = new Date()): TimelineScale {
  const columns: TimelineColumn[] = [];
  let colWidth: number;
  let currentChipLabel: string;

  switch (unit) {
    case 'month': {
      colWidth = 114;
      currentChipLabel = 'Current month';
      const first = addMonths(startOfMonth(now), -6);
      for (let i = 0; i < 13; i++) {
        const start = addMonths(first, i);
        columns.push({ start, end: addMonths(first, i + 1), label: MONTH_LABEL.format(start) });
      }
      break;
    }
    case 'week': {
      colWidth = 114;
      currentChipLabel = 'Current week';
      const first = addDays(startOfWeek(now), -9 * 7);
      for (let i = 0; i < 19; i++) {
        const start = addDays(first, i * 7);
        columns.push({ start, end: addDays(start, 7), label: DAY_LABEL.format(start) });
      }
      break;
    }
    case 'day': {
      colWidth = 64;
      currentChipLabel = 'Current day';
      const first = addDays(startOfDay(now), -14);
      for (let i = 0; i < 29; i++) {
        const start = addDays(first, i);
        columns.push({ start, end: addDays(start, 1), label: DAY_LABEL.format(start) });
      }
      break;
    }
    case 'hour': {
      colWidth = 64;
      currentChipLabel = 'Current hour';
      const first = addHours(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()), -30);
      for (let i = 0; i < 61; i++) {
        const start = addHours(first, i);
        columns.push({ start, end: addHours(start, 1), label: hourLabel(start) });
      }
      break;
    }
  }

  return { unit, colWidth, columns, totalWidth: columns.length * colWidth, currentChipLabel };
}

export function dateToX(scale: TimelineScale, date: Date): number {
  const { columns, colWidth } = scale;
  const t = date.getTime();
  const first = columns[0];
  const last = columns[columns.length - 1];

  if (t < first.start.getTime()) {
    const dur = first.end.getTime() - first.start.getTime();
    return ((t - first.start.getTime()) / dur) * colWidth;
  }
  if (t >= last.end.getTime()) {
    const dur = last.end.getTime() - last.start.getTime();
    return scale.totalWidth + ((t - last.end.getTime()) / dur) * colWidth;
  }
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (t < col.end.getTime()) {
      const frac = (t - col.start.getTime()) / (col.end.getTime() - col.start.getTime());
      return (i + frac) * colWidth;
    }
  }
  return scale.totalWidth;
}

export function xToDate(scale: TimelineScale, x: number): Date {
  const { columns, colWidth } = scale;
  const i = Math.max(0, Math.min(columns.length - 1, Math.floor(x / colWidth)));
  const col = columns[i];
  const frac = Math.max(0, Math.min(1, x / colWidth - i));
  return new Date(col.start.getTime() + frac * (col.end.getTime() - col.start.getTime()));
}

export function columnContaining(scale: TimelineScale, date: Date): number {
  const t = date.getTime();
  return scale.columns.findIndex((c) => t >= c.start.getTime() && t < c.end.getTime());
}
