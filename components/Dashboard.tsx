import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Opportunity } from '../types';
import { discoverNextOpportunity, analyzeCompetitors } from '../services/geminiService';
import OpportunityCard from './OpportunityCard';

interface DashboardProps {
  user: UserProfile;
}

type SortOption = 'match' | 'roi';

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);
  
  // Engine State
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'radar' | 'lab'>('radar');
  const [sortOption, setSortOption] = useState<SortOption>('match');
  const [spyingIds, setSpyingIds] = useState<Set<string>>(new Set());
  const [spyLogs, setSpyLogs] = useState<Record<string, string[]>>({});
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs]);

  // Load history from local storage
  useEffect(() => {
    const savedOps = localStorage.getItem('opp_history');
    if (savedOps) {
      try {
        setOpportunities(JSON.parse(savedOps));
      } catch (e) { console.error(e); }
    }
    const savedSources = localStorage.getItem('source_history');
    if (savedSources) {
      try {
        setSources(JSON.parse(savedSources));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Save history on change
  useEffect(() => {
    localStorage.setItem('opp_history', JSON.stringify(opportunities));
  }, [opportunities]);

  useEffect(() => {
    localStorage.setItem('source_history', JSON.stringify(sources));
  }, [sources]);

  // CONTINUOUS DISCOVERY LOOP
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>; // Fixed: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout

    const engineLoop = async () => {
      if (!isScanning) return;

      try {
        // Collect existing titles to avoid duplicates
        const existingTitles = opportunities.map(o => o.title);
        
        // Call the single-shot discovery agent
        const result = await discoverNextOpportunity(user, existingTitles, (msg) => {
          setScanLogs(prev => [...prev.slice(-4), msg]); // Keep last 5 logs
        });

        // Add the new opportunity to the TOP of the list (Stream-like)
        setOpportunities(prev => [result.opportunity, ...prev]);
        
        if (result.source) {
          setSources(prev => {
            // Avoid duplicate sources
            if (prev.some(s => s.uri === result.source!.uri)) return prev;
            return [result.source!, ...prev];
          });
        }

        // Wait a bit before next thought to allow user to read logs and respect rate limits
        if (isScanning) {
           timeoutId = setTimeout(engineLoop, 4000); 
        }

      } catch (error) {
        console.error("Engine hiccup:", error);
        setScanLogs(prev => [...prev, "Connection interruption. Retrying..."]);
        if (isScanning) {
          timeoutId = setTimeout(engineLoop, 5000);
        }
      }
    };

    if (isScanning) {
      engineLoop();
    }

    return () => clearTimeout(timeoutId);
  }, [isScanning, user, opportunities]); // Dependencies are crucial here

  const toggleEngine = () => {
    if (isScanning) {
      setIsScanning(false);
      setScanLogs(prev => [...prev, "Engine Paused."]);
    } else {
      setIsScanning(true);
      setScanLogs(["Engine Started. Initializing Continuous Discovery Protocol..."]);
    }
  };

  const handleSpy = async (opportunity: Opportunity) => {
    if (spyingIds.has(opportunity.id)) return;

    setSpyingIds(prev => new Set(prev).add(opportunity.id));
    setSpyLogs(prev => ({ ...prev, [opportunity.id]: [] }));
    
    try {
      const report = await analyzeCompetitors(opportunity, (msg) => {
        setSpyLogs(prev => ({
           ...prev,
           [opportunity.id]: [...(prev[opportunity.id] || []), msg]
        }));
      });
      
      setOpportunities(prev => prev.map(op => 
        op.id === opportunity.id ? { ...op, spyReport: report } : op
      ));

    } catch (err) {
      console.error("Spy failed", err);
    } finally {
      setSpyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(opportunity.id);
        return newSet;
      });
    }
  };

  const getSortedOpportunities = (ops: Opportunity[]) => {
    return [...ops].sort((a, b) => {
      if (sortOption === 'roi') {
        const roiA = a.spyReport?.valuation?.dollarPerHour || 0;
        const roiB = b.spyReport?.valuation?.dollarPerHour || 0;
        if (roiA === 0 && roiB === 0) return b.matchScore - a.matchScore;
        return roiB - roiA;
      }
      return b.matchScore - a.matchScore;
    });
  };

  const sortedOpportunities = getSortedOpportunities(opportunities);
  const radarItems = sortedOpportunities; 
  const labItems = sortedOpportunities.filter(o => o.type === 'Micro-SaaS' || o.type === 'DigitalProduct');

  return (
    <div className="space-y-8 pb-20">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-slate-900/95 backdrop-blur z-20 py-4 border-b border-slate-800 -mx-4 px-4 md:-mx-8 md:px-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
             Mission Control
             {isScanning && <span className="ml-3 flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
             </span>}
          </h2>
          <p className="text-slate-400 text-sm">
            {opportunities.length} opportunities found. {isScanning ? "Engine is Thinking..." : "Engine is Idle."}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {opportunities.length > 0 && (
             <select 
               value={sortOption} 
               onChange={(e) => setSortOption(e.target.value as SortOption)}
               className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
             >
               <option value="match">Sort by Match Score</option>
               <option value="roi">Sort by ROI ($/Hour)</option>
             </select>
          )}

          <button
            onClick={toggleEngine}
            className={`px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
              isScanning 
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50'
            }`}
          >
            {isScanning ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Stop Engine</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Start Discovery Engine</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* LOGGING TERMINAL (Always visible when scanning or logs exist) */}
      {(isScanning || scanLogs.length > 0) && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-sm h-32 overflow-y-auto shadow-inner transition-all">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 mb-2">
             <span className="text-slate-500 text-xs uppercase tracking-wider">Neural Stream</span>
          </div>
          <div className="space-y-1">
            {scanLogs.map((log, i) => (
              <div key={i} className="flex space-x-2 animate-fadeIn text-xs md:text-sm">
                <span className="text-emerald-500">➜</span>
                <span className="text-slate-300">{log}</span>
              </div>
            ))}
            <div ref={logsEndRef}></div>
            {isScanning && <div className="animate-pulse text-emerald-500 text-xs">Processing...</div>}
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="border-b border-slate-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('radar')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'radar'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            Live Radar <span className="ml-2 bg-slate-800 text-slate-300 py-0.5 px-2 rounded-full text-xs">{radarItems.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'lab'
                ? 'border-violet-500 text-violet-500'
                : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            Product Lab <span className="ml-2 bg-slate-800 text-slate-300 py-0.5 px-2 rounded-full text-xs">{labItems.length}</span>
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {opportunities.length === 0 && !isScanning && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800 mt-8">
            <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p>Engine is on standby.</p>
            <p className="text-sm mt-1">Click "Start Discovery Engine" to begin the search loop.</p>
          </div>
        )}

        {/* Results */}
        <div className="grid grid-cols-1 gap-6 pt-4">
          {activeTab === 'radar' && radarItems.map((op) => (
            <OpportunityCard 
              key={op.id} 
              opportunity={op} 
              onSpy={() => handleSpy(op)}
              isSpying={spyingIds.has(op.id)}
              spyLogs={spyLogs[op.id] || []}
            />
          ))}

          {activeTab === 'lab' && labItems.length === 0 && opportunities.length > 0 && (
              <div className="p-8 text-center text-slate-500">
                The engine hasn't found specific Product/SaaS ideas yet. Keep it running.
              </div>
          )}

          {activeTab === 'lab' && labItems.map((op) => (
            <OpportunityCard 
              key={op.id} 
              opportunity={op} 
              isDetailed={true} 
              onSpy={() => handleSpy(op)}
              isSpying={spyingIds.has(op.id)}
              spyLogs={spyLogs[op.id] || []}
            />
          ))}
        </div>
      </div>
      
      {/* Sources Footer */}
      {sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Intelligence Sources
          </h4>
          <div className="flex flex-wrap gap-2">
            {sources.map((source, idx) => (
              <a 
                key={idx}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1 rounded-full truncate max-w-xs transition-colors"
              >
                {source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;