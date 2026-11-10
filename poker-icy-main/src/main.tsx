import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SetupNotice } from '@/components/common/SetupNotice';
import './index.css';

const root = createRoot(document.getElementById('root')!);
const isConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

if (isConfigured) {
  void Promise.all([import('./App.tsx'), import('@/hooks/useAuth')])
    .then(([{ default: App }, { AuthProvider }]) => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ErrorBoundary>
        </StrictMode>
      );
    })
    .catch((error: unknown) => {
      console.error('App failed to start', error);
      root.render(
        <StrictMode>
          <SetupNotice />
        </StrictMode>
      );
    });
} else {
  root.render(
    <StrictMode>
      <SetupNotice />
    </StrictMode>
  );
}
