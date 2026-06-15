'use client';
import { Sidebar } from './sidebar';
import { AssistantFab } from './assistant-fab';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <AssistantFab />
    </div>
  );
}
