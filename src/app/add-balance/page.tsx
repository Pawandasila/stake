// src/app/add-balance/page.tsx
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AddBalanceForm from '@/components/betting/AddBalanceForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

export default function AddBalancePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <Landmark className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-bold">Add Virtual Funds</CardTitle>
            <CardDescription>
              Increase your virtual balance to continue placing simulated bets.
              This is for simulation purposes only; no real money is involved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddBalanceForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
