import React from 'react';
import { TimerTestInterface } from './components/TimerTestInterface';
import { TasksWidget } from './components/TasksWidget';
import { NotesWidget } from './components/NotesWidget';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 p-4 md:p-8 overflow-y-auto">
      <TimerTestInterface />
      <TasksWidget />
      <NotesWidget />
    </main>
  );
};

export default App;
