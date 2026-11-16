import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/70 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

export function TableRowSkeleton({ columns = 8, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} className="py-2.5 px-3.5">
              <Skeleton className={`h-3.5 ${cIdx === 0 ? 'w-24' : cIdx === columns - 1 ? 'w-12 mx-auto' : 'w-16 ml-auto'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 p-4 rounded-lg space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-7 w-40" />
      <div className="pt-2 border-t border-slate-100 flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 'h-64' }) {
  return (
    <div className={`w-full ${height} bg-slate-50/50 rounded flex flex-col justify-end p-4 gap-2 border border-slate-100`}>
      <div className="flex items-end justify-between gap-1.5 h-full pt-8">
        {Array.from({ length: 16 }).map((_, idx) => {
          const heights = ['h-1/3', 'h-1/2', 'h-2/3', 'h-3/4', 'h-2/5', 'h-4/5', 'h-1/4', 'h-3/5'];
          const hClass = heights[idx % heights.length];
          return (
            <div
              key={idx}
              className={`w-full ${hClass} bg-slate-200/60 rounded-t animate-pulse`}
            />
          );
        })}
      </div>
    </div>
  );
}
