import { Component } from '@angular/core';
import { SchedulePageComponent } from './components/schedule-page/schedule-page.component';

@Component({
  selector: 'app-root',
  imports: [SchedulePageComponent],
  template: '<app-schedule-page />',
})
export class AppComponent {}
