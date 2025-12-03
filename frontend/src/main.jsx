import ReactDOM from 'react-dom/client';
import { InternetIdentityProvider } from './hooks/useInternetIdentity';
import { initEditor } from './hooks/useEditor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

// Safe initialization with error handling
function initializeApp() {
  try {
    // Initialize editor if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        try {
          initEditor();
        } catch (error) {
          console.error('[Editor] Initialization error:', error);
        }
      });
    } else {
      try {
        initEditor();
      } catch (error) {
        console.error('[Editor] Initialization error:', error);
      }
    }

    // Get root element
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      console.error('[App] Root element not found');
      document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; background: #f9fafb;">
          <div style="max-width: 28rem; width: 100%; padding: 1.5rem; background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="font-size: 1.5rem; font-weight: bold; color: #dc2626; margin-bottom: 0.5rem;">Application Error</h1>
            <p style="color: #6b7280;">Root element not found. Please refresh the page.</p>
          </div>
        </div>
      `;
      return;
    }

    // Create React root and render
    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <QueryClientProvider client={queryClient}>
          <InternetIdentityProvider>
            <App />
          </InternetIdentityProvider>
        </QueryClientProvider>
      );
      console.log('[App] Application rendered successfully');
    } catch (error) {
      console.error('[App] React rendering error:', error);
      rootElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; background: #f9fafb;">
          <div style="max-width: 28rem; width: 100%; padding: 1.5rem; background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="font-size: 1.5rem; font-weight: bold; color: #dc2626; margin-bottom: 0.5rem;">Rendering Error</h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">${error.message || 'Failed to render application'}</p>
            <button onclick="window.location.reload()" style="width: 100%; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
              Reload Application
            </button>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('[App] Fatal initialization error:', error);
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; background: #f9fafb;">
        <div style="max-width: 28rem; width: 100%; padding: 1.5rem; background: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="font-size: 1.5rem; font-weight: bold; color: #dc2626; margin-bottom: 0.5rem;">Fatal Error</h1>
          <p style="color: #6b7280; margin-bottom: 1rem;">Application failed to initialize. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="width: 100%; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">
            Reload Application
          </button>
        </div>
      </div>
    `;
  }
}

// Start initialization
initializeApp();
