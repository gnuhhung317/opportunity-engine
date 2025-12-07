import React, { useState, useEffect } from 'react';
import { UserProfile, MarketScanResult, Opportunity } from '../types';
import { scanMarketOpportunities, analyzeCompetitors } from '../services/geminiService';
import OpportunityCard from './OpportunityCard';

interface DashboardProps {
  user: UserProfile;
}

type SortOption = 'match' | 'roi';

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [scanResult, setScanResult] = useState<MarketScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'radar' | 'lab'>('radar');
  const [sortOption, setSortOption] = useState<SortOption>('match');
  const [error, setError] = useState<string | null>(null);
  const [spyingIds, setSpyingIds] = useState<Set<string>>(new Set());

  // Load last scan from local storage on mount
  useEffect(() => {
    const savedScan = localStorage.getItem('last_scan');
    if (savedScan) {
      try {
        setScanResult(JSON.parse(savedScan));
      } catch (e) {
        console.error("Failed to load saved scan");
      }
    }
  }, []);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await scanMarketOpportunities(user);
      setScanResult(result);
      localStorage.setItem('last_scan', JSON.stringify(result));
    } catch (err) {
      console.error(err);
      setError("Failed to scan the market. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpy = async (opportunity: Opportunity) => {
    if (spyingIds.has(opportunity.id)) return;

    setSpyingIds(prev => new Set(prev).add(opportunity.id));
    
    try {
      const report = await analyzeCompetitors(opportunity);
      
      // Update the specific opportunity in the scan result
      if (scanResult) {
        const updatedOpportunities = scanResult.opportunities.map(op => 
          op.id === opportunity.id ? { ...op, spyReport: report } : op
        );
        
        const updatedResult = { ...scanResult, opportunities: updatedOpportunities };
        setScanResult(updatedResult);
        localStorage.setItem('last_scan', JSON.stringify(updatedResult));
      }
    } catch (err) {
      console.error("Spy failed", err);
      // Optional: show a toast error
    } finally {
      setSpyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(opportunity.id);
        return newSet;
      });
    }
  };

  const getSortedOpportunities = (opportunities: Opportunity[]) => {
    return [...opportunities].sort((a, b) => {
      if (sortOption === 'roi') {
        const roiA = a.spyReport?.valuation?.dollarPerHour || 0;
        const roiB = b.spyReport?.valuation?.dollarPerHour || 0;
        // If neither has ROI, fall back to match score
        if (roiA === 0 && roiB === 0) return b.matchScore - a.matchScore;
        return roiB - roiA;
      }
      return b.matchScore - a.matchScore;
    });
  };

  const allOpportunities = scanResult?.opportunities || [];
  const sortedOpportunities = getSortedOpportunities(allOpportunities);
  
  // Filter for tabs
  const radarItems = sortedOpportunities; 
  const labItems = sortedOpportunities.filter(o => o.type === 'Micro-SaaS' || o.type === 'DigitalProduct');

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Mission Control</h2>
          <p className="text-slate-400 text-sm">
            {scanResult 
              ? `Last Market Scan: ${new Date(scanResult.scannedAt).toLocaleDateString()} ${new Date(scanResult.scannedAt).toLocaleTimeString()}`
              : "No market data analyzed yet."}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {scanResult && (
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
            onClick={handleScan}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center space-x-2 transition-all ${
              loading 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Scanning Market...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Scan New Opportunities</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
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
            My Radar <span className="ml-2 bg-slate-800 text-slate-300 py-0.5 px-2 rounded-full text-xs">{radarItems.length}</span>
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
        {!scanResult && !loading && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
            <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p>Ready to activate the Opportunity Engine?</p>
            <p className="text-sm mt-1">Click "Scan New Opportunities" to begin.</p>
          </div>
        )}

        {loading && !scanResult && (
           <div className="space-y-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="animate-pulse flex p-4 bg-slate-900 rounded-lg border border-slate-800 h-40">
                 <div className="flex-1 space-y-4 py-1">
                   <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                   <div className="space-y-2">
                     <div className="h-4 bg-slate-800 rounded"></div>
                     <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'radar' && radarItems.map((op) => (
            <OpportunityCard 
              key={op.id} 
              opportunity={op} 
              onSpy={() => handleSpy(op)}
              isSpying={spyingIds.has(op.id)}
            />
          ))}

          {activeTab === 'lab' && labItems.length === 0 && scanResult && (
             <div className="p-8 text-center text-slate-500">
                No product ideas found in this scan. Try scanning again or tweaking your skills.
             </div>
          )}

          {activeTab === 'lab' && labItems.map((op) => (
            <OpportunityCard 
              key={op.id} 
              opportunity={op} 
              isDetailed={true} 
              onSpy={() => handleSpy(op)}
              isSpying={spyingIds.has(op.id)}
            />
          ))}
        </div>
      </div>
      
      {/* Sources Footer */}
      {scanResult?.sources && scanResult.sources.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Intelligence Sources
          </h4>
          <div className="flex flex-wrap gap-2">
            {scanResult.sources.map((source, idx) => (
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