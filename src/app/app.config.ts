import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';

import { routes } from './app.routes';
import { DotDateParserFormatter } from './core/utils/dot-date-parser-formatter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: NgbDateParserFormatter, useClass: DotDateParserFormatter },
  ],
};
