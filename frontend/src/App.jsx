import React, { useEffect, useState } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetCallerUserRole, useEnsureUserRegistration } from './hooks/useQueries';
import { useActor } from './hooks/useActor';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserRole } from './backend';

function ErrorBoundaryFallback({ error, resetError }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Application Error</p>
                <p className="text-sm">{error?.message || 'An unexpected error occurred'}</p>
              </div>
            </AlertDescription>
          </Alert>
          <button
            onClick={resetError}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    console.error('[ErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          resetError={() => {
            console.log('[ErrorBoundary] Resetting error state and reloading...');
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
        />
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { identity, isInitializing: identityInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationAttempted, setRegistrationAttempted] = useState(false);
  const [initError, setInitError] = useState(null);
  
  const ensureRegistration = useEnsureUserRegistration();
  
  const { data: userRole, isLoading: roleLoading, isFetched: roleFetched } = useGetCallerUserRole(registrationComplete);
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile(registrationComplete);

  const isAuthenticated = !!identity;
  const isActorReady = !!actor && !actorFetching;
  const showProfileSetup = isAuthenticated && registrationComplete && !profileLoading && profileFetched && userProfile === null;

  // Log initialization state
  useEffect(() => {
    console.log('[App] State:', {
      identityInitializing,
      isAuthenticated,
      actorFetching,
      isActorReady,
      registrationComplete,
      registrationAttempted,
      userRole,
      hasProfile: !!userProfile
    });
  }, [identityInitializing, isAuthenticated, actorFetching, isActorReady, registrationComplete, registrationAttempted, userRole, userProfile]);

  // Handle user registration
  useEffect(() => {
    if (isAuthenticated && isActorReady && !registrationAttempted && !ensureRegistration.isPending) {
      console.log('[App] User authenticated and actor ready, ensuring registration...');
      setRegistrationAttempted(true);
      setInitError(null);
      
      ensureRegistration.mutate(undefined, {
        onSuccess: () => {
          console.log('[App] Registration successful');
          setRegistrationComplete(true);
        },
        onError: (error) => {
          console.error('[App] Registration failed:', error);
          setInitError(error?.message || 'Registration failed');
          setTimeout(() => {
            console.log('[App] Retrying registration...');
            setRegistrationAttempted(false);
            setInitError(null);
          }, 2000);
        }
      });
    }
  }, [isAuthenticated, isActorReady, registrationAttempted, ensureRegistration]);

  // Reset registration state on logout
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[App] User logged out, resetting registration state');
      setRegistrationComplete(false);
      setRegistrationAttempted(false);
      setInitError(null);
    }
  }, [isAuthenticated]);

  // Log user role when available
  useEffect(() => {
    if (isAuthenticated && roleFetched && userRole) {
      console.log('[App] User authenticated with role:', userRole);
    }
  }, [isAuthenticated, roleFetched, userRole]);

  const isLoadingUserData = isAuthenticated && (
    !isActorReady ||
    !registrationComplete || 
    profileLoading || 
    roleLoading || 
    !roleFetched
  );

  // Show initialization loading screen
  if (identityInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Initializing application...</p>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Show actor loading screen
  if (actorFetching && !actor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Connecting to backend...</p>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Show user data loading screen
  if (isLoadingUserData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium">Loading user data...</p>
            {initError && (
              <p className="text-sm text-destructive">{initError}</p>
            )}
            {!initError && (
              <p className="text-sm text-muted-foreground">Please wait</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Check if actor is available for authenticated users
  if (isAuthenticated && !actor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Backend Connection Error</p>
                <p className="text-sm">Unable to connect to the backend. Please refresh the page.</p>
              </div>
            </AlertDescription>
          </Alert>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === UserRole.admin;
  const isUser = userRole === UserRole.user;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {!isAuthenticated ? (
          <LandingPage />
        ) : isAdmin ? (
          <AdminDashboard />
        ) : isUser ? (
          <UserDashboard />
        ) : (
          <div className="container py-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Access Pending</h2>
              <p className="text-muted-foreground">
                Your access level is not determined. Please contact the administrator.
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <ProfileSetupModal open={showProfileSetup} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppContent />
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
