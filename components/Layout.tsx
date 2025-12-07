import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  user?: { name: string } | null;
  onEditProfile: () => void;
  isEditing: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onEditProfile, isEditing }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar / Header */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Opportunity Engine
          </h1>
          <p className="text-xs text-slate-500 mt-2 tracking-widest uppercase">The Digital Twin</p>
        </div>

        {user && !isEditing && (
          <div className="px-6 py-4 border-t border-slate-800">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 font-bold text-emerald-400">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm text-white">{user.name}</p>
                <p className="text-xs text-emerald-500 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Ready to Work
                </p>
              </div>
            </div>

            <nav className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded text-sm font-medium bg-slate-900 text-emerald-400 border border-slate-800">
                Dashboard
              </button>
              
              <button 
                onClick={onEditProfile}
                className="w-full text-left px-3 py-2 rounded text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                ✏️ Edit Profile
              </button>
            </nav>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;