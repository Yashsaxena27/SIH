import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, SearchX } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center z-10"
      >
        <div className="h-16 w-16 bg-white/[0.03] border border-white/[0.05] rounded-2xl flex items-center justify-center mb-6">
          <SearchX className="w-8 h-8 text-white/40" />
        </div>
        <h1 className="text-6xl font-bold text-white tracking-tighter mb-4 font-mono">404</h1>
        <h2 className="text-xl font-medium text-white/80 mb-2 uppercase tracking-widest">Sector Uncharted</h2>
        <p className="text-sm text-white/40 max-w-md mb-8">
          The requested system node or intelligence sector could not be located in the current network topology.
        </p>
        <button 
          onClick={() => navigate('/overview')}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors border border-white/5 hover:border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Command Center
        </button>
      </motion.div>
    </div>
  );
}