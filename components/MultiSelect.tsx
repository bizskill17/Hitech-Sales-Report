
import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const toggleOption = (opt: string) => {
    const next = selected.includes(opt) 
      ? selected.filter(s => s !== opt) 
      : [...selected, opt];
    onChange(next);
  };

  return (
    <div className="relative flex flex-col gap-1.5 w-full font-sans" ref={containerRef}>
      <label className="text-[13px] font-semibold text-slate-600">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-1.5 bg-white border border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 transition-all shadow-sm min-h-[36px]"
      >
        <span className="text-sm truncate text-slate-500">
          {selected.length === 0 ? (placeholder || label) : `${label}`}
        </span>
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {selected.length}
          </div>
          <i className="fas fa-caret-down text-slate-400"></i>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b bg-slate-50 flex flex-col gap-2">
            <div className="relative">
              <input 
                type="text" 
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleSelectAll}
                className="flex-1 py-1.5 text-[11px] font-bold bg-blue-50 text-blue-600 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
              >
                SELECT ALL
              </button>
              <button 
                onClick={handleClearAll}
                className="flex-1 py-1.5 text-[11px] font-bold bg-slate-50 text-slate-600 rounded border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                CLEAR ALL
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredOptions.length === 0 && <div className="p-6 text-xs text-slate-400 text-center font-medium">No matches found</div>}
            
            {filteredOptions.map(opt => (
              <div 
                key={opt}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm transition-colors ${selected.includes(opt) ? 'bg-blue-50/20' : ''}`}
                onClick={() => toggleOption(opt)}
              >
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt)} 
                  readOnly
                  className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                />
                <span className="truncate text-slate-700">{opt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
