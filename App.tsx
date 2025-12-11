import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('user_profile');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Invalid user profile");
        localStorage.removeItem('user_profile');
      }
    }
    
    setLoading(false);
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('user_profile', JSON.stringify(profile));
    setIsEditing(false);
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  // API KEY CHECK: Strictly enforce environment variable usage
  if (!process.env.API_KEY) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans text-slate-300">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Missing API Configuration</h1>
          </div>
          
          <p className="mb-4 text-sm leading-relaxed">
            The Opportunity Engine requires a valid Google Gemini API Key to function. 
            For security reasons, this must be provided via environment variables.
          </p>

          <div className="bg-slate-900 p-4 rounded border border-slate-800 mb-6">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Required Action</p>
            <p className="text-sm mb-2">Create a <code className="text-emerald-400">.env</code> file in your project root:</p>
            <div className="bg-black p-3 rounded border border-slate-800/50 flex justify-between items-center group">
              <code className="text-xs font-mono text-emerald-400">API_KEY=AIzbSy...</code>
            </div>
          </div>

          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors text-sm"
          >
            Get API Key from Google AI Studio
          </a>
          
          <p className="mt-4 text-xs text-center text-slate-600">
            Restart your development server after adding the key.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500 animate-pulse">Initializing Opportunity Engine...</div>;
  }

  return (
    <Layout user={user} onEditProfile={handleEditProfile} isEditing={isEditing}>
      {user && !isEditing ? (
        <Dashboard user={user} />
      ) : (
        <Onboarding 
          onComplete={handleOnboardingComplete} 
          initialData={user || undefined}
        />
      )}
    </Layout>
  );
};

export default App;