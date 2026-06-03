import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { StudentsService } from './../../services/students-service';
import { FilterService } from '../../../../core/services/filter-service';
import { IDrillDown, IDrillStat, IKpiCard, IRegionBar } from '../../interfaces/charts';
import { TranslateModule} from '@ngx-translate/core';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [
    CommonModule,
    CardModule, ChartModule, ButtonModule,
    TagModule, DividerModule, ProgressBarModule,TranslateModule,
  ],
  templateUrl: './charts.html',
  styleUrls: ['./charts.css'],
})
export class Charts implements OnInit, OnDestroy {

  // ─── Constants ────────────────────────────────────────────────────────────────

  ALL_YEARS = ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'] as const;

  EDUCATION_STAGES = [
    { label: 'dashboard.primary', arabic: 'المرحلة الإبتدائية', color: '#2dd4bf' },
    { label: 'dashboard.intermediate', arabic: 'المرحلة المتوسطة', color: '#99f6e4' },
    { label: 'dashboard.secondary', arabic: 'المرحلة الثانوية', color: '#ccfbf1' },
  ] as const;

  REGION_MAP: Record<string, string> = {
    baaha: 'الباحة',
    jouf: 'الجوف',
    northern_border: 'الحدود الشمالية',
    riyadh: 'الرياض',
    eastern: 'الشرقية',
    qassim: 'القصيم',
    madinah: 'المدينة المنورة',
    tabuk: 'تبوك',
    jazan: 'جازان',
    hail: 'حائل',
    asir: 'عسير',
    makkah: 'مكة المكرمة',
    najran: 'نجران',
  };
  // ── Services ──────────────────────────────────────────────
  private readonly studentsService = inject(StudentsService);
  private readonly filterService = inject(FilterService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  // ── State ─────────────────────────────────────────────────
  private rawData: StudentRecord[] = [];
  activeYear: string | null = null;
  private activeRegion: string | null = null;

  // ── KPIs ──────────────────────────────────────────────────
  totalStudents = 0;
  malePct = 0;
  femalePct = 0;
  kpis: IKpiCard[] = [];

  // ── Chart Data & Options ──────────────────────────────────
  trendData: any; trendOptions: any;
  genderTrendData: any; genderTrendOptions: any;
  growthTrendData: any; growthTrendOptions: any;
  educationStageData: any; educationStageOptions: any;
  genderDoughnutData: any; genderDoughnutOptions: any;
  generalDistData: any; generalDistOptions: any;

  // ── Region Bars ───────────────────────────────────────────
  regions: IRegionBar[] = [];
  maxRegionValue = 1;

  // ── Drill-down ────────────────────────────────────────────
  drillStats: IDrillStat[] = [];
  drillDown: IDrillDown = {
    regionName: '', total: 0, previousTotal: 0, growthPct: '', stages: [],
  };

  // ── Static Insights ───────────────────────────────────────
  readonly iconStyles = [
    { icon: 'pi pi-map-marker', iconColor: 'text-teal-500', bgColor: 'bg-teal-50' },
    { icon: 'pi pi-users', iconColor: 'text-blue-400', bgColor: 'bg-blue-50' },
    { icon: 'pi pi-book', iconColor: 'text-orange-400', bgColor: 'bg-orange-50' },
    { icon: 'pi pi-arrow-up', iconColor: 'text-green-500', bgColor: 'bg-green-50' },
  ];

  insights = signal<Array<{ icon: string; iconColor: string; bgColor: string; text: string }>>([]);

  computeInsights(year: string | null): void {
    const filtered = year
      ? this.rawData.filter(r => r['السنة ميلادي'] === year)
      : this.rawData;

    const parseNum = (v: string) => parseInt(v?.replace(/,/g, '') || '0', 10);
    //biggest Region
    const byRegion: Record<string, number> = {};
    filtered.forEach(r => {
      byRegion[r['المنطقة الإدارية']] =
        (byRegion[r['المنطقة الإدارية']] ?? 0) + parseNum(r['طلبة']);
    });
    const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];

    // Total students (for percentage calcs)
    const totalStudents = filtered.reduce((s, r) => s + parseNum(r['طلبة']), 0);
    // largest education stage
    const byStage: Record<string, number> = {};
    filtered.forEach(r => {
      byStage[r['المرحلة']] = (byStage[r['المرحلة']] ?? 0) + parseNum(r['طلبة']);
    });
    const topStage = Object.entries(byStage).sort((a, b) => b[1] - a[1])[0];
    const stagePct = totalStudents
      ? ((topStage[1] / totalStudents) * 100).toFixed(1)
      : '0';

    // Insight 4: Fastest growth region (all years) OR Private sector share (for specific year)
    let insight4: string;
    if (!year) {
      const byRegionYear: Record<string, Record<string, number>> = {};
      this.rawData.forEach(r => {
        const reg = r['المنطقة الإدارية'];
        const yr = r['السنة ميلادي'];
        byRegionYear[reg] ??= {};
        byRegionYear[reg][yr] = (byRegionYear[reg][yr] ?? 0) + parseNum(r['طلبة']);
      });
      let maxGrowth = -Infinity;
      let fastestRegion = '';
      Object.entries(byRegionYear).forEach(([reg, years]) => {
        const sorted = Object.keys(years).sort();
        if (sorted.length < 2) return;
        const first = years[sorted[0]];
        const last = years[sorted[sorted.length - 1]];
        const growth = first ? ((last - first) / first) * 100 : 0;
        if (growth > maxGrowth) { maxGrowth = growth; fastestRegion = reg; }
      });
      insight4 = `${fastestRegion} recorded the fastest student growth across all years (+${maxGrowth.toFixed(1)}%).`;
    } else {
      const privateStudents = filtered
        .filter(r => r['القطاع'] === 'خاص')
        .reduce((s, r) => s + parseNum(r['طلبة']), 0);
      const privatePct = totalStudents
        ? ((privateStudents / totalStudents) * 100).toFixed(1)
        : '0';
      insight4 = `Private sector accounts for ${privatePct}% of total students in ${year}.`;
    }

    const texts = [
      `${topRegion[0]} had the highest student count${year ? ` in ${year}` : ''} with ${topRegion[1].toLocaleString()} students.`,
      `${topStage[0]} is the largest education stage at ${stagePct}% of total students.`,
      insight4,
    ];

    this.insights.set(
      texts.map((text, i) => ({ ...this.iconStyles[i], text }))
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────

  ngOnInit(): void {
    this.getStudents();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  // get data and listen to filter changes
  getStudents(): void {
    this.studentsService.getStudents().pipe(
      takeUntil(this.destroy$),
      switchMap(data => {
        this.rawData = data;
        return combineLatest([this.filterService.year$, this.filterService.region$]);
      }),
    ).subscribe(([year, region]) => {
      this.activeYear = year;
      this.activeRegion = region;
      this.refreshData();
    });
  }

  refreshData(): void {
    this.calculateKPIs();
    this.buildAllCharts();
    this.computeInsights(this.activeYear);
    this.cdr.detectChanges();
  }
  // ── Public Helpers (template) ─────────────────────────────

  getBarWidth(value: string): number {
    const num = parseInt(value.replace(/,/g, ''), 10);
    return (num / this.maxRegionValue) * 100;
  }

  formatNum(n: number): string {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toLocaleString();
  }

  // ── Private: KPIs ─────────────────────────────────────────

  private calculateKPIs(): void {
    const filtered = this.getFilteredData();

    const total = this.sumStudents(filtered);
    const female = this.sumStudents(filtered.filter(i => i['جنس المدرسة'] === 'بنات'));
    const male = this.sumStudents(filtered.filter(i => i['جنس المدرسة'] === 'بنين'));

    this.malePct = total > 0 ? Math.round((male / total) * 100) : 0;
    this.femalePct = total > 0 ? Math.round((female / total) * 100) : 0;
    this.totalStudents = total;

    const largestRegion = this.getLargestRegion();
    const subLabel = this.activeYear ? `Year ${this.activeYear}` : '2016 – 2024  All Years';

    this.kpis = [
      {
        label: 'dashboard.total_Students', value: this.formatNum(total), sub: subLabel,
        icon: 'pi pi-graduation-cap', iconBg: 'bg-teal-50', iconColor: 'text-teal-500',
      },
      {
        label: 'dashboard.growthRate', value: this.calcGrowthRate(), sub: 'since 2016',
        icon: 'pi pi-arrow-up-right', iconBg: 'bg-green-50', iconColor: 'text-green-500',
        highlight: true,
      },
      {
        label: 'dashboard.female_Students', value: this.formatNum(female), sub: `${this.femalePct}% of total`,
        icon: 'pi pi-user', iconBg: 'bg-pink-50', iconColor: 'text-pink-400',
      },
      {
        label: 'dashboard.male_Students', value: this.formatNum(male), sub: `${this.malePct}% of total`,
        icon: 'pi pi-user', iconBg: 'bg-blue-50', iconColor: 'text-blue-400',
      },
      {
        label: 'dashboard.largest_Region',
        value: largestRegion.name || '—',
        sub: largestRegion.count ? `${this.formatNum(largestRegion.count)} students` : '',
        icon: 'pi pi-map-marker', iconBg: 'bg-cyan-50', iconColor: 'text-cyan-500',
      },
    ];

    // Gender doughnut data lives here (depends on malePct / femalePct)
    this.genderDoughnutData = {
      labels: ['Male', 'Female'],
      datasets: [{
        data: [this.malePct, this.femalePct],
        backgroundColor: ['#2dd4bf', '#e2e8f0'],
        borderWidth: 0,
        hoverOffset: 4,
      }],
    };

    this.genderDoughnutOptions = {
      responsive: true, maintainAspectRatio: false, cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
    };
  }

  // ── Private: Charts ───────────────────────────────────────

  private buildAllCharts(): void {
    this.buildTrendChart();
    this.buildGenderTrendChart();
    this.buildGrowthTrendChart();
    this.buildEducationStageChart();
    this.buildGeneralDistChart();
    this.buildRegionBars();
    this.buildDrillDown();
  }

  private buildTrendChart(): void {
    const totals = this.ALL_YEARS.map(y => this.sumByYear(this.rawData, y));

    this.trendData = {
      labels: [...this.ALL_YEARS],
      datasets: [{
        label: 'Total', data: totals,
        borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.15)',
        tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#2dd4bf',
      }],
    };
    this.trendOptions = this.makeLineOptions(false);
  }

  private buildGenderTrendChart(): void {
    const maleTrend = this.ALL_YEARS.map(y => this.sumByYearGender(y, 'بنين'));
    const femaleTrend = this.ALL_YEARS.map(y => this.sumByYearGender(y, 'بنات'));

    this.genderTrendData = {
      labels: [...this.ALL_YEARS],
      datasets: [
        { label: 'Male', data: maleTrend, borderColor: '#93c5fd', backgroundColor: 'rgba(147,197,253,0.1)', tension: 0.4, fill: false, pointRadius: 3 },
        { label: 'Female', data: femaleTrend, borderColor: '#f9a8d4', backgroundColor: 'rgba(249,168,212,0.1)', tension: 0.4, fill: false, pointRadius: 3 },
      ],
    };
    this.genderTrendOptions = this.makeLineOptions(true);
  }

  private buildGrowthTrendChart(): void {
    const topRegion = this.getLargestRegion().name;
    const growthTotals = this.ALL_YEARS.map(y =>
      this.rawData
        .filter(i => String(i['السنة ميلادي']) === y && i['المنطقة الإدارية'] === topRegion)
        .reduce((s, i) => s + this.parseNum(i['طلبة']), 0)
    );

    this.growthTrendData = {
      labels: [...this.ALL_YEARS],
      datasets: [{
        label: topRegion, data: growthTotals,
        borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.15)',
        tension: 0.4, fill: true, pointRadius: 3,
      }],
    };
    this.growthTrendOptions = this.makeLineOptions(false);
  }

  private buildEducationStageChart(): void {
    const datasets = this.EDUCATION_STAGES.map(stage => ({
      label: stage.label,
      data: this.ALL_YEARS.map(y =>
        this.rawData
          .filter(i => String(i['السنة ميلادي']) === y && i['المرحلة'] === stage.arabic)
          .reduce((s, i) => s + this.parseNum(i['طلبة']), 0)
      ),
      backgroundColor: stage.color,
      borderRadius: 2,
    }));

    this.educationStageData = { labels: [...this.ALL_YEARS], datasets };
    this.educationStageOptions = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { stacked: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      },
    };
  }

  private buildGeneralDistChart(): void {
    const totalAll = this.sumStudents(this.rawData);
    const stagePcts = this.EDUCATION_STAGES.map(stage => {
      const count = this.rawData
        .filter(i => i['المرحلة'] === stage.arabic)
        .reduce((s, i) => s + this.parseNum(i['طلبة']), 0);
      return { label: stage.label, pct: totalAll > 0 ? Math.round((count / totalAll) * 100) : 0 };
    });

    this.generalDistData = {
      labels: stagePcts.map(s => s.label),
      datasets: [{
        label: 'Distribution',
        data: stagePcts.map(s => s.pct),
        backgroundColor: this.EDUCATION_STAGES.map(s => s.color),
        borderRadius: 4,
      }],
    };
    this.generalDistOptions = {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } }, max: 70 },
        y: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
      },
    };
  }

  private buildRegionBars(): void {
    const regionMap = this.buildRegionMap(this.rawData);
    const sorted = Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 7);

    this.maxRegionValue = sorted[0]?.[1] ?? 1;
    this.regions = sorted.map(([name, count]) => ({
      name,
      value: count.toLocaleString(),
      color: '#2dd4bf',
    }));
  }

  private buildDrillDown(): void {
    if (!this.rawData.length) return;

    const lastYear = this.activeYear ?? this.ALL_YEARS[this.ALL_YEARS.length - 1];
    const lastYearIndex = this.ALL_YEARS.indexOf(lastYear as any);
    const prevYear = lastYearIndex > 0
      ? this.ALL_YEARS[lastYearIndex - 1]
      : this.ALL_YEARS[0];

    const topRegion = this.activeRegion
      ? this.toArabicRegion(this.activeRegion)
      : this.getLargestRegion().name;

    const total = this.sumByYearRegion(lastYear, topRegion);
    const prevTotal = this.sumByYearRegion(prevYear, topRegion);
    const growthNum = prevTotal > 0
      ? (((total - prevTotal) / prevTotal) * 100).toFixed(1)
      : '0';

    const stages = this.EDUCATION_STAGES.map(stage => {
      const current = this.rawData.filter(i =>
        i['المنطقة الإدارية'] === topRegion &&
        String(i['السنة ميلادي']) === lastYear &&
        i['المرحلة'] === stage.arabic
      ).reduce((s, i) => s + this.parseNum(i['طلبة']), 0);

      const previous = this.rawData.filter(i =>
        i['المنطقة الإدارية'] === topRegion &&
        String(i['السنة ميلادي']) === prevYear &&
        i['المرحلة'] === stage.arabic
      ).reduce((s, i) => s + this.parseNum(i['طلبة']), 0);

      const pct = total > 0 ? ((current / total) * 100).toFixed(1) + '%' : '0%';
      const trendNum = previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : '0';
      const arrow = parseFloat(trendNum) >= 0 ? '▲' : '▼';

      return {
        label: stage.label, pct, current, previous,
        trend: `${arrow}${Math.abs(parseFloat(trendNum)).toFixed(1)}%`,
      };
    });

    const dataForYear = this.rawData.filter(i =>
      String(i['السنة ميلادي']) === lastYear
    );
    const regionMap = this.buildRegionMap(dataForYear);
    const top3 = Object.entries(regionMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const totalAll = this.sumByYear(this.rawData, lastYear);

    this.drillStats = top3.map(([name]) => {
      const curr = this.sumByYearRegion(lastYear, name);
      const prev = this.sumByYearRegion(prevYear, name);
      const diff = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : '0';
      const sign = Number(diff) >= 0 ? '+' : '';
      const pct = totalAll > 0 ? ((curr / totalAll) * 100).toFixed(0) + '%' : '0%';

      return {
        label: name,
        pct,
        current: curr.toLocaleString(),
        previous: prev.toLocaleString(),
        trend: `${sign}${diff}%`,
      };
    });

    this.drillDown = {
      regionName: topRegion,
      total,
      previousTotal: prevTotal,
      growthPct: `${Number(growthNum) >= 0 ? '+' : ''}${growthNum}%`,
      stages,
    };
  }

  // ── Private: Data Helpers ─────────────────────────────────

  private getFilteredData(): any[] {
    return this.rawData.filter(item => {
      const matchYear = !this.activeYear || String(item['السنة ميلادي']) === String(this.activeYear);
      const matchRegion = !this.activeRegion || item['المنطقة الإدارية'] === this.toArabicRegion(this.activeRegion);
      return matchYear && matchRegion;
    });
  }

  private buildRegionMap(data: any[]): Record<string, number> {
    return data.reduce<Record<string, number>>((acc, item) => {
      const r = item['المنطقة الإدارية'];
      if (r) acc[r] = (acc[r] || 0) + this.parseNum(item['طلبة']);
      return acc;
    }, {});
  }

  private getLargestRegion(): { name: string; count: number } {
    const dataByYear = this.activeYear
      ? this.rawData.filter(i => String(i['السنة ميلادي']) === String(this.activeYear))
      : this.rawData;

    const regionMap = this.buildRegionMap(dataByYear);
    const [name = '', count = 0] = Object.entries(regionMap).reduce(
      (best, cur) => cur[1] > best[1] ? cur : best,
      ['', 0]
    );
    return { name, count };
  }

  private calcGrowthRate(): string {
    if (!this.rawData.length) return '—';

    const byYear = this.rawData.reduce<Record<string, number>>((acc, item) => {
      const y = String(item['السنة ميلادي']);
      acc[y] = (acc[y] || 0) + this.parseNum(item['طلبة']);
      return acc;
    }, {});

    const years = Object.keys(byYear).sort();
    if (years.length < 2) return '—';

    const first = byYear[years[0]];
    const target = byYear[this.activeYear ?? years[years.length - 1]];
    if (!first || !target) return '—';

    const pct = (((target - first) / first) * 100).toFixed(0);
    return `${Number(pct) >= 0 ? '+' : ''}${pct}%`;
  }

  private sumStudents(data: any[]): number {
    return data.reduce((s, i) => s + this.parseNum(i['طلبة']), 0);
  }

  private sumByYear(data: any[], year: string): number {
    return data.filter(i => String(i['السنة ميلادي']) === year).reduce((s, i) => s + this.parseNum(i['طلبة']), 0);
  }

  private sumByYearGender(year: string, gender: string): number {
    return this.rawData
      .filter(i => String(i['السنة ميلادي']) === year && i['جنس المدرسة'] === gender)
      .reduce((s, i) => s + this.parseNum(i['طلبة']), 0);
  }

  private sumByYearRegion(year: string, region: string): number {
    return this.rawData
      .filter(i => String(i['السنة ميلادي']) === year && i['المنطقة الإدارية'] === region)
      .reduce((s, i) => s + this.parseNum(i['طلبة']), 0);
  }

  private parseNum(val: any): number {
    return parseInt(String(val ?? '').replace(/,/g, ''), 10) || 0;
  }

  private toArabicRegion(key: string): string {
    return this.REGION_MAP[key] ?? key;
  }

  // ── Private: Chart Option Factories ──────────────────────

  private makeLineOptions(showLegend: boolean): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top',
          align: 'end',
          labels: { color: '#64748b', usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      },
    };
  }
}
