
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, ChromeIcon } from 'lucide-react'; // Using ChromeIcon as a placeholder for Google G
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function SignUpPage() {
  const { signInWithGoogle, currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && currentUser) {
      router.push('/'); // Redirect if already logged in
    }
  }, [currentUser, loading, router]);

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
      // Redirect is handled within signInWithGoogle or by useEffect
    } catch (error) {
      console.error("Sign up failed", error);
      // Show error toast to user
    }
  };

  if (loading || (!loading && currentUser)) {
    // Show loading indicator or nothing if redirecting
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
        <UserPlus className="h-16 w-16 animate-pulse text-primary mb-4" />
        <p className="text-xl font-semibold text-foreground">Setting up account...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-card p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="text-3xl font-bold">Create Your Account</CardTitle>
          <CardDescription>
            Join Victory Vision today to start simulating bets and get AI-powered insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={handleGoogleSignUp} 
            className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={loading}
          >
             <div className="flex items-center justify-center">
                <Image src="/google-logo.svg" alt="Google" width={20} height={20} className="mr-2 bg-white rounded-full p-0.5" data-ai-hint="google logo" />
                Sign Up with Google
            </div>
          </Button>
          {/* Placeholder for Email/Password sign up form if needed later */}
          {/* <Separator className="my-4" />
          <p className="text-center text-sm text-muted-foreground">Or sign up with email</p>
          <form className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled>Sign Up with Email (Coming Soon)</Button>
          </form> */}
          <p className="text-xs text-center text-muted-foreground">
            By signing up, you agree to our terms and conditions (simulation only).
            Already have an account? <a href="/login" className="text-primary hover:underline">Log In</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
