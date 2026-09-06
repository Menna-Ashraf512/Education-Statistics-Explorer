export interface IKpiCard {
  label: string;
  value: string;
  sub: string;
  subParams?: Record<string, string | number>;
  icon: string;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
}

export interface IRegionBar {
  name: string;
  value: string;
  color: string;
}

export interface IDrillStat {
  label: string;
  pct: string;
  current: string;
  previous: string;
  trend: string;
}

export interface IDrillDown {
  regionName: string;
  total: number;
  previousTotal: number;
  growthPct: string;
  stages: {
    label: string;
    pct: string;
    current: number;
    previous: number;
    trend: string;
  }[];
}
