import { Component, inject, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CascadeSelectModule } from 'primeng/cascadeselect';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { FilterService } from '../../../../core/services/filter-service';

@Component({
  selector: 'app-headerbar',
  imports: [CascadeSelectModule, FormsModule, TranslateModule, SelectModule, ButtonModule],
  templateUrl: './headerbar.html',
  styleUrl: './headerbar.css',
})
export class Headerbar {
  years: string[] = [];
  selectedYear!: string;
  selectedRegion!: { labelKey: string; value: string };
  regions: any;
  currentLang: string = 'ar';
  filterService = inject(FilterService);
  translateService = inject(TranslateService);
  ngOnInit() {


    // Subscribe to language change events to update the current language
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
    });



    // Initialize the years array with values from 2016 to 2024

this.years = [
  'All',
  ...Array.from({ length: 2024 - 2016 + 1 }, (_, i) => (2016 + i).toString())
];


// Initialize the regions array with label keys and values
    this.regions = [
      { label: 'regions.baaha', value: 'baaha' },
      { label: 'regions.jouf', value: 'jouf' },
      { label: 'regions.northern_border', value: 'northern_border' },
      { label: 'regions.riyadh', value: 'riyadh' },
      { label: 'regions.eastern', value: 'eastern' },
      { label: 'regions.qassim', value: 'qassim' },
      { label: 'regions.madinah', value: 'madinah' },
      { label: 'regions.tabuk', value: 'tabuk' },
      { label: 'regions.jazan', value: 'jazan' },
      { label: 'regions.hail', value: 'hail' },
      { label: 'regions.asir', value: 'asir' },
      { label: 'regions.makkah', value: 'makkah' },
      { label: 'regions.najran', value: 'najran' }
    ];
  }

// Method to toggle the language between Arabic and English
  toggleLanguage() {
  const newLang = this.currentLang === 'ar' ? 'en' : 'ar';

  this.translateService.use(newLang);
  this.currentLang = newLang;

  localStorage.setItem('lang', newLang);
}
}
