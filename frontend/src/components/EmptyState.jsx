import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

export function EmptyState({
  title = 'No records found',
  description = 'No results match the current filters or query.',
  actionLabel = 'Reset Filters',
  onAction,
}) {
  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-2.5">
      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
        <SearchX className="w-4 h-4 text-slate-500" aria-hidden="true" />
      </div>
      <div>
        <h4 className="text-xs font-semibold text-slate-900">{title}</h4>
        <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">{description}</p>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-200 transition-all active:scale-[0.98] shadow-xs"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
