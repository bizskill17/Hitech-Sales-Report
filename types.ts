
export interface RawSalesRecord {
  date: string;
  invoice: string;
  customer: string;
  salesperson: string;
  item: string;
  brand: string;
  qty: number;
  packSize: number;
  status: string;
  totalQty: number;
}

export interface Filters {
  dateFrom: string;
  dateTo: string;
  customers: string[];
  brands: string[];
  salespersons: string[];
  items: string[];
  statuses: string[];
  fiscalYears: number[];
  months: number[];
}

export interface SummaryRow {
  customer: string;
  brand: string;
  salesperson: string;
  quantity: number;
}

export interface PivotRow {
  customer: string;
  brand: string;
  salesperson: string;
  total: number;
  [key: string]: string | number;
}

export interface NotVisitedCustomer {
  customer: string;
  salesperson: string;
  lastVisited: string;
  daysSinceLastVisit: number;
  lastQuantity: number;
}

export interface CustomerVisitPlan {
  visitDate: string;
  owner: string;
  note: string;
}

export enum TabType {
  SUMMARY = 'summary',
  M2M = 'monthToMonth',
  Y2Y = 'yearToYear',
  NOT_VISITED = 'notVisited'
}
