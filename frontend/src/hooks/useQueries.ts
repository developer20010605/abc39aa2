import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, QPayCredentials, QPayInvoiceConfig, PaymentRecord, InvoiceRecord, InvoiceResponse, UserRole, InvoiceCheckResult } from '../backend';
import { Principal } from '@icp-sdk/core/principal';
import { toast } from 'sonner';

/**
 * Fetch the current user's profile
 * Only enabled after registration is complete to prevent premature backend calls
 */
export function useGetCallerUserProfile(registrationComplete: boolean = false) {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) {
        console.error('[useGetCallerUserProfile] Actor not available');
        throw new Error('Actor not available');
      }
      
      try {
        console.log('[useGetCallerUserProfile] Fetching user profile...');
        const profile = await actor.getCallerUserProfile();
        console.log('[useGetCallerUserProfile] Profile fetched:', profile ? 'exists' : 'null');
        return profile;
      } catch (error: any) {
        console.error('[useGetCallerUserProfile] Error fetching user profile:', error);
        // If unauthorized or any error, return null instead of throwing
        // This prevents error states when user is not yet registered
        if (error.message?.includes('Unauthorized') || error.message?.includes('not registered')) {
          console.log('[useGetCallerUserProfile] User not authorized or not registered, returning null');
          return null;
        }
        // For other errors, still return null to prevent breaking the UI
        return null;
      }
    },
    // CRITICAL: Only enable after actor is ready AND registration is complete
    // This prevents fetching profile before user is registered
    enabled: !!actor && !actorFetching && registrationComplete,
    retry: false, // Don't retry on error to prevent multiple failed requests
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && registrationComplete && query.isFetched,
  };
}

/**
 * Ensure the current user is registered in the backend
 * This should be called before any other user-specific operations
 */
export function useEnsureUserRegistration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) {
        console.error('[useEnsureUserRegistration] Actor not available');
        throw new Error('Actor not available');
      }
      console.log('[useEnsureUserRegistration] Ensuring user is registered...');
      await actor.ensureCallerUserRole();
      console.log('[useEnsureUserRegistration] User registration complete');
    },
    onSuccess: () => {
      // Invalidate role and profile queries to fetch the updated data
      queryClient.invalidateQueries({ queryKey: ['currentUserRole'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      console.log('[useEnsureUserRegistration] Role and profile queries invalidated');
    },
    onError: (error: Error) => {
      console.error('[useEnsureUserRegistration] Error ensuring user registration:', error);
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Fetch the current user's role
 * Only enabled after registration is complete to prevent premature backend calls
 */
export function useGetCallerUserRole(registrationComplete: boolean = false) {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserRole>({
    queryKey: ['currentUserRole'],
    queryFn: async () => {
      if (!actor) {
        console.error('[useGetCallerUserRole] Actor not available');
        throw new Error('Actor not available');
      }
      
      try {
        console.log('[useGetCallerUserRole] Fetching user role...');
        const role = await actor.getCallerUserRole();
        console.log('[useGetCallerUserRole] Fetched role:', role);
        return role;
      } catch (error: any) {
        console.error('[useGetCallerUserRole] Error fetching user role:', error);
        // Default to guest if error to prevent breaking the UI
        console.log('[useGetCallerUserRole] Defaulting to guest role');
        return 'guest' as UserRole;
      }
    },
    // CRITICAL: Only enable after actor is ready AND registration is complete
    // This prevents fetching role before user is registered, avoiding race conditions
    enabled: !!actor && !actorFetching && registrationComplete,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && registrationComplete && query.isFetched,
  };
}

/**
 * Save the current user's profile
 * This will trigger profile and role query invalidation on success
 */
export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) {
        console.error('[useSaveCallerUserProfile] Actor not available');
        throw new Error('Actor not available');
      }
      
      // Validate profile data
      if (!profile.name || !profile.name.trim()) {
        throw new Error('Name is required');
      }
      
      console.log('[useSaveCallerUserProfile] Saving profile:', profile);
      // Backend's saveCallerUserProfile already calls ensureUserRole internally
      await actor.saveCallerUserProfile(profile);
      console.log('[useSaveCallerUserProfile] Profile saved successfully');
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRole'] });
      console.log('[useSaveCallerUserProfile] Queries invalidated, profile will be refetched');
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      console.error('[useSaveCallerUserProfile] Error saving user profile:', error);
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch (error: any) {
        console.error('Error checking admin status:', error);
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useGetQPayCredentials() {
  const { actor, isFetching } = useActor();

  return useQuery<QPayCredentials | null>({
    queryKey: ['qpayCredentials'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getQPayCredentials();
      } catch (error: any) {
        console.error('Error fetching QPay credentials:', error);
        if (error.message?.includes('Unauthorized')) {
          toast.error('Please log in again');
          return null;
        }
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSaveQPayCredentials() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: QPayCredentials) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveQPayCredentials(credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qpayCredentials'] });
      toast.success('QPay credentials saved successfully');
    },
    onError: (error: Error) => {
      console.error('Error saving QPay credentials:', error);
      if (error.message?.includes('Unauthorized')) {
        toast.error('Please log in again');
      } else {
        toast.error(`Failed to save credentials: ${error.message}`);
      }
    },
  });
}

export function useGetQPayInvoiceConfig() {
  const { actor, isFetching } = useActor();

  return useQuery<QPayInvoiceConfig>({
    queryKey: ['qpayInvoiceConfig'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        const config = await actor.getQPayInvoiceConfig();
        console.log('[useGetQPayInvoiceConfig] Fetched config:', config);
        return config;
      } catch (error: any) {
        console.error('Error fetching QPay invoice config:', error);
        if (error.message?.includes('Unauthorized')) {
          toast.error('Please log in again');
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useSaveQPayInvoiceConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: QPayInvoiceConfig) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[useSaveQPayInvoiceConfig] Saving config:', config);
      return actor.saveQPayInvoiceConfig(config);
    },
    onSuccess: () => {
      console.log('[useSaveQPayInvoiceConfig] Config saved, invalidating queries');
      // Invalidate all related queries to ensure UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['qpayInvoiceConfig'] });
      queryClient.invalidateQueries({ queryKey: ['userInvoiceConfig'] });
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
      toast.success('Invoice configuration saved successfully');
    },
    onError: (error: Error) => {
      console.error('Error saving QPay invoice config:', error);
      if (error.message?.includes('Unauthorized')) {
        toast.error('Please log in again');
      } else {
        toast.error(`Failed to save configuration: ${error.message}`);
      }
    },
  });
}

export function useGetUserPayments() {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentRecord[]>({
    queryKey: ['userPayments'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getUserPayments();
      } catch (error: any) {
        console.error('Error fetching user payments:', error);
        if (error.message?.includes('Unauthorized')) {
          toast.error('Please log in again');
        }
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 1 * 60 * 1000,
  });
}

export function useGetAllPayments() {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentRecord[]>({
    queryKey: ['allPayments'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllPayments();
      } catch (error: any) {
        console.error('Error fetching all payments:', error);
        if (error.message?.includes('Unauthorized')) {
          toast.error('Please log in again');
        }
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 1 * 60 * 1000,
  });
}

export function useGetAllInvoices() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<[string, InvoiceRecord]>>({
    queryKey: ['allInvoices'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getAllInvoices();
        console.log('[useGetAllInvoices] Fetched invoices from backend:', result.length, 'invoices');
        result.forEach(([id, inv]) => {
          console.log(`[useGetAllInvoices] Invoice ${id}: amount = ${inv.amount.toString()}`);
        });
        return result;
      } catch (error: any) {
        console.error('Error fetching all invoices:', error);
        if (error.message?.includes('Unauthorized')) {
          toast.error('Please log in again');
        }
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useRecordPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, status }: { amount: bigint; status: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordPayment(amount, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPayments'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
    },
    onError: (error: Error) => {
      console.error('Error recording payment:', error);
    },
  });
}

export function useGetInvoiceConfigForUser() {
  const { actor, isFetching } = useActor();

  return useQuery<QPayInvoiceConfig | null>({
    queryKey: ['userInvoiceConfig'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const config = await actor.getQPayInvoiceConfig();
        console.log('[useGetInvoiceConfigForUser] Fetched config for user:', config);
        return config;
      } catch (error: any) {
        console.error('Error fetching invoice config for user:', error);
        return {
          sender_invoice_no: '12345678',
          invoice_receiver_code: 'terminal',
          invoice_description: 'Railway эрх 12сар',
          amount: BigInt(10),
        };
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useGetUserInvoice() {
  const { actor, isFetching } = useActor();

  return useQuery<InvoiceRecord | null>({
    queryKey: ['userInvoice'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getUserInvoice();
      } catch (error: any) {
        console.error('Error fetching user invoice:', error);
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 0,
  });
}

export function useMakeQPayPayment() {
  const { actor } = useActor();
  const recordPayment = useRecordPayment();
  const storeInvoice = useStoreUserInvoice();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');

      console.log('[Payment Flow] Step 0: Starting optimized payment flow...');

      // OPTIMIZED FLOW: Check for existing valid invoice first (no token needed)
      console.log('[Payment Flow] Step 1: Checking for existing valid invoice...');
      toast.info('Checking invoice...');
      
      const invoiceCheck: InvoiceCheckResult = await actor.checkForValidInvoice();
      console.log('[Payment Flow] Invoice check result:', {
        hasValidInvoice: invoiceCheck.hasValidInvoice,
        hasData: !!invoiceCheck.invoiceData,
        amount: invoiceCheck.amount?.toString()
      });

      let invoiceResponse: InvoiceResponse;
      let token: string | null = null;

      if (invoiceCheck.hasValidInvoice && invoiceCheck.invoiceData && invoiceCheck.amount !== undefined) {
        // EXISTING INVOICE PATH: Reuse without token request
        console.log('[Payment Flow] ♻️ EXISTING invoice found - reusing without token request');
        console.log('[Payment Flow] Token not requested for reused invoice.');
        
        invoiceResponse = {
          invoiceData: invoiceCheck.invoiceData,
          isNewInvoice: false,
          amount: invoiceCheck.amount
        };
        
        console.log('[Payment Flow] Reusing invoice with stored amount:', invoiceCheck.amount.toString());
        
        // Still need token for payment status checking
        console.log('[Payment Flow] Requesting token for payment status checking...');
        const tokenResponse = await actor.makeQPayTokenRequest();
        try {
          const tokenData = JSON.parse(tokenResponse);
          token = tokenData.access_token;
          console.log('[Payment Flow] Token obtained for status checking');
        } catch (e) {
          console.error('[Payment Flow] Error parsing token for status check:', e);
        }
      } else {
        // NEW INVOICE PATH: Request token and create new invoice
        console.log('[Payment Flow] No valid invoice found - creating new invoice');
        console.log('[Payment Flow] Step 2: Requesting QPay token...');
        toast.info('Requesting QPay token...');
        
        const tokenResponse = await actor.makeQPayTokenRequest();
        console.log('[Payment Flow] Token response received');

        try {
          const tokenData = JSON.parse(tokenResponse);
          token = tokenData.access_token;
          if (!token) throw new Error('Token not found');
          console.log('[Payment Flow] Token extracted successfully');
        } catch (e) {
          console.error('[Payment Flow] Error parsing token response:', e);
          throw new Error('Failed to parse token');
        }

        console.log('[Payment Flow] Step 3: Creating new invoice with token...');
        toast.info('Creating new invoice...');
        invoiceResponse = await actor.getValidOrCreateInvoice(token);
        console.log('[Payment Flow] New invoice created:', {
          isNewInvoice: invoiceResponse.isNewInvoice,
          amount: invoiceResponse.amount.toString()
        });
      }

      const invoiceData = JSON.parse(invoiceResponse.invoiceData);
      console.log('[Payment Flow] Parsed invoice data:', {
        invoice_id: invoiceData.invoice_id,
        amount: invoiceData.amount
      });
      
      // CRITICAL: Only store invoice if it's newly created
      // This prevents duplicate entries when reusing existing invoices
      if (invoiceResponse.isNewInvoice && invoiceData.invoice_id) {
        console.log('[Payment Flow] ✅ NEW invoice created - storing in backend');
        console.log('[Payment Flow] Invoice ID:', invoiceData.invoice_id);
        console.log('[Payment Flow] Storing with amount:', invoiceResponse.amount.toString());
        await storeInvoice.mutateAsync({
          invoiceId: invoiceData.invoice_id,
          invoiceData: invoiceResponse.invoiceData,
          amount: invoiceResponse.amount,
        });
        console.log('[Payment Flow] ✅ Invoice stored successfully with historical amount');
        queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
        queryClient.invalidateQueries({ queryKey: ['userInvoice'] });
      } else {
        console.log('[Payment Flow] ♻️ EXISTING invoice reused - NOT storing again');
        console.log('[Payment Flow] Existing invoice has stored amount:', invoiceResponse.amount.toString());
        console.log('[Payment Flow] This prevents duplicate entries in admin invoice list');
      }

      try {
        console.log('[Payment Flow] Recording payment with amount:', invoiceResponse.amount.toString());
        recordPayment.mutate({ amount: invoiceResponse.amount, status: 'pending' });
      } catch (error) {
        console.error('[Payment Flow] Error recording payment:', error);
        recordPayment.mutate({ amount: BigInt(10), status: 'pending' });
      }

      console.log('[Payment Flow] ✅ Payment flow completed successfully');
      return {
        invoiceData: invoiceResponse.invoiceData,
        token: token,
        invoiceId: invoiceData.invoice_id
      };
    },
    onSuccess: (response) => {
      console.log('[Payment Flow] Success callback - response received');
      toast.success('Payment request created successfully!');
      queryClient.invalidateQueries({ queryKey: ['userInvoiceConfig'] });
    },
    onError: (error: Error) => {
      console.error('[Payment Flow] ❌ Error in payment flow:', error);
      if (error.message?.includes('Unauthorized')) {
        toast.error('Please log in again');
      } else if (error.message?.includes('QPay credentials not found')) {
        toast.error('QPay credentials not found. Please contact administrator.');
      } else {
        toast.error(`Payment failed: ${error.message}`);
      }
    },
  });
}

export function useStoreUserInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, invoiceData, amount }: { invoiceId: string; invoiceData: string; amount: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[Store Invoice] Storing invoice:', invoiceId, 'with amount:', amount.toString());
      return actor.storeUserInvoice(invoiceId, invoiceData, amount);
    },
    onSuccess: () => {
      console.log('[Store Invoice] ✅ Invoice stored successfully with historical amount');
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['userInvoice'] });
    },
    onError: (error: Error) => {
      console.error('[Store Invoice] ❌ Error storing invoice:', error);
    },
  });
}

export function useCheckPaymentStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, invoiceId }: { token: string; invoiceId: string }) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[Payment Status] Checking payment status for invoice:', invoiceId);
      const isPaid = await actor.checkPaymentStatus(token, invoiceId);
      console.log('[Payment Status] Payment status:', isPaid ? 'PAID' : 'PENDING');
      return isPaid;
    },
    onSuccess: (isPaid) => {
      if (isPaid) {
        console.log('[Payment Status] Payment confirmed! Invalidating queries...');
        queryClient.invalidateQueries({ queryKey: ['userInvoice'] });
        queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
        queryClient.invalidateQueries({ queryKey: ['userPayments'] });
        queryClient.invalidateQueries({ queryKey: ['allPayments'] });
        toast.success('Төлбөр амжилттай төлөгдлөө!');
      }
    },
    onError: (error: Error) => {
      console.error('[Payment Status] Error checking payment status:', error);
    },
  });
}
