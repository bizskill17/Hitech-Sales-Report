
import React from 'react';

interface DashboardStatsProps {
  totalQty: number;
  totalCustomers: number;
  totalBrands: number;
  totalInvoices: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ totalQty, totalCustomers, totalBrands, totalInvoices }) => {
  const stats = [
    { 
      label: 'Volume Sold', 
      value: totalQty.toLocaleString(), 
      icon: 'fa-box-open', 
      color: 'from-blue-600 to-blue-700', 
      trend: '+12.5%', 
      trendIcon: 'fa-arrow-trend-up',
      unit: 'units'
    },
    { 
      label: 'Market Reach', 
      value: totalCustomers, 
      icon: 'fa-users-viewfinder', 
      color: 'from-emerald-600 to-teal-700', 
      trend: '+4.2%', 
      trendIcon: 'fa-arrow-trend-up',
      unit: 'customers'
    },
    { 
      label: 'Brand Portfolio', 
      value: totalBrands, 
      icon: 'fa-tags', 
      color: 'from-amber-500 to-orange-600', 
      trend: 'Stable', 
      trendIcon: 'fa-minus',
      unit: 'brands'
    },
    { 
      label: 'Transactions', 
      value: totalInvoices.toLocaleString(), 
      icon: 'fa-file-invoice-dollar', 
      color: 'from-indigo-600 to-purple-700', 
      trend: '+8.1%', 
      trendIcon: 'fa-arrow-trend-up',
      unit: 'invoices'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group overflow-hidden relative">
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] -mr-8 -mt-8 rounded-full`}></div>
          
          <div className="flex justify-between items-start mb-4 relative">
            <div className={`bg-gradient-to-br ${stat.color} w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-lg ring-4 ring-white`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-[10px] font-black uppercase tracking-widest ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
                <i className={`fas ${stat.trendIcon} mr-1`}></i>
                {stat.trend}
              </span>
            </div>
          </div>
          
          <div className="relative">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              <span className="text-[10px] font-bold text-slate-300 uppercase">{stat.unit}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
