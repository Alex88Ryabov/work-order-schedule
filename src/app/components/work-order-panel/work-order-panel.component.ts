import { ChangeDetectionStrategy, Component, ElementRef, HostListener, afterNextRender, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgbDateStruct, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { WORK_ORDER_STATUSES } from '../../core/constants/documents';
import { PanelState } from '../../core/interfaces/work-order-panel';
import { WorkOrderStatus } from '../../core/models/documents';
import { WorkOrderService } from '../../core/services/work-order.service';
import { isoToStruct, structToIso } from '../../core/utils/dot-date-parser-formatter';

@Component({
  selector: 'app-work-order-panel',
  imports: [ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
  templateUrl: './work-order-panel.component.html',
  styleUrl: './work-order-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'work-order-panel',
    '[class.work-order-panel--closing]': 'closing()',
  },
})
export class WorkOrderPanelComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(WorkOrderService);

  public readonly state = input.required<PanelState>();
  public readonly closed = output<void>();

  protected readonly statuses = WORK_ORDER_STATUSES;

  // Button label: Create when adding, Save when editing.
  protected readonly submitLabel = computed(() => (this.state().mode === 'create' ? 'Create' : 'Save'));

  // True while the slide-out animation plays; the panel is removed once it finishes.
  protected readonly closing = signal(false);

  private readonly dialogRef = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly nameRef = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  // Element to refocus once the panel closes.
  private returnFocusTo: HTMLElement | null = null;

  private ctx: { workCenterId: string; excludeId?: string } | null = null;

  protected readonly form = this.fb.group(
    {
      name: this.fb.control('', Validators.required),
      status: this.fb.control<WorkOrderStatus>('open', Validators.required),
      startDate: this.fb.control<NgbDateStruct | null>(null, Validators.required),
      endDate: this.fb.control<NgbDateStruct | null>(null, Validators.required),
    },
    { validators: (group) => this.validateRange(group) },
  );

  constructor() {
    effect(() => {
      const state = this.state();
      if (state.mode === 'create') {
        this.ctx = { workCenterId: state.workCenterId };
        this.form.reset({
          name: '',
          status: 'open',
          startDate: isoToStruct(state.startDate),
          endDate: isoToStruct(state.endDate),
        });
      } else {
        const { data } = state.doc;
        this.ctx = { workCenterId: data.workCenterId, excludeId: state.doc.docId };
        this.form.reset({
          name: data.name,
          status: data.status,
          startDate: isoToStruct(data.startDate),
          endDate: isoToStruct(data.endDate),
        });
      }
    });

    // Remember the previously focused element, then focus the first field.
    afterNextRender(() => {
      this.returnFocusTo = document.activeElement as HTMLElement | null;
      this.nameRef().nativeElement.focus();
    });
  }

  // Invalid when dates are out of order or the order overlaps another on the same center.
  private validateRange(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value as NgbDateStruct | null;
    const end = group.get('endDate')?.value as NgbDateStruct | null;
    if (!start || !end || !this.ctx) return null;

    const startDate = structToIso(start);
    const endDate = structToIso(end);
    if (startDate >= endDate) return { dateOrder: true };

    const conflict = this.store.findOverlap(
      { workCenterId: this.ctx.workCenterId, startDate, endDate },
      this.ctx.excludeId,
    );
    return conflict ? { overlap: conflict.data.name } : null;
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const state = this.state();
    const data = {
      name: value.name.trim(),
      status: value.status,
      startDate: structToIso(value.startDate!),
      endDate: structToIso(value.endDate!),
      workCenterId: state.mode === 'create' ? state.workCenterId : state.doc.data.workCenterId,
    };

    if (state.mode === 'create') {
      this.store.createWorkOrder(data);
    } else {
      this.store.updateWorkOrder(state.doc.docId, data);
    }
    this.close();
  }

  // Start the slide-out; closed is emitted when the animation ends.
  protected close(): void {
    this.closing.set(true);
  }

  protected onDialogAnimationEnd(event: AnimationEvent): void {
    if (this.closing() && event.animationName.includes('slide-out')) {
      this.returnFocusTo?.focus();
      this.closed.emit();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  // Trap keyboard focus in the dialog: wrap last → first (and first → last on Shift+Tab).
  // @upgrade: the datepicker popup mounts outside the dialog, so its days aren't
  // trapped — fine for mouse use, worth revisiting for full a11y.
  @HostListener('keydown.tab', ['$event'])
  @HostListener('keydown.shift.tab', ['$event'])
  protected onTab(event: KeyboardEvent): void {
    const items = this.focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && active === last) {
      first.focus();
      event.preventDefault();
    }
  }

  private focusable(): HTMLElement[] {
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(this.dialogRef().nativeElement.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => el.offsetParent !== null,
    );
  }
}
