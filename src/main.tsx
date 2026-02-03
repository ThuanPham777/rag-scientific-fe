import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { pdfjs } from 'react-pdf';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { QueryProvider } from './providers/QueryProvider';
import { AuthInitializer } from './components/auth/AuthInitializer';

// Use CDN worker to avoid import issues
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <TooltipProvider>
          <AuthInitializer>
            <App />
          </AuthInitializer>
          <Toaster
            position='bottom-right'
            richColors
          />
        </TooltipProvider>
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>,
);
