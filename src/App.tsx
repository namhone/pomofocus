import React from 'react';
import { TimerTestInterface } from './components/TimerTestInterface';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center overflow-x-hidden">
      <TimerTestInterface />
    </main>
  );
};

export default App;
