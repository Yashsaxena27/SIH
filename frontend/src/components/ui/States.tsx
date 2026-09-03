import { cn } from '@/lib/utils';

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-[1920px] mx-auto w-full animate-pulse">
      <div className="flex justify-between items-end">
        <div>
          <div className="w-48 h-8 bg-white/[0.04] rounded-lg mb-2" />
          <div className="w-72 h-4 bg-white/[0.02] rounded-lg" />
        </div>
        <div className="flex gap-4">
          <div className="w-24 h-12 bg-white/[0.04] rounded-lg" />
          <div className="w-24 h-12 bg-white/[0.04] rounded-lg" />
          <div className="w-24 h-12 bg-white/[0.04] rounded-lg" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-[600px] bg-white/[0.02] rounded-xl border border-white/[0.04]" />
        <div className="lg:col-span-4 space-y-6">
          <div className="h-64 bg-white/[0.03] rounded-xl border border-white/[0.04]" />
          <div className="h-64 bg-white/[0.03] rounded-xl border border-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string, retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-white/90 mb-2">System Error</h3>
      <p className="text-sm text-white/50 max-w-md mb-6">{message}</p>
      {retry && (
        <button 
          onClick={retry}
          className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-12 text-center bg-white/[0.01] rounded-xl border border-white/[0.04] border-dashed">
      <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mb-4 text-white/30">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-white/80 mb-1">{title}</h3>
      <p className="text-xs text-white/40 max-w-sm">{description}</p>
    </div>
  );
}
