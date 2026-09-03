import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (item: T) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-outline-variant bg-surface-container', className)}>
      <table className="w-full text-left text-sm text-on-surface">
        <thead className="border-b border-outline-variant bg-white/[0.02] text-xs uppercase text-white/56">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('px-6 py-4 font-medium', {
                  'text-left': !col.align || col.align === 'left',
                  'text-center': col.align === 'center',
                  'text-right': col.align === 'right',
                })}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-white/56">
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-white/56">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(item)}
                className={cn('transition-colors hover:bg-surface-container', {
                  'cursor-pointer': !!onRowClick,
                })}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-6 py-4 tabular-nums', {
                      'text-left': !col.align || col.align === 'left',
                      'text-center': col.align === 'center',
                      'text-right': col.align === 'right',
                    })}
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
