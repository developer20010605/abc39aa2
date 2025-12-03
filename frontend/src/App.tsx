import { useEffect, useState } from 'react';
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
import { Loader2 } from 'lucide-react';

export default function App() {
  const { identity, isInitializing: identityInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  
  // Track registration completion state
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registrationAttempted, setRegistrationAttempted] = useState(false);
  
  const ensureRegistration = useEnsureUserRegistration();
  
  // Only fetch role AFTER registration is complete
  const { data: userRole, isLoading: roleLoading, isFetched: roleFetched } = useGetCallerUserRole(registrationComplete);
  
  // Only fetch profile AFTER registration is complete
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile(registrationComplete);

  const isAuthenticated = !!identity;
  
  // Determine if actor is ready: actor exists and not fetching
  const isActorReady = !!actor && !actorFetching;
  
  // Show profile setup modal only when:
  // 1. User is authenticated
  // 2. Registration is complete
  // 3. Profile is not loading
  // 4. Profile has been fetched
  // 5. Profile is null (doesn't exist)
  const showProfileSetup = isAuthenticated && registrationComplete && !profileLoading && profileFetched && userProfile === null;

  // Ensure user is registered when they log in - ONLY after actor is fully ready
  useEffect(() => {
    if (isAuthenticated && isActorReady && !registrationAttempted && !ensureRegistration.isPending) {
      console.log('[App] User authenticated and actor ready, ensuring registration...');
      setRegistrationAttempted(true);
      ensureRegistration.mutate(undefined, {
        onSuccess: () => {
          console.log('[App] Registration successful');
          setRegistrationComplete(true);
        },
        onError: (error) => {
          console.error('[App] Registration failed:', error);
          // Reset and retry after a short delay
          setTimeout(() => {
            console.log('[App] Retrying registration...');
            setRegistrationAttempted(false);
          }, 2000);
        }
      });
    }
  }, [isAuthenticated, isActorReady, registrationAttempted, ensureRegistration]);

  // Reset registration state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[App] User logged out, resetting registration state');
      setRegistrationComplete(false);
      setRegistrationAttempted(false);
    }
  }, [isAuthenticated]);

  // Log role information for debugging
  useEffect(() => {
    if (isAuthenticated && roleFetched && userRole) {
      console.log('[App] User authenticated with role:', userRole);
    }
  }, [isAuthenticated, roleFetched, userRole]);

  // Show loading screen while:
  // 1. Identity is initializing
  // 2. Actor is being fetched/created or not ready
  // 3. User is authenticated AND (registering OR loading profile OR loading role OR role not fetched yet)
  const isLoadingUserData = isAuthenticated && (
    !isActorReady ||
    !registrationComplete || 
    profileLoading || 
    roleLoading || 
    !roleFetched
  );

  // Show loading screen during initialization or when loading user data
  if (identityInitializing || actorFetching || isLoadingUserData) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Ачааллаж байна...</p>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Determine which dashboard to show based on role
  const isAdmin = userRole === 'admin';
  const isUser = userRole === 'user';

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Хандалт хүлээгдэж байна</h2>
                <p className="text-muted-foreground">
                  Таны хандалтын түвшин тодорхойгүй байна. Администратортай холбогдоно уу.
                </p>
              </div>
            </div>
          )}
        </main>
        <Footer />
        <ProfileSetupModal open={showProfileSetup} />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
