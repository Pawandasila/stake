// src/components/profile/ProfileForm.tsx
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UploadCloud, UserCircle2 } from 'lucide-react';
import type { ProfileFormData } from '@/types';
import Image from 'next/image';
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, differenceInYears, isValid, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"


const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50,"Display name too long."),
  photoURL: z.string().url("Must be a valid URL for photo.").optional().or(z.literal('')),
  address: z.string().min(5, "Address seems too short.").max(200, "Address too long.").optional().or(z.literal('')),
  dob: z.string().optional().refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "Date of birth must be in YYYY-MM-DD format or empty.",
  }),
  bankName: z.string().max(50, "Bank name too long.").optional().or(z.literal('')),
  accountNumber: z.string().max(30, "Account number too long.").optional().or(z.literal('')),
});


export default function ProfileForm() {
  const { currentUser, updateUserProfile, loading: authLoading, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      photoURL: "",
      address: "",
      dob: "",
      bankName: "",
      accountNumber: "",
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        displayName: currentUser.displayName || "",
        photoURL: currentUser.photoURL || "",
        address: currentUser.address || "",
        dob: currentUser.dob || "",
        bankName: currentUser.bankName || "",
        accountNumber: currentUser.accountNumber || "",
      });
      if (currentUser.dob) {
        const birthDate = parseISO(currentUser.dob);
        if (isValid(birthDate)) {
          setAge(differenceInYears(new Date(), birthDate));
        }
      }
    }
  }, [currentUser, form]);

  const handleDobChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      form.setValue("dob", formattedDate, { shouldValidate: true });
      setAge(differenceInYears(new Date(), date));
    } else {
      form.setValue("dob", undefined, { shouldValidate: true });
      setAge(null);
    }
  };


  async function onSubmit(values: ProfileFormData) {
    setIsLoading(true);
    try {
      await updateUserProfile(values);
      // Redirect is handled by AuthContext or page effect after profile update
    } catch (err) {
      // Error toast handled by updateUserProfile
    } finally {
      setIsLoading(false);
    }
  }

  const currentPhotoURL = form.watch("photoURL");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col items-center space-y-4">
          {currentPhotoURL ? (
            <Image 
              src={currentPhotoURL} 
              alt="Profile Preview" 
              width={128} 
              height={128} 
              className="rounded-full object-cover h-32 w-32 border-2 border-primary"
              data-ai-hint="user avatar"
              onError={(e) => {
                // Handle image load error, e.g., set to a fallback or clear
                console.warn("Error loading image:", e);
                form.setValue("photoURL", ""); 
              }}
            />
          ) : (
            <UserCircle2 className="h-32 w-32 text-muted-foreground" />
          )}
           <FormField
            control={form.control}
            name="photoURL"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Profile Photo URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com/your-photo.jpg" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the URL of your profile picture.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Your awesome username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(parseISO(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => handleDobChange(date)}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {age !== null && <FormDescription>Your age: {age} years old.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-medium text-muted-foreground border-b pb-2">Bank Details (Simulation Only)</h3>
         <p className="text-xs text-muted-foreground -mt-6">These details are for simulation and are not stored securely. Do not enter real bank information.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="bankName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Bank Name</FormLabel>
                <FormControl>
                    <Input placeholder="Simulated Bank Inc." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                    <Input placeholder="000-SIMULATE-000" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || authLoading}>
          {(isLoading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </form>
    </Form>
  );
}
