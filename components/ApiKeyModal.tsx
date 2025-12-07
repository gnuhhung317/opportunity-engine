import React, { useState } from 'react';

interface ApiKeyModalProps {
  onSave: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      onSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 11l-4.414 4.172a1 1 0 00-.293.707V19a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a1 1 0 01.293-.707l5.385-5.385a6 6 0 016.32-6.32z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">System Authorization</h2>
        </div>
        
        <p className="text-slate-400 text-sm mb-6">
          To activate the Opportunity Engine agents, a valid Gemini API Key is required.
          The key will be stored locally on your device.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Gemini API Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzbSy..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-lg transition-all"
          >
            Connect & Initialize Engine
          </button>
        </div>
        
        <p className="mt-4 text-center text-xs text-slate-600">
          Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Get one from Google AI Studio</a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeyModal;