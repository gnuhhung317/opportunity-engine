import React from 'react';
import { Opportunity } from '../types';

interface Props {
  opportunity: Opportunity;
  isDetailed?: boolean;
  onSpy?: () => void;
  isSpying?: boolean;
}

const OpportunityCard: React.FC<Props> = ({ opportunity, isDetailed, onSpy, isSpying }) => {
  const isSaaS = opportunity.type === 'Micro-SaaS';
  const isFreelance = opportunity.type === 'Freelance';
  
  // Check for Learning Bridge
  const hasLearningBridge = !!opportunity.learningBridge;

  // Dynamic border color based on type and learning bridge
  let typeColor = isSaaS 
    ? 'border-violet-500/50 hover:border-violet-500' 
    : isFreelance 
      ? 'border-cyan-500/50 hover:border-cyan-500'
      : 'border-orange-500/50 hover:border-orange-500';

  // If learning bridge is active, emphasize with amber
  if (hasLearningBridge) {
    typeColor = 'border-amber-500/60 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
  }

  const badgeColor = isSaaS
    ? 'bg-violet-500/20 text-violet-300'
    : isFreelance
      ? 'bg-cyan-500/20 text-cyan-300'
      : 'bg-orange-500/20 text-orange-300';

  return (
    <div className={`bg-slate-900 rounded-xl border ${typeColor} p-6 transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/50 group relative`}>
      
      {/* Learning Bridge Badge */}
      {hasLearningBridge && (
        <div className="absolute -top-3 left-6 bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full border border-amber-400 flex items-center shadow-lg">
          <span className="mr-1">⚡</span> Stretch Opportunity
        </div>
      )}

      <div className="flex justify-between items-start mb-4 mt-2">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${badgeColor}`}>
              {opportunity.type}
            </span>
            <span className="text-slate-400 text-xs flex items-center">
              {opportunity.platform}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
            {opportunity.title}
          </h3>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center space-x-1">
             <span className={`text-2xl font-bold ${hasLearningBridge ? 'text-amber-400' : 'text-emerald-500'}`}>
               {opportunity.matchScore}%
             </span>
           </div>
           <span className="text-xs text-slate-500 uppercase tracking-wide">Match Score</span>
        </div>
      </div>

      <p className="text-slate-300 mb-4 leading-relaxed">
        {opportunity.description}
      </p>

      {/* Reasoning & Value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
           <p className="text-xs text-slate-500 uppercase mb-1">Why You?</p>
           <p className="text-sm text-slate-300">{opportunity.matchReasoning}</p>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
           <p className="text-xs text-slate-500 uppercase mb-1">Potential Value</p>
           <p className="text-sm text-emerald-400 font-medium">{opportunity.estimatedValue}</p>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {opportunity.techStackRecommendation.map((tech, idx) => (
            <span key={idx} className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* LEARNING BRIDGE SECTION */}
      {opportunity.learningBridge && (
        <div className="mb-6 bg-amber-950/20 border border-amber-900/50 rounded-lg p-4">
          <h4 className="flex items-center text-amber-400 font-bold text-sm mb-3">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            The Learning Bridge
          </h4>
          <div className="text-sm text-amber-100/80 mb-3">
             <span className="font-semibold text-amber-200">{opportunity.learningBridge.missingSkill}</span> is just like <span className="font-semibold text-amber-200">{opportunity.learningBridge.analogy}</span>.
             You can learn it in ~{opportunity.learningBridge.hoursToLearn} hours.
          </div>
          <div className="bg-slate-900/50 rounded p-3">
            <p className="text-xs text-amber-500 uppercase font-bold mb-2">Crash Course Curriculum</p>
            <ol className="list-decimal list-inside space-y-1">
              {opportunity.learningBridge.curriculum.map((step, idx) => (
                <li key={idx} className="text-xs text-slate-300">{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Action Plan */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <h4 className="text-sm font-semibold text-white mb-3">The Strategist's Plan:</h4>
        <ul className="space-y-2 mb-4">
          {opportunity.actionPlan.map((step, idx) => (
            <li key={idx} className="flex items-start text-sm text-slate-400">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-xs mr-3 border border-slate-700">
                {idx + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ul>

        {/* Niche Spy Section */}
        {opportunity.spyReport ? (
          <div className="mt-6 bg-slate-950/50 rounded-lg border border-indigo-500/30 overflow-hidden">
            <div className="bg-indigo-900/20 px-4 py-3 border-b border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🕵️</span>
                <h4 className="text-sm font-bold text-indigo-300">Niche Spy Report</h4>
              </div>
              
              {/* ROI Badge */}
              {opportunity.spyReport.valuation && (
                 <div className="bg-emerald-900/40 border border-emerald-500/30 px-3 py-1 rounded text-emerald-400 text-xs font-bold">
                   ${opportunity.spyReport.valuation.dollarPerHour.toFixed(0)} / hr ROI
                 </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              
              {/* Valuator Section */}
              {opportunity.spyReport.valuation && (
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
                  <div className="bg-slate-900/50 p-3 rounded">
                    <p className="text-xs text-slate-500 uppercase">Est. Effort</p>
                    <p className="text-lg font-mono text-white">{opportunity.spyReport.valuation.estimatedEffortHours} hrs</p>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded">
                    <p className="text-xs text-slate-500 uppercase">Revenue Potential</p>
                    <p className="text-lg font-mono text-emerald-400">{opportunity.spyReport.valuation.projectedRevenue}</p>
                  </div>
                  <div className="col-span-2 text-xs text-slate-500 italic">
                    "{opportunity.spyReport.valuation.rationale}"
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <p className="text-xs text-indigo-400 uppercase font-semibold mb-1">Competitors</p>
                    <ul className="list-disc list-inside text-sm text-slate-300">
                      {opportunity.spyReport.competitors.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                 </div>
                 <div>
                    <p className="text-xs text-red-400 uppercase font-semibold mb-1">Found Weaknesses</p>
                    <ul className="list-disc list-inside text-sm text-slate-300">
                      {opportunity.spyReport.competitorWeaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                 </div>
              </div>
              <div className="bg-indigo-500/10 p-3 rounded border border-indigo-500/20">
                <p className="text-xs text-emerald-400 uppercase font-bold mb-1">✨ Winning Angle</p>
                <p className="text-sm text-white italic">"{opportunity.spyReport.winningAngle}"</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-start pt-2">
            <button
              onClick={onSpy}
              disabled={isSpying}
              className={`text-xs font-bold py-2 px-4 rounded border transition-all flex items-center space-x-2 ${
                isSpying 
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-wait' 
                  : 'bg-transparent text-indigo-400 border-indigo-500/50 hover:bg-indigo-500/10 hover:border-indigo-500'
              }`}
            >
               {isSpying ? (
                 <>
                   <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   <span>Running Valuator & Spy...</span>
                 </>
               ) : (
                 <>
                   <span>🕵️ Activate Spy & Valuator</span>
                 </>
               )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityCard;