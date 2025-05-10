// src/app/profile/page.tsx
"use client";

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserCog } from 'lucide-react';
import Loading from '../loading';

export default function ProfilePage() {
  const { currentUser, loading, isCheckingProfile, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Initial check: if not loading and no user, redirect to login
    if (!loading && !isCheckingProfile && !currentUser) {
      router.push('/login');
    }
    // Refresh user data when component mounts to ensure fresh profile status
    if (currentUser) {
        refreshUser();
    }
  }, [loading, isCheckingProfile, currentUser, router, refreshUser]);

  // If loading auth state or user data, show a loader
  if (loading || isCheckingProfile) {
    return <Loading />;
  }
  
  // If still no current user after loading (e.g. redirected then navigated back), show loader before redirecting again
  if (!currentUser) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow container max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <UserCog className="mx-auto h-12 w-12 text-primary mb-2" />
            <CardTitle className="text-3xl font-bold">
              {currentUser?.isProfileComplete ? "Update Your Profile" : "Complete Your Profile"}
            </CardTitle>
            <CardDescription>
              {currentUser?.isProfileComplete 
                ? "Keep your information up to date." 
                : "Please fill in your details to complete your registration and access all features."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
