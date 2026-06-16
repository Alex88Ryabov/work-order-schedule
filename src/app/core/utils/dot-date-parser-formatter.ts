import { Injectable } from '@angular/core';
import { NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';

@Injectable()
export class DotDateParserFormatter extends NgbDateParserFormatter {
  parse(value: string): NgbDateStruct | null {
    if (!value) return null;
    const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    const [, month, day, year] = match.map(Number);
    return { year, month, day };
  }

  format(date: NgbDateStruct | null): string {
    if (!date) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.month)}.${pad(date.day)}.${date.year}`;
  }
}

export function isoToStruct(iso: string): NgbDateStruct {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

export function structToIso(date: NgbDateStruct): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}
