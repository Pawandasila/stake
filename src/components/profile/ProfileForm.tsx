// src/components/profile/ProfileForm.tsx
"use client";

import { useEffect, useState, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';


const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").max(50,"Display name too long."),
  address: z.string().min(5, "Address seems too short.").max(200, "Address too long.").optional().or(z.literal('')),
  dob: z.string().optional().refine(val => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "Date of birth must be in YYYY-MM-DD format or empty.",
  }),
  bankName: z.string().max(50, "Bank name too long.").optional().or(z.literal('')),
  accountNumber: z.string().max(30, "Account number too long.").optional().or(z.literal('')),
  // photoFile is handled separately and not part of Zod schema validation here
});


export default function ProfileForm() {
  const { currentUser, updateUserProfile, loading: authLoading, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const form = useForm<Omit<ProfileFormData, 'photoFile'>>({ // Zod schema handles these fields
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      address: "",
      dob: "",
      bankName: "",
      accountNumber: "",
    },
  });

  // For handling photoFile separately, not through react-hook-form's direct state for Zod
  const [photoFile, setPhotoFile] = useState<File | null | undefined>(undefined);


  useEffect(() => {
    if (currentUser) {
      form.reset({
        displayName: currentUser.displayName || "",
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
      if (currentUser.photoURL) {
        setImagePreview(currentUser.photoURL);
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File Too Large", description: "Profile picture cannot exceed 2MB.", variant: "destructive" });
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Please select a JPG, PNG, GIF or WEBP image.", variant: "destructive" });
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(null); // Clear if no file selected or selection cancelled
      setImagePreview(currentUser?.photoURL || null); // Revert to current user's photo or null
    }
  };


  async function onSubmit(values: Omit<ProfileFormData, 'photoFile'>) {
    setIsLoading(true);
    const fullProfileData: ProfileFormData = {
      ...values,
      photoFile: photoFile, // Add the manually managed photoFile
    };
    try {
      await updateUserProfile(fullProfileData);
      // Redirect is handled by AuthContext or page effect after profile update
    } catch (err) {
      // Error toast handled by updateUserProfile
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col items-center space-y-4">
          {imagePreview ? (
            <Image 
              src={imagePreview} 
              alt="Profile Preview" 
              width={128} 
              height={128} 
              className="rounded-full object-cover h-32 w-32 border-2 border-primary"
              data-ai-hint="user avatar"
              onError={() => {
                setImagePreview(null); // Fallback if preview URL is broken
              }}
            />
          ) : (
            <UserCircle2 className="h-32 w-32 text-muted-foreground" />
          )}
           <FormItem className="w-full">
             <FormLabel htmlFor="photoFile">Profile Photo</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    id="photoFile"
                    type="file" 
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    ref={fileInputRef}
                  />
                   <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                     <UploadCloud className="h-5 w-5 text-muted-foreground" />
                   </div>
                </div>
              </FormControl>
              <FormDescription>
                Upload a new profile picture (max 2MB, JPG/PNG/GIF/WEBP).
              </FormDescription>
              <FormMessage /> {/* For any general errors related to this field if needed */}
            </FormItem>
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
                    captionLayout="dropdown-buttons"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
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
