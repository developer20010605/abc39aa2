import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Loader2, Save, AlertCircle, Receipt, RefreshCw } from 'lucide-react';
import { 
  useGetQPayCredentials, 
  useSaveQPayCredentials, 
  useGetQPayInvoiceConfig,
  useSaveQPayInvoiceConfig,
  useGetAllInvoices
} from '../hooks/useQueries';
import { formatTimestamp } from '../lib/utils';

export default function AdminDashboard() {
  const { data: credentials, isLoading: credentialsLoading, error: credentialsError } = useGetQPayCredentials();
  const { data: invoiceConfig, isLoading: configLoading, error: configError, refetch: refetchConfig } = useGetQPayInvoiceConfig();
  const { data: invoices, isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useGetAllInvoices();
  const saveCredentials = useSaveQPayCredentials();
  const saveInvoiceConfig = useSaveQPayInvoiceConfig();

  const [credentialsForm, setCredentialsForm] = useState({
    client_username: '',
    client_password: '',
    client_invoice: '',
  });

  const [invoiceConfigForm, setInvoiceConfigForm] = useState({
    sender_invoice_no: '12345678',
    invoice_receiver_code: 'terminal',
    invoice_description: 'Railway subscription 12 months',
    amount: BigInt(10),
  });

  const [isCredentialsFormDirty, setIsCredentialsFormDirty] = useState(false);
  const [isConfigFormDirty, setIsConfigFormDirty] = useState(false);

  useEffect(() => {
    if (credentials && !isCredentialsFormDirty) {
      setCredentialsForm(credentials);
    }
  }, [credentials, isCredentialsFormDirty]);

  useEffect(() => {
    if (invoiceConfig && !isConfigFormDirty) {
      setInvoiceConfigForm(invoiceConfig);
    }
  }, [invoiceConfig, isConfigFormDirty]);

  useEffect(() => {
    console.log('[Admin Dashboard] Component mounted - refetching data');
    refetchConfig();
    refetchInvoices();
  }, [refetchConfig, refetchInvoices]);

  const handleCredentialsInputChange = (field, value) => {
    setCredentialsForm((prev) => ({ ...prev, [field]: value }));
    setIsCredentialsFormDirty(true);
  };

  const handleInvoiceConfigInputChange = (field, value) => {
    setInvoiceConfigForm((prev) => ({ ...prev, [field]: value }));
    setIsConfigFormDirty(true);
  };

  const handleSaveCredentials = () => {
    saveCredentials.mutate(credentialsForm, {
      onSuccess: () => {
        setIsCredentialsFormDirty(false);
      },
    });
  };

  const handleSaveInvoiceConfig = () => {
    console.log('[Admin Dashboard] Saving invoice config:', invoiceConfigForm);
    saveInvoiceConfig.mutate(invoiceConfigForm, {
      onSuccess: () => {
        console.log('[Admin Dashboard] Invoice config saved successfully');
        setIsConfigFormDirty(false);
        refetchInvoices();
      },
    });
  };

  const handleRefreshInvoices = () => {
    console.log('[Admin Dashboard] Manual refresh triggered');
    refetchConfig();
    refetchInvoices();
  };

  useEffect(() => {
    if (invoices) {
      console.log('[Admin Dashboard] Total invoices loaded:', invoices.length);
      console.log('[Admin Dashboard] Current invoice config amount:', invoiceConfig?.amount.toString());
      invoices.forEach(([id, inv]) => {
        console.log(`[Admin Dashboard] Invoice ${id}: stored amount = ${inv.amount.toString()}`);
      });
    }
  }, [invoices, invoiceConfig]);

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">System configuration and payment information</p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            QPay Settings
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>QPay Connection Details</CardTitle>
              <CardDescription>Enter your QPay connection credentials</CardDescription>
            </CardHeader>
            <CardContent>
              {credentialsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading...</span>
                </div>
              ) : credentialsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load settings. Please log in again.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {!credentials && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        QPay is not configured. Please enter the details below.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={credentialsForm.client_username}
                      onChange={(e) => handleCredentialsInputChange('client_username', e.target.value)}
                      placeholder="Enter client_username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={credentialsForm.client_password}
                      onChange={(e) => handleCredentialsInputChange('client_password', e.target.value)}
                      placeholder="Enter client_password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice">Invoice Code</Label>
                    <Input
                      id="invoice"
                      value={credentialsForm.client_invoice}
                      onChange={(e) => handleCredentialsInputChange('client_invoice', e.target.value)}
                      placeholder="Enter client_invoice"
                    />
                  </div>
                  <Button
                    onClick={handleSaveCredentials}
                    disabled={saveCredentials.isPending || !isCredentialsFormDirty}
                    className="w-full"
                  >
                    {saveCredentials.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Configuration</CardTitle>
              <CardDescription>Configure invoice basic information</CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading...</span>
                </div>
              ) : configError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load settings. Please log in again.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender_invoice_no">Sender Invoice Number</Label>
                    <Input
                      id="sender_invoice_no"
                      value={invoiceConfigForm.sender_invoice_no}
                      onChange={(e) => handleInvoiceConfigInputChange('sender_invoice_no', e.target.value)}
                      placeholder="12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_receiver_code">Receiver Code</Label>
                    <Input
                      id="invoice_receiver_code"
                      value={invoiceConfigForm.invoice_receiver_code}
                      onChange={(e) => handleInvoiceConfigInputChange('invoice_receiver_code', e.target.value)}
                      placeholder="terminal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_description">Description</Label>
                    <Input
                      id="invoice_description"
                      value={invoiceConfigForm.invoice_description}
                      onChange={(e) => handleInvoiceConfigInputChange('invoice_description', e.target.value)}
                      placeholder="Railway subscription 12 months"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={invoiceConfigForm.amount.toString()}
                      onChange={(e) => handleInvoiceConfigInputChange('amount', BigInt(e.target.value || '0'))}
                      placeholder="10"
                    />
                  </div>
                  <Button
                    onClick={handleSaveInvoiceConfig}
                    disabled={saveInvoiceConfig.isPending || !isConfigFormDirty}
                    className="w-full"
                  >
                    {saveInvoiceConfig.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Payments</CardTitle>
                  <CardDescription>
                    User payment history
                    {invoices && invoices.length > 0 && (
                      <span className="ml-2 text-sm font-medium">
                        (Total: {invoices.length})
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshInvoices}
                  disabled={invoicesLoading || configLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${invoicesLoading || configLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoicesLoading || configLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading...</span>
                </div>
              ) : invoicesError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load payment information. Please log in again.
                  </AlertDescription>
                </Alert>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoiceConfig && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Current configured amount: <strong>₮{invoiceConfig.amount.toString()}</strong>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          The list below shows the amount at the time each invoice was created
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map(([invoiceId, invoice]) => {
                          return (
                            <TableRow key={invoiceId}>
                              <TableCell className="font-mono text-xs">
                                {invoice.user.toString().slice(0, 20)}...
                              </TableCell>
                              <TableCell className="font-medium">₮{invoice.amount.toString()}</TableCell>
                              <TableCell>
                                <Badge variant={invoice.isPaid ? 'default' : 'secondary'}>
                                  {invoice.isPaid ? 'Paid' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatTimestamp(invoice.createdAt)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payments found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Payments will appear here after users make payments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
