import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { STATUS_LABELS } from '../../core/constants/documents';
import { BAR_HEIGHT, CENTERS_WIDTH, FIRST_ROW_EXTRA, HEADER_HEIGHT, ROW_HEIGHT, TIP_GAP, TIP_HEIGHT } from '../../core/constants/timeline';
import { CreateRequest, GhostState, TimelineBar, TimelineRow, TimelineRowMeta } from '../../core/interfaces/timeline';
import { TimelineScale } from '../../core/interfaces/timeline-scale';
import { WorkOrderDoc } from '../../core/models/documents';
import { WorkOrderStore } from '../../core/services/work-order-store.service';
import { addDays, fromIsoDate, startOfDay, toIsoDate } from '../../core/utils/date-utils';
import { columnContaining, dateToX, xToDate } from '../../core/utils/timeline-scale';

/** Extra rows / pixels rendered around the visible area so fast scrolling never shows a gap. */
const OVERSCAN_ROWS = 4;
const OVERSCAN_X = 300;

@Component({
  selector: 'app-timeline',
  imports: [NgbDropdownModule],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'timeline', '(window:resize)': 'onScroll()' },
})
export class TimelineComponent {
  protected readonly store = inject(WorkOrderStore);

  public readonly scale = input.required<TimelineScale>();

  public readonly createRequested = output<CreateRequest>();
  public readonly editRequested = output<WorkOrderDoc>();

  private readonly scrollRef = viewChild.required<ElementRef<HTMLElement>>('scrollEl');
  private readonly centersRef = viewChild.required<ElementRef<HTMLElement>>('centersEl');

  protected readonly headerHeight = HEADER_HEIGHT;

  /**
   * The part of the scroll box currently visible. Rows and bars outside it are
   * not rendered — with thousands of orders the full grid would be too much DOM.
   */
  private readonly viewport = signal({ top: 0, left: 0, width: 1600, height: 900 });
  private viewportUpdateQueued = false;

  constructor() {
    // Center the viewport on today on load and on every zoom change; rAF defers
    // the scroll until the new column widths have actually been rendered.
    effect(() => {
      this.scale();
      requestAnimationFrame(() => {
        this.centerOnToday();
        this.readViewport();
      });
    });
  }

  private centerOnToday(): void {
    const scroll = this.scrollRef().nativeElement;
    const gridViewport = scroll.clientWidth - this.centersRef().nativeElement.offsetWidth;
    scroll.scrollLeft = Math.max(0, dateToX(this.scale(), new Date()) - gridViewport / 2);
  }

  /** Collapses a burst of scroll/resize events into one viewport update per frame. */
  protected onScroll(): void {
    if (this.viewportUpdateQueued) return;
    this.viewportUpdateQueued = true;
    requestAnimationFrame(() => {
      this.viewportUpdateQueued = false;
      this.readViewport();
    });
  }

  private readViewport(): void {
    const el = this.scrollRef().nativeElement;
    this.viewport.set({ top: el.scrollTop, left: el.scrollLeft, width: el.clientWidth, height: el.clientHeight });
  }

  /** Row under the cursor; ghostX is null while hovering an existing bar. */
  protected readonly hover = signal<{ row: number; ghostX: number | null } | null>(null);

  /** All rows (every work center with its orders), without any bar geometry. */
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

  /** Top offset of a row; the first row is taller, so everything below it is pushed down. */
  private rowTop(index: number): number {
    return index === 0 ? 0 : index * ROW_HEIGHT + FIRST_ROW_EXTRA;
  }

  /** Row index under a y offset inside the body (accounts for the taller first row). */
  private rowAtY(y: number): number {
    return y < ROW_HEIGHT + FIRST_ROW_EXTRA ? 0 : Math.floor((y - FIRST_ROW_EXTRA) / ROW_HEIGHT);
  }

  /** Only the rows inside the viewport, with bar geometry computed just for them. */
  protected readonly visibleRows = computed<TimelineRow[]>(() => {
    const rows = this.rows();
    const scale = this.scale();
    const vp = this.viewport();

    const first = Math.max(0, Math.floor(Math.max(0, vp.top - HEADER_HEIGHT) / ROW_HEIGHT) - OVERSCAN_ROWS);
    const last = Math.min(rows.length, first + Math.ceil(vp.height / ROW_HEIGHT) + OVERSCAN_ROWS * 2);

    // Horizontal window in grid coordinates; the sticky centers column hides
    // the first CENTERS_WIDTH pixels of the viewport.
    const xMin = vp.left - OVERSCAN_X;
    const xMax = vp.left + (vp.width - CENTERS_WIDTH) + OVERSCAN_X;

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

  /** Bars for one row, clipped to the grid and skipped entirely when outside the viewport window. */
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

    const overBar = (event.target as HTMLElement).closest('.timeline__bar') !== null;
    if (overBar) {
      this.hover.set({ row, ghostX: null });
      return;
    }

    const scale = this.scale();
    const ghostX = Math.max(0, Math.min(x - scale.colWidth / 2, scale.totalWidth - scale.colWidth));
    this.hover.set({ row, ghostX });
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

  protected onDelete(doc: WorkOrderDoc): void {
    this.store.deleteWorkOrder(doc.docId);
  }
}
