
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';
import SignUpForm from '@/components/auth/SignUpForm';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function SignUpPage() {
  const { signInWithGoogle, currentUser, loading, isCheckingProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isCheckingProfile && currentUser) {
      if (currentUser.isProfileComplete) {
        router.push('/'); 
      } else {
        router.push('/profile');
      }
    }
  }, [currentUser, loading, isCheckingProfile, router]);

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
      // Redirect is handled by useEffect or AuthContext
    } catch (error) {
      console.error("Sign up failed", error);
      // Toast is handled by AuthContext
    }
  };

  if (loading || isCheckingProfile || (!loading && !isCheckingProfile && currentUser)) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
        <UserPlus className="h-16 w-16 animate-pulse text-primary mb-4" />
        <p className="text-xl font-semibold text-foreground">Loading session...</p>
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
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <SignUpForm />
          
          <p className="text-xs text-center text-muted-foreground">
            By signing up, you agree to our terms and conditions (simulation only).
            <br />
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
