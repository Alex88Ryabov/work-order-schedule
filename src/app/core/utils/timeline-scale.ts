import { ScaleUnit, TimelineColumn, TimelineScale } from '../interfaces/timeline-scale';
import { addDays, addHours, addMonths, startOfDay, startOfMonth, startOfWeek } from './date-utils';

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const DAY_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function hourLabel(d: Date): string {
  return d.getHours() === 0 ? DAY_LABEL.format(d) : `${String(d.getHours()).padStart(2, '0')}:00`;
}

function hourFloor(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours());
}

// What differs between zoom levels: column width, chip text, the first column and
// size of the default window, and how a column start becomes a label.
interface ScaleSpec {
  colWidth: number;
  chip: string;
  baseCount: number;
  first(now: Date): Date;
  label(start: Date): string;
}

const SPECS: Record<ScaleUnit, ScaleSpec> = {
  month: { colWidth: 114, chip: 'Current month', baseCount: 13, first: (n) => addMonths(startOfMonth(n), -6), label: (d) => MONTH_LABEL.format(d) },
  week: { colWidth: 114, chip: 'Current week', baseCount: 19, first: (n) => addDays(startOfWeek(n), -9 * 7), label: (d) => DAY_LABEL.format(d) },
  day: { colWidth: 64, chip: 'Current day', baseCount: 29, first: (n) => addDays(startOfDay(n), -14), label: (d) => DAY_LABEL.format(d) },
  hour: { colWidth: 64, chip: 'Current hour', baseCount: 61, first: (n) => addHours(hourFloor(n), -30), label: hourLabel },
};

// Start of the column `i` steps after `from` (i may be negative);
// one step is a month / week / day / hour per the zoom level.
const STEP: Record<ScaleUnit, (from: Date, i: number) => Date> = {
  month: (from, i) => addMonths(from, i),
  week: (from, i) => addDays(from, i * 7),
  day: (from, i) => addDays(from, i),
  hour: (from, i) => addHours(from, i),
};

// Build the column model for a zoom level. `before`/`after` add columns on each side
// of the default window as infinite scroll reaches an edge. Dates are measured from
// columns[0], so a date holds its pixel position once its left columns settle.
export function buildScale(unit: ScaleUnit, before = 0, after = 0, now = new Date()): TimelineScale {
  const spec = SPECS[unit];
  const step = STEP[unit];
  const first = step(spec.first(now), -before);
  const count = spec.baseCount + before + after;
  const columns: TimelineColumn[] = [];
  for (let i = 0; i < count; i++) {
    const start = step(first, i);
    columns.push({ start, end: step(start, 1), label: spec.label(start) });
  }
  return { unit, colWidth: spec.colWidth, columns, totalWidth: count * spec.colWidth, currentChipLabel: spec.chip };
}

// Date to x pixel. Inside the range, interpolate within the column the date falls in;
// outside, extend at the edge column's rate so off-screen bars still land sensibly.
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

// Inverse of dateToX: x pixel back to a date.
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
