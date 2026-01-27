
import React from 'react';
import { RawSalesRecord } from '../types.ts';

interface DrillDownModalProps {
  customer: string;
  brand: string;
  data: RawSalesRecord[];
  onClose: () => void;
}

export const DrillDownModal: React.FC<DrillDownModalProps> = ({ customer, brand, data, onClose }) => {
  const totalInvoices = new Set(data.map(r => r.invoice)).size;
  const totalQuantity = data.reduce((sum, r) => sum + r.totalQty, 0);
  const uniqueItems = new Set(data.map(r => r.item)).size;

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 font-sans">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              Details for <span className="text-blue-600 uppercase">{customer}</span> - <span className="text-slate-500 uppercase">{brand}</span>
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Stats Section */}
        <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white font-sans">
          <div className="bg-white border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm border border-slate-100">
            <p className="text-[32px] font-black text-slate-900">{totalInvoices}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Invoices</p>
          </div>
          <div className="bg-white border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm border border-slate-100">
            <p className="text-[32px] font-black text-slate-900">{totalQuantity.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Quantity</p>
          </div>
          <div className="bg-white border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm border border-slate-100">
            <p className="text-[32px] font-black text-slate-900">{uniqueItems}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unique Items</p>
          </div>
        </div>

        {/* Table Section */}
        <div 
          tabIndex={0}
          onKeyDown={handleTableKeyDown}
          className="flex-1 overflow-auto custom-scrollbar px-8 pb-8 font-sans outline-none focus:ring-2 focus:ring-blue-100 transition-all"
        >
          <table className="w-full text-left border-collapse rounded-lg border border-slate-200 shadow-sm min-w-[800px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#34495e] text-white">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-slate-600/30">Date</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-slate-600/30">Invoice #</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-slate-600/30">Sales Person</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-slate-600/30">Item Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider border-r border-slate-600/30">Brand</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-bold">{row.invoice}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{row.salesperson}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium uppercase">{row.item}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.brand}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{row.totalQty.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
