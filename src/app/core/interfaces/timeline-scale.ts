export type ScaleUnit = 'hour' | 'day' | 'week' | 'month';

export interface ScaleOption {
  value: ScaleUnit;
  label: string;
}

export interface TimelineColumn {
  start: Date;
  end: Date;
  label: string;
}

export interface TimelineScale {
  unit: ScaleUnit;
  colWidth: number;
  columns: TimelineColumn[];
  totalWidth: number;
  currentChipLabel: string;
}
