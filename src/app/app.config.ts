import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';

import { DotDateParserFormatter } from './core/utils/dot-date-parser-formatter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: NgbDateParserFormatter, useClass: DotDateParserFormatter },
  ],
};
