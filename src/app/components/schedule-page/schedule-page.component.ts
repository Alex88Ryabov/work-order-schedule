import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { SCALE_OPTIONS } from '../../core/constants/timeline-scale';
import { CreateRequest } from '../../core/interfaces/timeline';
import { ScaleUnit } from '../../core/interfaces/timeline-scale';
import { PanelState } from '../../core/interfaces/work-order-panel';
import { WorkOrderDoc } from '../../core/models/documents';
import { buildScale } from '../../core/utils/timeline-scale';
import { TimelineComponent } from '../timeline/timeline.component';
import { WorkOrderPanelComponent } from '../work-order-panel/work-order-panel.component';

@Component({
  selector: 'app-schedule-page',
  imports: [TimelineComponent, WorkOrderPanelComponent, NgSelectModule, ReactiveFormsModule],
  templateUrl: './schedule-page.component.html',
  styleUrl: './schedule-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'schedule-page' },
})
export class SchedulePageComponent {
  protected readonly scaleOptions = SCALE_OPTIONS;
  protected readonly scaleControl = new FormControl<ScaleUnit>('month', { nonNullable: true });

  private readonly scaleUnit = toSignal(this.scaleControl.valueChanges, {
    initialValue: this.scaleControl.value,
  });

  protected readonly scale = computed(() => buildScale(this.scaleUnit()));

  protected readonly panelState = signal<PanelState | null>(null);

  protected onCreateRequested(request: CreateRequest): void {
    this.panelState.set({ mode: 'create', ...request });
  }

  protected onEditRequested(doc: WorkOrderDoc): void {
    this.panelState.set({ mode: 'edit', doc });
  }
}
