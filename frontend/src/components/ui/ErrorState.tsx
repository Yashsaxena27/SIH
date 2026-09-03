import { AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'An error occurred',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-6 text-center rounded-xl bg-status-critical/[0.03] border border-status-critical/[0.1]', className)}>
      <div className="mb-3 rounded-full bg-status-critical/10 p-3">
        <AlertCircle className="h-6 w-6 text-status-critical" />
      </div>
      <h3 className="mb-2 text-base font-medium text-white/90">{title}</h3>
      <p className="text-sm text-white/56 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/[0.1] transition-colors border border-white/10"
        >
          <RefreshCcw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
}
