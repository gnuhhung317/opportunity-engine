import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
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
  };

  const handleReset = () => {
    if (window.confirm("Are you sure? This will delete your profile and opportunity history.")) {
      setUser(null);
      localStorage.removeItem('user_profile');
      localStorage.removeItem('last_scan');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Loading Engine...</div>;
  }

  return (
    <Layout user={user} onReset={handleReset}>
      {user ? (
        <Dashboard user={user} />
      ) : (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
    </Layout>
  );
};

export default App;
