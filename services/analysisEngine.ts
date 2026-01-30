
import { RawSalesRecord, Filters, PivotRow, SummaryRow } from '../types.ts';
import { parseDate, getFiscalYearStart } from './dataService.ts';
import { SHORT_MONTH_NAMES, MONTH_NAMES } from '../constants.tsx';

export const filterData = (data: RawSalesRecord[], filters: Filters): RawSalesRecord[] => {
  return data.filter(row => {
    const date = parseDate(row.date);
    if (!date) return false;

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      if (date < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      if (date > to) return false;
    }

    if (filters.customers.length > 0 && !filters.customers.includes(row.customer)) return false;
    if (filters.brands.length > 0 && !filters.brands.includes(row.brand)) return false;
    if (filters.salespersons.length > 0 && !filters.salespersons.includes(row.salesperson)) return false;
    if (filters.items.length > 0 && !filters.items.includes(row.item)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(row.status)) return false;

    const fy = getFiscalYearStart(date);
    if (filters.fiscalYears.length > 0 && !filters.fiscalYears.includes(fy)) return false;

    const month = date.getMonth() + 1;
    if (filters.months.length > 0 && !filters.months.includes(month)) return false;

    return true;
  });
};

export const getSummaryData = (data: RawSalesRecord[]): SummaryRow[] => {
  const grouped = data.reduce((acc, row) => {
    const key = `${row.customer}|${row.brand}|${row.salesperson}`;
    if (!acc[key]) {
      acc[key] = { customer: row.customer, brand: row.brand, salesperson: row.salesperson, quantity: 0 };
    }
    acc[key].quantity += row.totalQty;
    return acc;
  }, {} as Record<string, SummaryRow>);

  return Object.values(grouped).sort((a, b) => b.quantity - a.quantity);
};

export const getM2MData = (data: RawSalesRecord[]): { pivotData: PivotRow[], monthHeaders: string[] } => {
  const monthYearMap = new Map<string, { m: number, y: number, label: string }>();
  
  data.forEach(row => {
    const date = parseDate(row.date);
    if (date) {
      const m = date.getMonth();
      const y = date.getFullYear();
      const key = `${m + 1}/${y}`;
      if (!monthYearMap.has(key)) {
        const shortMonth = SHORT_MONTH_NAMES[m].toUpperCase();
        const shortYear = String(y).slice(-2);
        monthYearMap.set(key, {
          m,
          y,
          label: `${shortMonth}-${shortYear}`
        });
      }
    }
  });

  const sortedMonthInfo = Array.from(monthYearMap.values()).sort((a, b) => {
    return a.y !== b.y ? a.y - b.y : a.m - b.m;
  });

  const monthHeaders = sortedMonthInfo.map(info => info.label);

  const grouped = data.reduce((acc, row) => {
    const key = `${row.customer}|${row.brand}|${row.salesperson}`;
    const date = parseDate(row.date);
    if (!date) return acc;
    
    const m = date.getMonth();
    const y = date.getFullYear();
    const shortMonth = SHORT_MONTH_NAMES[m].toUpperCase();
    const shortYear = String(y).slice(-2);
    const myLabel = `${shortMonth}-${shortYear}`;

    if (!acc[key]) {
      acc[key] = { customer: row.customer, brand: row.brand, salesperson: row.salesperson, total: 0 };
      monthHeaders.forEach(header => acc[key][header] = 0);
    }

    acc[key][myLabel] = (acc[key][myLabel] as number || 0) + row.totalQty;
    acc[key].total += row.totalQty;
    return acc;
  }, {} as Record<string, PivotRow>);

  return {
    pivotData: Object.values(grouped).sort((a, b) => b.total - a.total),
    monthHeaders
  };
};

export const getY2YData = (data: RawSalesRecord[]) => {
  const fiscalMonthOrder = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
  const fySet = new Set<number>();
  
  data.forEach(row => {
    const date = parseDate(row.date);
    if (date) fySet.add(getFiscalYearStart(date));
  });

  const sortedFYs = Array.from(fySet).sort((a, b) => a - b);
  
  const grouped = data.reduce((acc, row) => {
    const key = `${row.customer}|${row.brand}|${row.salesperson}`;
    const date = parseDate(row.date);
    if (!date) return acc;

    const fy = getFiscalYearStart(date);
    const monthIdx = date.getMonth();
    const monthName = SHORT_MONTH_NAMES[monthIdx];
    const fyKey = `${fy}-${monthName}`;
    const fyTotalKey = `total-fy-${fy}`;

    if (!acc[key]) {
      acc[key] = { customer: row.customer, brand: row.brand, salesperson: row.salesperson, total: 0 };
    }

    acc[key][fyKey] = (acc[key][fyKey] as number || 0) + row.totalQty;
    acc[key][fyTotalKey] = (acc[key][fyTotalKey] as number || 0) + row.totalQty;
    acc[key].total += row.totalQty;
    return acc;
  }, {} as Record<string, PivotRow>);

  return {
    pivotData: Object.values(grouped).sort((a, b) => b.total - a.total),
    fiscalYears: sortedFYs,
    monthOrder: fiscalMonthOrder.map(idx => SHORT_MONTH_NAMES[idx])
  };
};
