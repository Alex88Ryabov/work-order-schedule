import { ChangeDetectionStrategy, Component, HostListener, effect, inject, input, output } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgbDateStruct, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { WORK_ORDER_STATUSES } from '../../core/constants/documents';
import { PanelState } from '../../core/interfaces/work-order-panel';
import { WorkOrderStatus } from '../../core/models/documents';
import { WorkOrderStore } from '../../core/services/work-order-store.service';
import { isoToStruct, structToIso } from '../../core/utils/dot-date-parser-formatter';

@Component({
  selector: 'app-work-order-panel',
  imports: [ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
  templateUrl: './work-order-panel.component.html',
  styleUrl: './work-order-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'work-order-panel' },
})
export class WorkOrderPanelComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(WorkOrderStore);

  readonly state = input.required<PanelState>();
  readonly closed = output<void>();

  protected readonly statuses = WORK_ORDER_STATUSES;

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
  }

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

  protected get submitLabel(): string {
    return this.state().mode === 'create' ? 'Create' : 'Save';
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
    this.closed.emit();
  }

  protected close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
