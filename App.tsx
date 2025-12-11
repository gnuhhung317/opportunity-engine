import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { UserProfile } from './types';
import { resetAiClient } from './services/geminiService';

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

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500">Loading Engine...</div>;
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