import { Plug } from 'lucide-react';

export function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
          <Plug className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-white">The room is not connected yet</h1>
        <p className="mt-2 text-sm text-slate-400">
          The app cannot reach its database because the connection details are missing in this project. Reconnect the
          database from the project settings, then reload this page.
        </p>
      </div>
    </div>
  );
}
