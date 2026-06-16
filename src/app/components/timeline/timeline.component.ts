import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, NgZone, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { NgbDropdown, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { STATUS_LABELS } from '../../core/constants/documents';
import { BAR_HEIGHT, CENTERS_WIDTH, FIRST_ROW_EXTRA, HEADER_HEIGHT, ROW_HEIGHT, TIP_GAP, TIP_HEIGHT } from '../../core/constants/timeline';
import { BarTooltip, CreateRequest, GhostState, TimelineBar, TimelineRow, TimelineRowMeta } from '../../core/interfaces/timeline';
import { ScaleUnit, TimelineScale } from '../../core/interfaces/timeline-scale';
import { WorkOrderDoc } from '../../core/models/documents';
import { WorkOrderService } from '../../core/services/work-order.service';
import { addDays, formatDateRange, fromIsoDate, startOfDay, toIsoDate } from '../../core/utils/date-utils';
import { buildScale, columnContaining, dateToX, xToDate } from '../../core/utils/timeline-scale';

const OVERSCAN_ROWS = 4;
const OVERSCAN_X = 300;

// Distance from an edge (px) before more columns load.
const EDGE_PX = 240;
// Columns added per load, per zoom. Big enough that one load clears the edge.
const EXTEND_CHUNK: Record<ScaleUnit, number> = { month: 6, week: 8, day: 14, hour: 24 };
// Cap so endless scrolling can't grow the column list forever.
// @upgrade: window columns like rows for a truly infinite range.
const MAX_COLUMNS = 600;

@Component({
  selector: 'app-timeline',
  imports: [NgbDropdownModule],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'timeline' },
})
export class TimelineComponent {
  protected readonly store = inject(WorkOrderService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  public readonly unit = input.required<ScaleUnit>();

  public readonly createRequested = output<CreateRequest>();
  public readonly editRequested = output<WorkOrderDoc>();

  private readonly scrollRef = viewChild.required<ElementRef<HTMLElement>>('scrollEl');
  private readonly centersRef = viewChild.required<ElementRef<HTMLElement>>('centersEl');

  private readonly isTouch = window.matchMedia('(hover: none)').matches;

  private readonly viewport = signal({ top: 0, left: 0, width: 1600, height: 900 });
  private viewportUpdateQueued = false;

  private readonly centersWidth = signal(CENTERS_WIDTH);

  // Extra columns added each side by infinite scroll, tagged with their zoom.
  // When the zoom changes the tag stops matching and the scale resets itself.
  private readonly extension = signal<{ unit: ScaleUnit; before: number; after: number } | null>(null);

  // Extra columns for the current zoom (zero after a zoom change).
  private extensionFor(unit: ScaleUnit): { before: number; after: number } {
    const e = this.extension();
    return e && e.unit === unit ? { before: e.before, after: e.after } : { before: 0, after: 0 };
  }

  // Full column model for the current zoom, including any scrolled-in columns.
  protected readonly scale = computed(() => {
    const unit = this.unit();
    return buildScale(unit, this.extensionFor(unit).before, this.extensionFor(unit).after);
  });

  // True while we nudge scrollLeft after prepending, so it isn't read as an edge hit.
  private adjustingScroll = false;

  constructor() {
    // On zoom change, drop scrolled-in columns and re-centre on today.
    // Tracks only the zoom, so growing columns on scroll won't recentre.
    effect(() => {
      this.unit();
      requestAnimationFrame(() => {
        this.centerOnToday();
        this.measureCenters();
        this.readViewport();
      });
    });

    afterNextRender(() => {
      const el = this.scrollRef().nativeElement;
      this.ngZone.runOutsideAngular(() => {
        el.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onResize, { passive: true });
      });
      this.destroyRef.onDestroy(() => {
        el.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onResize);
      });
    });
  }

  public centerOnToday(): void {
    const scroll = this.scrollRef().nativeElement;
    const gridViewport = scroll.clientWidth - this.centersRef().nativeElement.offsetWidth;
    scroll.scrollLeft = Math.max(0, dateToX(this.scale(), new Date()) - gridViewport / 2);
  }

  private readonly onScroll = (): void => {
    if (this.viewportUpdateQueued) return;
    this.viewportUpdateQueued = true;
    requestAnimationFrame(() => {
      this.viewportUpdateQueued = false;
      this.readViewport();
      this.maybeExtend();
    });
  };

  private readonly onResize = (): void => {
    this.measureCenters();
    this.onScroll();
  };

  // Add columns when scrolling near either edge. Growing the left side shifts every
  // column right, so we bump scrollLeft by the added width to keep the view steady.
  private maybeExtend(): void {
    if (this.adjustingScroll) return;
    const el = this.scrollRef().nativeElement;
    const scale = this.scale();
    if (scale.columns.length >= MAX_COLUMNS) return;

    const chunk = EXTEND_CHUNK[scale.unit];
    const ext = this.extensionFor(scale.unit);
    const gridRight = el.scrollLeft + (el.clientWidth - this.centersWidth());

    if (el.scrollLeft < EDGE_PX) {
      const prevWidth = el.scrollWidth;
      this.extension.set({ unit: scale.unit, before: ext.before + chunk, after: ext.after });
      this.adjustingScroll = true;
      requestAnimationFrame(() => {
        el.scrollLeft += el.scrollWidth - prevWidth;
        this.adjustingScroll = false;
      });
    } else if (gridRight > scale.totalWidth - EDGE_PX) {
      this.extension.set({ unit: scale.unit, before: ext.before, after: ext.after + chunk });
    }
  }

  private readViewport(): void {
    const el = this.scrollRef().nativeElement;
    this.viewport.set({ top: el.scrollTop, left: el.scrollLeft, width: el.clientWidth, height: el.clientHeight });
  }

  private measureCenters(): void {
    this.centersWidth.set(this.centersRef().nativeElement.offsetWidth);
  }

  protected readonly hover = signal<{ row: number; ghostX: number | null; barId: string | null } | null>(null);

  private readonly rows = computed<TimelineRowMeta[]>(() => {
    const byCenter = this.store.ordersByCenter();
    return this.store.workCenters().map((center) => ({
      centerId: center.docId,
      centerName: center.data.name,
      orders: byCenter.get(center.docId) ?? [],
    }));
  });

  protected readonly bodyHeight = computed(() =>
    this.rows().length ? this.rows().length * ROW_HEIGHT + FIRST_ROW_EXTRA : 0,
  );

  private rowTop(index: number): number {
    return index === 0 ? 0 : index * ROW_HEIGHT + FIRST_ROW_EXTRA;
  }

  private rowAtY(y: number): number {
    return y < ROW_HEIGHT + FIRST_ROW_EXTRA ? 0 : Math.floor((y - FIRST_ROW_EXTRA) / ROW_HEIGHT);
  }

  // Build only the rows and bars in the viewport (plus overscan), so a board with
  // thousands of orders still renders a handful of elements.
  protected readonly visibleRows = computed<TimelineRow[]>(() => {
    const rows = this.rows();
    const scale = this.scale();
    const vp = this.viewport();

    const first = Math.max(0, Math.floor(Math.max(0, vp.top - HEADER_HEIGHT) / ROW_HEIGHT) - OVERSCAN_ROWS);
    const last = Math.min(rows.length, first + Math.ceil(vp.height / ROW_HEIGHT) + OVERSCAN_ROWS * 2);

    const xMin = vp.left - OVERSCAN_X;
    const xMax = vp.left + (vp.width - this.centersWidth()) + OVERSCAN_X;

    const out: TimelineRow[] = [];
    for (let i = first; i < last; i++) {
      const row = rows[i];
      const height = i === 0 ? ROW_HEIGHT + FIRST_ROW_EXTRA : ROW_HEIGHT;
      out.push({
        index: i,
        centerId: row.centerId,
        centerName: row.centerName,
        top: this.rowTop(i),
        height,
        barTop: (height - BAR_HEIGHT) / 2,
        bars: this.toBars(row.orders, scale, xMin, xMax),
      });
    }
    return out;
  });

  protected readonly todayX = computed<number | null>(() => {
    const x = dateToX(this.scale(), new Date());
    return x >= 0 && x <= this.scale().totalWidth ? x : null;
  });

  protected readonly currentChip = computed<{ left: number; label: string } | null>(() => {
    const scale = this.scale();
    const index = columnContaining(scale, new Date());
    if (index < 0) return null;
    return { left: (index + 0.5) * scale.colWidth, label: scale.currentChipLabel };
  });

  protected readonly ghost = computed<GhostState | null>(() => {
    const hover = this.hover();
    if (!hover || hover.ghostX === null) return null;
    const rowHeight = hover.row === 0 ? ROW_HEIGHT + FIRST_ROW_EXTRA : ROW_HEIGHT;
    const top = this.rowTop(hover.row) + (rowHeight - BAR_HEIGHT) / 2;
    const tipBelow = hover.row === 0;
    return {
      row: hover.row,
      left: hover.ghostX,
      width: this.scale().colWidth,
      top,
      tipTop: tipBelow ? top + BAR_HEIGHT + TIP_GAP : top - TIP_GAP - TIP_HEIGHT,
    };
  });

  // Popover shown while the pointer is over a bar (name, status, range).
  protected readonly barTooltip = computed<BarTooltip | null>(() => {
    const hover = this.hover();
    if (!hover || !hover.barId) return null;
    const row = this.visibleRows().find((r) => r.index === hover.row);
    const bar = row?.bars.find((b) => b.doc.docId === hover.barId);
    if (!row || !bar) return null;
    // The first row hugs the header, so its tooltip goes below the bar instead of above.
    const below = hover.row === 0;
    const barTop = row.top + row.barTop;
    return {
      left: bar.left + bar.width / 2,
      top: below ? barTop + BAR_HEIGHT + TIP_GAP : barTop - TIP_GAP,
      below,
      name: bar.doc.data.name,
      status: bar.doc.data.status,
      statusLabel: bar.statusLabel,
      range: formatDateRange(bar.doc.data.startDate, bar.doc.data.endDate),
    };
  });

  // Turn each order into a positioned bar. endDate is inclusive, so the bar runs to
  // the start of the next day. Bars fully outside the viewport are skipped.
  private toBars(orders: WorkOrderDoc[], scale: TimelineScale, xMin: number, xMax: number): TimelineBar[] {
    const bars: TimelineBar[] = [];
    for (const doc of orders) {
      const start = dateToX(scale, fromIsoDate(doc.data.startDate));
      const end = dateToX(scale, addDays(fromIsoDate(doc.data.endDate), 1));
      if (end <= 0 || start >= scale.totalWidth) continue;
      const right = Math.min(end, scale.totalWidth);
      const width = Math.max(right - Math.max(start, 0), 16);
      const left = Math.min(Math.max(start, 0), scale.totalWidth - width);
      if (right < xMin || left > xMax) continue;
      bars.push({
        doc,
        left,
        width,
        statusClass: `timeline__bar--${doc.data.status}`,
        statusLabel: STATUS_LABELS[doc.data.status],
      });
    }
    return bars;
  }

  protected onBodyMouseMove(event: MouseEvent): void {
    const body = event.currentTarget as HTMLElement;
    const rect = body.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const row = this.rowAtY(y);
    if (row < 0 || row >= this.rows().length) {
      this.hover.set(null);
      return;
    }

    // Over a bar: show its details tooltip, no create-ghost.
    const barEl = (event.target as HTMLElement).closest('.timeline__bar') as HTMLElement | null;
    if (barEl) {
      this.hover.set({ row, ghostX: null, barId: barEl.dataset['docId'] ?? null });
      return;
    }

    // Over empty space: show the one-column create ghost centred on the pointer.
    const scale = this.scale();
    const ghostX = Math.max(0, Math.min(x - scale.colWidth / 2, scale.totalWidth - scale.colWidth));
    this.hover.set({ row, ghostX, barId: null });
  }

  protected onBodyMouseLeave(): void {
    this.hover.set(null);
  }

  protected onBodyClick(): void {
    const hover = this.hover();
    if (!hover || hover.ghostX === null) return;
    const row = this.rows()[hover.row];
    const start = startOfDay(xToDate(this.scale(), hover.ghostX));
    this.createRequested.emit({
      workCenterId: row.centerId,
      startDate: toIsoDate(start),
      endDate: toIsoDate(addDays(start, 7)),
    });
  }

  protected onBarClick(event: MouseEvent, menu: NgbDropdown): void {
    event.stopPropagation();
    if (this.isTouch) {
      menu.toggle();
    }
  }

  protected onDelete(doc: WorkOrderDoc): void {
    this.store.deleteWorkOrder(doc.docId);
  }
}
