import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-tight">Immersive Pomodoro Workspace</h1>
        <p className="mt-2 text-sm text-slate-400">Scaffold verification baseline</p>
      </div>
    </div>
  );
};

export default App;
