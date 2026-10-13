
import React, { useState, useEffect, useMemo } from 'react';
import { RawSalesRecord, Filters, TabType } from './types.ts';
import { fetchDataFromSource, getFiscalYearStart, getFiscalYearDisplay } from './services/dataService.ts';
import { filterData, getCustomersNotVisited, getM2MData, getY2YData, getSummaryData } from './services/analysisEngine.ts';
import { MultiSelect } from './components/MultiSelect.tsx';
import { DrillDownModal } from './components/DrillDownModal.tsx';
import { MONTH_NAMES } from './constants.tsx';

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzJtYtjYi9qRtioYYquAobvWT9FifJWTo_zaz_Du-bKpQdyEmAXLF2oaGAW6FUjxA6A/exec';

const initialFilters: Filters = {
  dateFrom: '',
  dateTo: '',
  customers: [],
  brands: [],
  salespersons: [],
  items: [],
  statuses: [],
  fiscalYears: [],
  months: []
};

const formatDisplayDate = (date: string) => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
};

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const App: React.FC = () => {
  const [rawData, setRawData] = useState<RawSalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.SUMMARY);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const [drillDownInfo, setDrillDownInfo] = useState<{ customer: string; brand: string } | null>(null);

  const [tabFilters, setTabFilters] = useState<Record<TabType, Filters>>({
    [TabType.SUMMARY]: { ...initialFilters },
    [TabType.M2M]: { ...initialFilters },
    [TabType.Y2Y]: { ...initialFilters },
    [TabType.NOT_VISITED]: { ...initialFilters }
  });

  const currentFilters = tabFilters[activeTab];

  // Default sort is null, handled in sortData to be Customer then Brand
  useEffect(() => {
    setSortConfig(null);
  }, [activeTab]);

  const updateCurrentFilters = (updates: Partial<Filters>) => {
    setTabFilters(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...updates }
    }));
  };

  const handleSyncData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const data = await fetchDataFromSource(BACKEND_URL);
      if (Array.isArray(data)) {
        setRawData(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Sync Error", err);
      if (!silent) alert("Sync Error. Please check your network or script deployment.");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await handleSyncData(true);
      setLoading(false);
    };
    init();
  }, []);

  const filterOptions = useMemo(() => ({
    customers: [...new Set(rawData.map(r => r.customer))].sort(),
    brands: [...new Set(rawData.map(r => r.brand))].sort(),
    salespersons: [...new Set(rawData.map(r => r.salesperson))].sort(),
    items: [...new Set(rawData.map(r => r.item))].sort(),
    statuses: [...new Set(rawData.map(r => r.status))].sort(),
    fiscalYears: Array.from(new Set(rawData.map(r => getFiscalYearStart(new Date(r.date))))).sort((a: number, b: number) => b - a),
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }), [rawData]);

  const filteredData = useMemo(() => filterData(rawData, currentFilters), [rawData, currentFilters]);

  /**
   * Enhanced sortData:
   * 1. If no config, sorts by Customer (ASC) then Brand (ASC).
   * 2. If config provided, sorts by that key.
   */
  const sortData = <T extends any>(data: T[], config: SortConfig | null): T[] => {
    const sorted = [...data];
    if (!config) {
      return sorted.sort((a, b) => {
        const custA = String((a as any).customer || '').toLowerCase();
        const custB = String((b as any).customer || '').toLowerCase();
        if (custA !== custB) return custA.localeCompare(custB);
        
        const brandA = String((a as any).brand || '').toLowerCase();
        const brandB = String((b as any).brand || '').toLowerCase();
        return brandA.localeCompare(brandB);
      });
    }

    return sorted.sort((a, b) => {
      let valA = (a as any)[config.key];
      let valB = (b as any)[config.key];

      // Handle strings
      if (typeof valA === 'string' && typeof valB === 'string') {
        const res = valA.toLowerCase().localeCompare(valB.toLowerCase());
        return config.direction === 'asc' ? res : -res;
      }

      // Handle numbers
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
      if (valA === valB) return 0;
      const res = valA < valB ? -1 : 1;
      return config.direction === 'asc' ? res : -res;
    });
  };

  const handleSortToggle = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key: string) => {
    const isActive = sortConfig?.key === key;
    return (
      <div className="flex flex-col ml-2 -space-y-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <i className={`fas fa-chevron-up text-[8px] ${isActive && sortConfig.direction === 'asc' ? 'text-white scale-110' : 'text-white/20'}`}></i>
        <i className={`fas fa-chevron-down text-[8px] ${isActive && sortConfig.direction === 'desc' ? 'text-white scale-110' : 'text-white/20'}`}></i>
      </div>
    );
  };

  const summaryData = useMemo(() => {
    const rawSummary = getSummaryData(filteredData);
    return sortData(rawSummary, sortConfig);
  }, [filteredData, sortConfig]);

  const m2m = useMemo(() => {
    const rawM2m = getM2MData(filteredData);
    return {
      ...rawM2m,
      pivotData: sortData(rawM2m.pivotData, sortConfig)
    };
  }, [filteredData, sortConfig]);

  const y2y = useMemo(() => {
    const rawY2y = getY2YData(filteredData);
    return {
      ...rawY2y,
      pivotData: sortData(rawY2y.pivotData, sortConfig)
    };
  }, [filteredData, sortConfig]);

  const notVisitedCustomers = useMemo(() => {
    return sortData(getCustomersNotVisited(rawData, currentFilters), sortConfig);
  }, [rawData, currentFilters, sortConfig]);

  const totalQty = useMemo(() => filteredData.reduce((sum, r) => sum + r.totalQty, 0), [filteredData]);

  const clearFilters = () => {
    updateCurrentFilters(initialFilters);
  };

  const escapeCSV = (val: any) => {
    const str = String(val === null || val === undefined ? '' : val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadExcel = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `sales_analysis_${activeTab}`;

    const getFilterString = () => {
      const parts = [];
      if (currentFilters.dateFrom) parts.push(`From: ${currentFilters.dateFrom}`);
      if (currentFilters.dateTo) parts.push(`To: ${currentFilters.dateTo}`);
      if (currentFilters.customers.length) parts.push(`Customers: ${currentFilters.customers.join('|')}`);
      if (currentFilters.brands.length) parts.push(`Brands: ${currentFilters.brands.join('|')}`);
      if (currentFilters.salespersons.length) parts.push(`Salespersons: ${currentFilters.salespersons.join('|')}`);
      if (currentFilters.items.length) parts.push(`Items: ${currentFilters.items.join('|')}`);
      return parts.length ? `Filters Applied: ${parts.join('; ')}` : 'Filters Applied: None';
    };

    if (activeTab === TabType.SUMMARY) {
      headers = ["Customer", "Brand", "Sales Person", "Total Quantity"];
      rows = summaryData.map(r => [r.customer, r.brand, r.salesperson, r.quantity]);
      const totalRow = ["TOTAL", "", "", summaryData.reduce((acc, r) => acc + r.quantity, 0)];
      rows.push(totalRow);
    } else if (activeTab === TabType.M2M) {
      headers = ["Customer", "Brand", "Sales Person", ...m2m.monthHeaders, "Total"];
      rows = m2m.pivotData.map(row => [
        row.customer,
        row.brand,
        row.salesperson,
        ...m2m.monthHeaders.map(h => row[h] || 0),
        row.total
      ]);
      const totalRow = ["TOTAL", "", ""];
      m2m.monthHeaders.forEach(h => {
        totalRow.push(m2m.pivotData.reduce((acc, r) => acc + (r[h] as number || 0), 0));
      });
      totalRow.push(m2m.pivotData.reduce((acc, r) => acc + r.total, 0));
      rows.push(totalRow);
    } else if (activeTab === TabType.Y2Y) {
      headers = ["Customer", "Brand", "Sales Person"];
      const numericKeys: string[] = [];
      y2y.monthOrder.forEach(month => {
        y2y.fiscalYears.forEach(fy => {
          headers.push(`${month} (${getFiscalYearDisplay(fy)})`);
          numericKeys.push(`${fy}-${month}`);
        });
      });
      // Add FY totals headers
      y2y.fiscalYears.forEach(fy => {
        headers.push(`Total ${getFiscalYearDisplay(fy)}`);
      });
      headers.push("Grand Total");

      rows = y2y.pivotData.map(row => {
        const rowData = [row.customer, row.brand, row.salesperson];
        numericKeys.forEach(key => rowData.push(row[key] || 0));
        y2y.fiscalYears.forEach(fy => rowData.push(row[`total-fy-${fy}`] || 0));
        rowData.push(row.total);
        return rowData;
      });

      const totalRow = ["TOTAL", "", ""];
      numericKeys.forEach(key => {
        totalRow.push(y2y.pivotData.reduce((acc, r) => acc + (r[key] as number || 0), 0));
      });
      y2y.fiscalYears.forEach(fy => {
        totalRow.push(y2y.pivotData.reduce((acc, r) => acc + (r[`total-fy-${fy}`] as number || 0), 0));
      });
      totalRow.push(y2y.pivotData.reduce((acc, r) => acc + r.total, 0));
      rows.push(totalRow);
    } else if (activeTab === TabType.NOT_VISITED) {
      headers = ['Customer', 'Last Sales Person', 'Last Activity', 'Last Quantity'];
      rows = notVisitedCustomers.map(row => [row.customer, row.salesperson, formatDisplayDate(row.lastVisited), row.lastQuantity]);
    }

    const metadataHeader = [escapeCSV(getFilterString())];
    const csvContent = [
      metadataHeader.join(","),
      "", 
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollAmount = 60;
    if (e.key === 'ArrowLeft') {
      container.scrollLeft -= scrollAmount;
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      container.scrollLeft += scrollAmount;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      container.scrollTop -= scrollAmount;
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      container.scrollTop += scrollAmount;
      e.preventDefault();
    }
  };

  const drillDownData = useMemo(() => {
    if (!drillDownInfo) return [];
    return filteredData.filter(r => r.customer === drillDownInfo.customer && r.brand === drillDownInfo.brand);
  }, [drillDownInfo, filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6f9] pb-12 text-slate-900 font-sans">
      <div className="max-w-[1400px] mx-auto px-4 pt-6">
        
        <div className="flex justify-center items-center mb-10 px-1 animate-tab-content">
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">Sales Analysis</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mb-8">
          {[
            { id: TabType.SUMMARY, label: 'Sales Summary' },
            { id: TabType.M2M, label: 'Month-to-Month' },
            { id: TabType.Y2Y, label: 'Year-to-Year' },
            { id: TabType.NOT_VISITED, label: 'Customer Not Visited' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-4 text-[15px] font-bold rounded-t-lg transition-all border-b-4 ${
                activeTab === tab.id 
                ? 'bg-[#3498db] text-white border-blue-600 shadow-md' 
                : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Container - Added z-30 relative to prevent dropdown hide inside table */}
        <div key={`filters-${activeTab}`} className="bg-white rounded-xl shadow-sm p-8 mb-8 border border-slate-200 animate-tab-content relative z-30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
            {(activeTab === TabType.SUMMARY || activeTab === TabType.NOT_VISITED) && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-600">Invoice Date From</label>
                  <input 
                    type="date" 
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" 
                    value={currentFilters.dateFrom} 
                    onChange={e => updateCurrentFilters({ dateFrom: e.target.value })} 
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-slate-600">Invoice Date To</label>
                  <input 
                    type="date" 
                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" 
                    value={currentFilters.dateTo} 
                    onChange={e => updateCurrentFilters({ dateTo: e.target.value })} 
                  />
                </div>
              </>
            )}
            
            {activeTab !== TabType.NOT_VISITED && (
              <>
                <MultiSelect
                  label="Customer Name"
                  options={filterOptions.customers}
                  selected={currentFilters.customers}
                  onChange={v => updateCurrentFilters({ customers: v })}
                />

                <MultiSelect
                  label="Sales Person"
                  options={filterOptions.salespersons}
                  selected={currentFilters.salespersons}
                  onChange={v => updateCurrentFilters({ salespersons: v })}
                />

                <MultiSelect
                  label="Item Name"
                  options={filterOptions.items}
                  selected={currentFilters.items}
                  onChange={v => updateCurrentFilters({ items: v })}
                />

                <MultiSelect
                  label="Brand"
                  options={filterOptions.brands}
                  selected={currentFilters.brands}
                  onChange={v => updateCurrentFilters({ brands: v })}
                />
              </>
            )}
            
            {(activeTab === TabType.M2M || activeTab === TabType.Y2Y) && (
              <>
                <MultiSelect 
                  label="Financial Year" 
                  options={filterOptions.fiscalYears.map(fy => getFiscalYearDisplay(fy))} 
                  selected={currentFilters.fiscalYears.map(fy => getFiscalYearDisplay(fy))} 
                  onChange={v => {
                    const selectedFYs = filterOptions.fiscalYears.filter(fy => v.includes(getFiscalYearDisplay(fy)));
                    updateCurrentFilters({ fiscalYears: selectedFYs });
                  }} 
                />
                <MultiSelect 
                  label="Month" 
                  options={MONTH_NAMES} 
                  selected={currentFilters.months.map(m => MONTH_NAMES[m-1])} 
                  onChange={v => updateCurrentFilters({ months: v.map(name => MONTH_NAMES.indexOf(name) + 1) })} 
                />
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <div className="flex gap-3">
              <button 
                onClick={downloadExcel}
                className="px-8 py-2.5 bg-[#3498db] text-white text-sm font-bold rounded-lg hover:bg-blue-600 shadow-sm active:scale-95 transition-all"
              >
                Download Excel
              </button>
              <button 
                onClick={clearFilters}
                className="px-8 py-2.5 bg-[#e74c3c] text-white text-sm font-bold rounded-lg hover:bg-red-600 shadow-sm active:scale-95 transition-all"
              >
                Clear Filters
              </button>
            </div>
            {activeTab !== TabType.NOT_VISITED && (
              <div className="bg-[#ebf5fb] px-6 py-2.5 rounded-lg border border-blue-100">
                <span className="text-sm font-bold text-slate-700">Total Qty: </span>
                <span className="text-sm font-black text-blue-600">{totalQty.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Container - Added relative z-10 */}
        <div key={`content-${activeTab}`} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-tab-content relative z-10">
          {activeTab !== TabType.NOT_VISITED && (
            <div className="px-8 py-5 border-b border-slate-100 bg-white flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                {activeTab === TabType.SUMMARY && 'Sales Summary'}
                {activeTab === TabType.M2M && 'Month-to-Month Analysis'}
                {activeTab === TabType.Y2Y && 'Year-to-Year Analysis'}
              </h2>
              <p className="text-xs text-slate-400 font-medium italic">
                Default sort by Customer then Brand. Showing records based on active filters for this tab
              </p>
            </div>
          )}

          <div 
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            className="overflow-auto custom-scrollbar max-h-[600px] outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          >
            {activeTab === TabType.SUMMARY && (
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#34495e] text-white">
                    <th onClick={() => handleSortToggle('customer')} className="group px-8 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none transition-colors">
                      <div className="flex items-center justify-between"><span>CUSTOMER</span> {renderSortIcon('customer')}</div>
                    </th>
                    <th onClick={() => handleSortToggle('brand')} className="group px-8 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none transition-colors">
                      <div className="flex items-center justify-between"><span>BRAND</span> {renderSortIcon('brand')}</div>
                    </th>
                    <th onClick={() => handleSortToggle('salesperson')} className="group px-8 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none transition-colors">
                      <div className="flex items-center justify-between"><span>SALES PERSON</span> {renderSortIcon('salesperson')}</div>
                    </th>
                    <th onClick={() => handleSortToggle('quantity')} className="group px-8 py-4 text-xs font-bold uppercase text-right cursor-pointer hover:bg-slate-700 select-none transition-colors">
                      <div className="flex items-center justify-end">TOTAL QUANTITY {renderSortIcon('quantity')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {summaryData.length > 0 ? summaryData.map((row, i) => (
                    <tr key={i} className={`hover:bg-slate-100 transition-colors ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-8 py-4 text-sm font-medium border-r border-slate-200">
                        <button onClick={() => setDrillDownInfo({ customer: row.customer, brand: row.brand })} className="text-blue-600 uppercase hover:underline text-left font-bold">{row.customer}</button>
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500 uppercase border-r border-slate-200">{row.brand}</td>
                      <td className="px-8 py-4 text-sm text-slate-500 uppercase font-medium border-r border-slate-200">{row.salesperson}</td>
                      <td className="px-8 py-4 text-sm font-bold text-slate-900 text-right">{row.quantity.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-8 py-32 text-center text-slate-300">No data found</td></tr>
                  )}
                </tbody>
                {summaryData.length > 0 && (
                  <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-50 font-black text-slate-900 z-10">
                    <tr>
                      <td className="px-8 py-4 text-sm uppercase border-r border-slate-200">Total</td>
                      <td className="px-8 py-4 text-sm border-r border-slate-200"></td>
                      <td className="px-8 py-4 text-sm border-r border-slate-200"></td>
                      <td className="px-8 py-4 text-sm text-right">{summaryData.reduce((acc, r) => acc + r.quantity, 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}

            {activeTab === TabType.M2M && (
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#34495e] text-white">
                    <th onClick={() => handleSortToggle('customer')} className="group px-8 py-4 text-xs font-bold uppercase sticky left-0 bg-[#34495e] z-40 border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none min-w-[220px] w-[220px] transition-colors">
                      <div className="flex items-center justify-between"><span>CUSTOMER</span> {renderSortIcon('customer')}</div>
                    </th>
                    <th onClick={() => handleSortToggle('brand')} className="group px-8 py-4 text-xs font-bold uppercase sticky left-[220px] bg-[#34495e] z-40 border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none min-w-[140px] w-[140px] transition-colors">
                      <div className="flex items-center justify-between"><span>BRAND</span> {renderSortIcon('brand')}</div>
                    </th>
                    <th onClick={() => handleSortToggle('salesperson')} className="group px-8 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none min-w-[150px] transition-colors">
                      <div className="flex items-center justify-between"><span>SALES PERSON</span> {renderSortIcon('salesperson')}</div>
                    </th>
                    {m2m.monthHeaders.map(h => (
                      <th key={h} onClick={() => handleSortToggle(h)} className="group px-6 py-4 text-[10px] font-black uppercase text-center border-r border-slate-500/50 min-w-[120px] cursor-pointer hover:bg-slate-700 select-none transition-colors">
                        <div className="flex items-center justify-center text-center">{h} {renderSortIcon(h)}</div>
                      </th>
                    ))}
                    <th onClick={() => handleSortToggle('total')} className="group px-8 py-4 text-xs font-bold uppercase text-right sticky right-0 bg-[#34495e] z-30 cursor-pointer hover:bg-slate-700 select-none min-w-[100px] transition-colors">
                      <div className="flex items-center justify-end">TOTAL {renderSortIcon('total')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-slate-700">
                  {m2m.pivotData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-100 transition-colors">
                      <td className="px-8 py-4 text-[13px] font-bold sticky left-0 bg-white shadow-sm z-10 border-r border-slate-200 min-w-[220px] w-[220px]">
                        <button onClick={() => setDrillDownInfo({ customer: row.customer, brand: row.brand })} className="text-blue-600 uppercase hover:underline text-left font-bold">{row.customer}</button>
                      </td>
                      <td className="px-8 py-4 text-[13px] text-slate-500 uppercase sticky left-[220px] bg-white shadow-sm z-10 border-r border-slate-200 min-w-[140px] w-[140px]">{row.brand}</td>
                      <td className="px-8 py-4 text-[13px] text-slate-500 uppercase font-medium border-r border-slate-200">{row.salesperson}</td>
                      {m2m.monthHeaders.map(h => {
                        const val = row[h] as number || 0;
                        return <td key={h} className="px-6 py-4 text-xs text-center border-r border-slate-200">{val === 0 ? '-' : val.toLocaleString()}</td>;
                      })}
                      <td className="px-8 py-4 text-sm font-bold text-slate-900 text-right sticky right-0 bg-slate-50 shadow-sm z-10 border-l border-slate-200">{row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                {m2m.pivotData.length > 0 && (
                  <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-50 font-black text-slate-900 z-20">
                    <tr>
                      <td className="px-8 py-4 text-sm uppercase sticky left-0 bg-slate-50 shadow-sm z-30 border-r border-slate-200 min-w-[220px] w-[220px]">Total</td>
                      <td className="px-8 py-4 text-sm sticky left-[220px] bg-slate-50 shadow-sm z-30 border-r border-slate-200 min-w-[140px] w-[140px]"></td>
                      <td className="px-8 py-4 text-sm border-r border-slate-200"></td>
                      {m2m.monthHeaders.map(h => (
                        <td key={h} className="px-6 py-4 text-xs text-center border-r border-slate-200">{m2m.pivotData.reduce((acc, r) => acc + (r[h] as number || 0), 0).toLocaleString()}</td>
                      ))}
                      <td className="px-8 py-4 text-sm text-right sticky right-0 bg-slate-50 shadow-sm z-30 border-l border-slate-200">{m2m.pivotData.reduce((acc, r) => acc + r.total, 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}

            {activeTab === TabType.Y2Y && (
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#34495e] text-white">
                    <th onClick={() => handleSortToggle('customer')} className="group px-8 py-4 text-xs font-bold uppercase sticky left-0 bg-[#34495e] z-40 border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none min-w-[220px] w-[220px] transition-colors">
                      <div className="flex items-center justify-between"><span>CUSTOMER</span> {renderSortIcon('customer')}</div>
                    </th>
                    <th onClick={() => handleSortToggle('brand')} className="group px-8 py-4 text-xs font-bold uppercase sticky left-[220px] bg-[#34495e] z-40 border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none min-w-[140px] w-[140px] transition-colors">
                      <div className="flex items-center justify-between"><span>BRAND</span> {renderSortIcon('brand')}</div>
                    </th>
                    <th onClick={() => handleSortToggle('salesperson')} className="group px-8 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer hover:bg-slate-700 select-none min-w-[150px] transition-colors">
                      <div className="flex items-center justify-between"><span>SALES PERSON</span> {renderSortIcon('salesperson')}</div>
                    </th>
                    {/* Simplified Header: Month and FY on the same horizontal line */}
                    {y2y.monthOrder.map(month => (
                      y2y.fiscalYears.map((fy, fyIdx) => {
                        const key = `${fy}-${month}`;
                        const isLastYearInMonth = fyIdx === y2y.fiscalYears.length - 1;
                        return (
                          <th key={key} onClick={() => handleSortToggle(key)} className={`group px-3 py-4 text-[10px] font-black uppercase text-center border-r border-slate-500/30 cursor-pointer hover:bg-slate-700 select-none transition-colors min-w-[120px] ${isLastYearInMonth ? 'border-r-2 border-slate-500' : ''}`}>
                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <span>{month}</span>
                              <span className="opacity-60 text-[9px]">({getFiscalYearDisplay(fy)})</span>
                              {renderSortIcon(key)}
                            </div>
                          </th>
                        );
                      })
                    ))}
                    {/* FY Wise totals sub-headers on same line */}
                    {y2y.fiscalYears.map((fy) => (
                      <th key={`total-fy-${fy}`} onClick={() => handleSortToggle(`total-fy-${fy}`)} className="group px-3 py-4 text-[10px] font-black uppercase text-center border-r border-slate-500/30 sticky right-0 bg-[#34495e] z-30 cursor-pointer hover:bg-slate-700 select-none min-w-[120px]">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <span>TOTAL</span>
                          <span className="opacity-60 text-[9px]">({getFiscalYearDisplay(fy)})</span>
                          {renderSortIcon(`total-fy-${fy}`)}
                        </div>
                      </th>
                    ))}
                    <th onClick={() => handleSortToggle('total')} className="group px-6 py-4 text-xs font-bold uppercase text-right sticky right-0 bg-[#34495e] z-30 cursor-pointer hover:bg-slate-700 select-none min-w-[120px] transition-colors border-l-2 border-slate-500">
                      <div className="flex items-center justify-end text-center leading-tight whitespace-nowrap">GRAND TOTAL {renderSortIcon('total')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {y2y.pivotData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-100 transition-colors">
                      <td className="px-8 py-4 text-[13px] font-bold sticky left-0 bg-white z-10 shadow-sm border-r border-slate-200 min-w-[220px] w-[220px]">
                        <button onClick={() => setDrillDownInfo({ customer: row.customer, brand: row.brand })} className="text-blue-600 uppercase hover:underline text-left font-bold">{row.customer}</button>
                      </td>
                      <td className="px-8 py-4 text-[13px] text-slate-500 uppercase sticky left-[220px] bg-white z-10 shadow-sm border-r border-slate-200 min-w-[140px] w-[140px]">{row.brand}</td>
                      <td className="px-8 py-4 text-[13px] text-slate-500 uppercase font-medium border-r border-slate-200">{row.salesperson}</td>
                      {y2y.monthOrder.map(month => (
                        y2y.fiscalYears.map((fy, fyIdx) => {
                          const key = `${fy}-${month}`;
                          const val = row[key] as number || 0;
                          const isLastYearInMonth = fyIdx === y2y.fiscalYears.length - 1;
                          return (
                            <td key={key} className={`px-2 py-4 text-[11px] text-center border-r border-slate-200 ${isLastYearInMonth ? 'border-r-2 border-slate-300' : ''}`}>
                              {val === 0 ? '-' : val.toLocaleString()}
                            </td>
                          );
                        })
                      ))}
                      {/* FY Wise Totals cells */}
                      {y2y.fiscalYears.map((fy) => {
                        const val = row[`total-fy-${fy}`] as number || 0;
                        return (
                          <td key={`total-fy-cell-${fy}`} className="px-2 py-4 text-xs font-bold text-center border-r border-slate-200 sticky right-0 bg-slate-50/50 z-10 shadow-sm">
                            {val === 0 ? '-' : val.toLocaleString()}
                          </td>
                        );
                      })}
                      <td className="px-8 py-4 text-sm font-black text-slate-900 text-right sticky right-0 bg-slate-50 z-10 shadow-sm border-l border-slate-200">{row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                {y2y.pivotData.length > 0 && (
                  <tfoot className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-50 font-black text-slate-900 z-20">
                    <tr>
                      <td className="px-8 py-4 text-sm uppercase sticky left-0 bg-slate-50 shadow-sm z-30 border-r border-slate-200 min-w-[220px] w-[220px]">Total</td>
                      <td className="px-8 py-4 text-sm sticky left-[220px] bg-slate-50 shadow-sm z-30 border-r border-slate-200 min-w-[140px] w-[140px]"></td>
                      <td className="px-8 py-4 text-sm border-r border-slate-200"></td>
                      {y2y.monthOrder.map(month => (
                        y2y.fiscalYears.map((fy, fyIdx) => {
                          const key = `${fy}-${month}`;
                          const isLastYearInMonth = fyIdx === y2y.fiscalYears.length - 1;
                          return (
                            <td key={key} className={`px-2 py-4 text-[11px] text-center border-r border-slate-200 ${isLastYearInMonth ? 'border-r-2 border-slate-300' : ''}`}>
                              {y2y.pivotData.reduce((acc, row) => acc + (row[key] as number || 0), 0).toLocaleString()}
                            </td>
                          );
                        })
                      ))}
                      {/* FY Wise footer totals */}
                      {y2y.fiscalYears.map((fy) => (
                         <td key={`total-fy-foot-${fy}`} className="px-2 py-4 text-xs text-center border-r border-slate-200 sticky right-0 bg-slate-50 shadow-sm z-30">
                            {y2y.pivotData.reduce((acc, row) => acc + (row[`total-fy-${fy}`] as number || 0), 0).toLocaleString()}
                         </td>
                      ))}
                      <td className="px-8 py-4 text-sm text-right sticky right-0 bg-slate-50 shadow-sm z-30 border-l border-slate-200">{y2y.pivotData.reduce((acc, row) => acc + row.total, 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
            {activeTab === TabType.NOT_VISITED && (
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#34495e] text-white">
                    <th onClick={() => handleSortToggle('customer')} className="group px-6 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer"><div className="flex items-center justify-between">Customer {renderSortIcon('customer')}</div></th>
                    <th onClick={() => handleSortToggle('salesperson')} className="group px-6 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer"><div className="flex items-center justify-between">Last Sales Person {renderSortIcon('salesperson')}</div></th>
                    <th onClick={() => handleSortToggle('lastVisited')} className="group px-6 py-4 text-xs font-bold uppercase border-r border-slate-500/50 cursor-pointer"><div className="flex items-center justify-between">Last Activity {renderSortIcon('lastVisited')}</div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {notVisitedCustomers.length ? notVisitedCustomers.map((row, i) => {
                    return <tr key={row.customer} className={i % 2 ? 'bg-slate-50/30' : ''}>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600 uppercase">{row.customer}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 uppercase">{row.salesperson}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDisplayDate(row.lastVisited)}</td>
                    </tr>;
                  }) : <tr><td colSpan={3} className="px-8 py-24 text-center text-slate-400">All customers have activity in the selected period.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {drillDownInfo && (
        <DrillDownModal 
          customer={drillDownInfo.customer} 
          brand={drillDownInfo.brand} 
          data={drillDownData} 
          onClose={() => setDrillDownInfo(null)} 
        />
      )}
    </div>
  );
};

export default App;
