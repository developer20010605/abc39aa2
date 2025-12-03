import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Shield, Zap } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export default function LandingPage() {
  const { login, loginStatus } = useInternetIdentity();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen">
      <section className="container py-20 text-center space-y-6">
        <div className="inline-block p-3 rounded-full bg-primary/10 mb-4">
          <CreditCard className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">QPay Payment System</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Easy, fast, and reliable payment solution
        </p>
        <Button size="lg" onClick={handleLogin} disabled={loginStatus === 'logging-in'} className="mt-8">
          {loginStatus === 'logging-in' ? 'Logging in...' : 'Get Started'}
        </Button>
      </section>

      <section className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Fast Payment</CardTitle>
              <CardDescription>Complete your payment in seconds</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Quick and seamless payment processing with QPay integration
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Secure</CardTitle>
              <CardDescription>Your data is safely stored</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Built on Internet Computer blockchain for maximum security
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Multiple Banks</CardTitle>
              <CardDescription>Choose your preferred bank</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Connected with all major banks in Mongolia
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Login</h3>
              <p className="text-muted-foreground">Securely login using Internet Identity</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Make Payment</h3>
              <p className="text-muted-foreground">Click the payment button and pay with QPay</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Select Bank</h3>
              <p className="text-muted-foreground">Choose your bank and confirm the payment</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
