import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';
import { UserRole } from '../backend';

export function useGetCallerUserProfile(registrationComplete = false) {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
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
      } catch (error) {
        console.error('[useGetCallerUserProfile] Error fetching user profile:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('not registered')) {
          console.log('[useGetCallerUserProfile] User not authorized or not registered, returning null');
          return null;
        }
        return null;
      }
    },
    enabled: !!actor && !actorFetching && registrationComplete,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && registrationComplete && query.isFetched,
  };
}

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
      queryClient.invalidateQueries({ queryKey: ['currentUserRole'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      console.log('[useEnsureUserRegistration] Role and profile queries invalidated');
    },
    onError: (error) => {
      console.error('[useEnsureUserRegistration] Error ensuring user registration:', error);
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

export function useGetCallerUserRole(registrationComplete = false) {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
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
      } catch (error) {
        console.error('[useGetCallerUserRole] Error fetching user role:', error);
        console.log('[useGetCallerUserRole] Defaulting to guest role');
        return UserRole.guest;
      }
    },
    enabled: !!actor && !actorFetching && registrationComplete,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && registrationComplete && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile) => {
      if (!actor) {
        console.error('[useSaveCallerUserProfile] Actor not available');
        throw new Error('Actor not available');
      }
      
      if (!profile.name || !profile.name.trim()) {
        throw new Error('Name is required');
      }
      
      console.log('[useSaveCallerUserProfile] Saving profile:', profile);
      await actor.saveCallerUserProfile(profile);
      console.log('[useSaveCallerUserProfile] Profile saved successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserRole'] });
      console.log('[useSaveCallerUserProfile] Queries invalidated, profile will be refetched');
      toast.success('Profile saved successfully');
    },
    onError: (error) => {
      console.error('[useSaveCallerUserProfile] Error saving user profile:', error);
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGetQPayCredentials() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['qpayCredentials'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getQPayCredentials();
      } catch (error) {
        console.error('Error fetching QPay credentials:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Unauthorized')) {
          toast.error('Please log in again');
          return null;
        }
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSaveQPayCredentials() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveQPayCredentials(credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qpayCredentials'] });
      toast.success('QPay credentials saved successfully');
    },
    onError: (error) => {
      console.error('Error saving QPay credentials:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unauthorized')) {
        toast.error('Please log in again');
      } else {
        toast.error(`Failed to save credentials: ${error.message}`);
      }
    },
  });
}

export function useGetQPayInvoiceConfig() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['qpayInvoiceConfig'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        const config = await actor.getQPayInvoiceConfig();
        console.log('[useGetQPayInvoiceConfig] Fetched config:', config);
        return config;
      } catch (error) {
        console.error('Error fetching QPay invoice config:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Unauthorized')) {
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
    mutationFn: async (config) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[useSaveQPayInvoiceConfig] Saving config:', config);
      return actor.saveQPayInvoiceConfig(config);
    },
    onSuccess: () => {
      console.log('[useSaveQPayInvoiceConfig] Config saved, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['qpayInvoiceConfig'] });
      queryClient.invalidateQueries({ queryKey: ['userInvoiceConfig'] });
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
      toast.success('Invoice configuration saved successfully');
    },
    onError: (error) => {
      console.error('Error saving QPay invoice config:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unauthorized')) {
        toast.error('Please log in again');
      } else {
        toast.error(`Failed to save configuration: ${error.message}`);
      }
    },
  });
}

export function useGetUserPayments() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['userPayments'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getUserPayments();
      } catch (error) {
        console.error('Error fetching user payments:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Unauthorized')) {
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

  return useQuery({
    queryKey: ['allPayments'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllPayments();
      } catch (error) {
        console.error('Error fetching all payments:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Unauthorized')) {
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

  return useQuery({
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
      } catch (error) {
        console.error('Error fetching all invoices:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Unauthorized')) {
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
    mutationFn: async ({ amount, status }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordPayment(amount, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPayments'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
    },
    onError: (error) => {
      console.error('Error recording payment:', error);
    },
  });
}

export function useGetInvoiceConfigForUser() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['userInvoiceConfig'],
    queryFn: async () => {
      if (!actor) {
        return {
          sender_invoice_no: '12345678',
          invoice_receiver_code: 'terminal',
          invoice_description: 'Railway subscription 12 months',
          amount: BigInt(10),
        };
      }
      try {
        const config = await actor.getQPayInvoiceConfig();
        console.log('[useGetInvoiceConfigForUser] Fetched config for user:', config);
        return config;
      } catch (error) {
        console.error('Error fetching invoice config for user:', error);
        return {
          sender_invoice_no: '12345678',
          invoice_receiver_code: 'terminal',
          invoice_description: 'Railway subscription 12 months',
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

  return useQuery({
    queryKey: ['userInvoice'],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getUserInvoice();
      } catch (error) {
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

      console.log('[Payment Flow] Step 1: Checking for existing valid invoice...');
      toast.info('Checking invoice...');
      
      const invoiceCheck = await actor.checkForValidInvoice();
      console.log('[Payment Flow] Invoice check result:', {
        hasValidInvoice: invoiceCheck.hasValidInvoice,
        hasData: !!invoiceCheck.invoiceData,
        amount: invoiceCheck.amount?.toString()
      });

      let invoiceResponse;
      let token = null;

      if (invoiceCheck.hasValidInvoice && invoiceCheck.invoiceData && invoiceCheck.amount !== undefined) {
        console.log('[Payment Flow] ♻️ EXISTING invoice found - reusing without token request');
        console.log('[Payment Flow] Token not requested for reused invoice.');
        
        invoiceResponse = {
          invoiceData: invoiceCheck.invoiceData,
          isNewInvoice: false,
          amount: invoiceCheck.amount
        };
        
        console.log('[Payment Flow] Reusing invoice with stored amount:', invoiceCheck.amount.toString());
        
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
    onSuccess: () => {
      console.log('[Payment Flow] Success callback - response received');
      toast.success('Payment request created successfully!');
      queryClient.invalidateQueries({ queryKey: ['userInvoiceConfig'] });
    },
    onError: (error) => {
      console.error('[Payment Flow] ❌ Error in payment flow:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unauthorized')) {
        toast.error('Please log in again');
      } else if (errorMessage.includes('QPay credentials not found')) {
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
    mutationFn: async ({ invoiceId, invoiceData, amount }) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[Store Invoice] Storing invoice:', invoiceId, 'with amount:', amount.toString());
      return actor.storeUserInvoice(invoiceId, invoiceData, amount);
    },
    onSuccess: () => {
      console.log('[Store Invoice] ✅ Invoice stored successfully with historical amount');
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['userInvoice'] });
    },
    onError: (error) => {
      console.error('[Store Invoice] ❌ Error storing invoice:', error);
    },
  });
}

export function useCheckPaymentStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, invoiceId }) => {
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
        toast.success('Payment successful!');
      }
    },
    onError: (error) => {
      console.error('[Payment Status] Error checking payment status:', error);
    },
  });
}
