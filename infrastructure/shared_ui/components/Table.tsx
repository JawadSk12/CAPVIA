import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../utils';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  isSortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchableKey?: keyof T;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  stickyHeader?: boolean;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  searchableKey,
  searchPlaceholder = 'Filter items...',
  itemsPerPage = 10,
  stickyHeader = true,
  className,
}: TableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // 1. Filtering
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchableKey) return data;
    
    return data.filter((item) => {
      const val = item[searchableKey as string];
      if (val === undefined || val === null) return false;
      return String(val).toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [data, searchQuery, searchableKey]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  // 3. Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  
  // Reset page if it overflows totalPages due to filtering
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  return (
    <div className={cn('flex flex-col space-y-4 w-full text-left', className)}>
      {/* Search Input bar */}
      {searchableKey && (
        <div className="relative max-w-sm flex items-center">
          <div className="absolute left-4 text-slate-400 pointer-events-none flex items-center">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#0D47A1] focus:ring-2 focus:ring-[#0D47A1]/10 rounded-[16px] pl-11 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200"
          />
        </div>
      )}

      {/* Table grid */}
      <div className="w-full border border-slate-100 rounded-[20px] shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto w-full max-h-[500px]">
          <table className="w-full border-collapse text-sm text-slate-700">
            <thead className={cn('bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 font-heading border-b border-slate-100', stickyHeader && 'sticky top-0 z-10 bg-slate-50')}>
              <tr>
                {columns.map((col) => (
                  <th key={col.key as string} className="px-6 py-4.5 font-bold">
                    {col.isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key as string)}
                        className="flex items-center space-x-1 hover:text-slate-800 focus:outline-none font-bold uppercase tracking-wider"
                      >
                        <span>{col.header}</span>
                        {sortKey !== col.key ? (
                          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                        ) : sortDirection === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-[#0D47A1]" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-[#0D47A1]" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedData.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key as string} className="px-6 py-4.5">
                      {col.render ? col.render(row) : row[col.key as string]}
                    </td>
                  ))}
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 italic">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls footer */}
        <div className="px-6 py-4 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing <strong className="text-slate-700">{Math.min(sortedData.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to{' '}
            <strong className="text-slate-700">{Math.min(sortedData.length, currentPage * itemsPerPage)}</strong> of{' '}
            <strong className="text-slate-700">{sortedData.length}</strong> items
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-[12px] bg-white text-slate-600 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-slate-600">
              Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-[12px] bg-white text-slate-600 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
