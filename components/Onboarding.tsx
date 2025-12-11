import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { parseUserProfile } from '../services/geminiService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  initialData?: UserProfile;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialData }) => {
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    background: '',
    coreSkills: '',
    techStack: '',
    resources: '',
    interests: '',
    platformTarget: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const [isParsing, setIsParsing] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [showSmartPaste, setShowSmartPaste] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.coreSkills) {
      onComplete(formData);
    }
  };

  const handleSmartFill = async () => {
    if (!rawInput.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseUserProfile(rawInput);
      setFormData(prev => ({
        ...prev,
        ...result,
        // Ensure values are strings
        name: result.name || prev.name,
        background: result.background || prev.background,
        coreSkills: result.coreSkills || prev.coreSkills,
        techStack: result.techStack || prev.techStack,
        resources: result.resources || prev.resources,
        interests: result.interests || prev.interests,
        platformTarget: result.platformTarget || prev.platformTarget,
      }));
      setShowSmartPaste(false);
    } catch (e) {
      console.error("Failed to parse profile", e);
      // Optional: Add user facing error state
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-10 pb-10">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">
          {initialData ? "Recalibrate Your Digital Twin" : "Initialize Your Digital Twin"}
        </h2>
        <p className="text-slate-400">
          {initialData ? "Update your parameters to find better matches." : "Tell us who you are and what you have. We'll find who needs it."}
        </p>
      </div>

      <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
        
        {/* Smart Paste Toggle */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowSmartPaste(!showSmartPaste)}
            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-all group"
          >
            <span className="mr-2">✨</span>
            {showSmartPaste ? "Hide Auto-Fill" : "Auto-Fill from Bio / CV"}
            <span className="ml-2 text-xs bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-400 group-hover:text-white transition-colors">AI Powered</span>
          </button>

          {showSmartPaste && (
            <div className="mt-4 animate-fadeIn">
              <label className="block text-sm text-slate-400 mb-2">Paste your Bio, About Me, or LinkedIn Summary:</label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Example: My name is Huy, 4th year CS student. I interned as a Backend Dev for 6 months using Node.js. I want to build automated tools."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[120px]"
              />
              <button
                type="button"
                onClick={handleSmartFill}
                disabled={isParsing || !rawInput.trim()}
                className="mt-3 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-2 rounded-lg transition-all"
              >
                {isParsing ? (
                   <span className="flex items-center justify-center">
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     Parsing...
                   </span>
                ) : "Parse & Populate Form"}
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 border-t border-slate-800 pt-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Your Name / Handle</label>
              <input
                type="text"
                name="name"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Alex"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Background / Experience</label>
              <input
                type="text"
                name="background"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. 4th year Student, Senior Dev, etc."
                value={formData.background}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Core Skills</label>
              <input
                type="text"
                name="coreSkills"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. React, Python, Copywriting"
                value={formData.coreSkills}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tech Stack</label>
              <input
                type="text"
                name="techStack"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Next.js, Supabase, Tailwind"
                value={formData.techStack}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Available Resources</label>
            <input
              type="text"
              name="resources"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. 2 hours/day, $0 budget, have OpenAI credits"
              value={formData.resources}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Interests</label>
              <input
                type="text"
                name="interests"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Automation, AI, DeFi"
                value={formData.interests}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Platforms</label>
              <input
                type="text"
                name="platformTarget"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                placeholder="Leave blank to search ALL platforms"
                value={formData.platformTarget}
                onChange={handleChange}
              />
              <p className="text-xs text-slate-500 mt-1">If blank, engine will scan all markets.</p>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg shadow-lg shadow-emerald-900/50 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {initialData ? "Update Profile" : "Activate Engine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;