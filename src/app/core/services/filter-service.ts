import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  private yearSubject = new BehaviorSubject<string | null>(null);
  private regionSubject = new BehaviorSubject<string | null>(null);
  private combinedFiltersSubject = new BehaviorSubject<{ year: string | null, region: string | null }>({ year: null, region: null });
  year$ = this.yearSubject.asObservable();

  region$ = this.regionSubject.asObservable();
  combinedFilters$ = this.combinedFiltersSubject.asObservable();

  setRegion(region: string) {
    this.regionSubject.next(region);
    this.updateCombinedFilters();
  }

  setYear(year: string) {
    this.yearSubject.next(year === 'All' ? null : year);
    this.updateCombinedFilters();
  }

  private updateCombinedFilters() {
    this.combinedFiltersSubject.next({
      year: this.yearSubject.value,
      region: this.regionSubject.value
    });
  }
}
