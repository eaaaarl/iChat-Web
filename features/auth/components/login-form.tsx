'use client'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [message, setMessage] = useState<string>('');

  // Function to check if user already has a Google account
  const checkExistingAccount = async () => {
    try {
      setCheckingExisting(true);
      setMessage('Checking for existing account...');
      
      // Check if there's already a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User already has a session, check if they have a profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (existingProfile) {
          setMessage('Account found! Redirecting...');
          console.log('User already has profile, redirecting to home');
          // Add a small delay to show the message
          setTimeout(() => {
            router.replace('/home');
          }, 1000);
          return;
        }
      }

      setMessage('No existing account found. Proceeding with Google sign-in...');
      // If no existing session, proceed with Google OAuth
      await handleGoogleLogin();
    } catch (error) {
      console.error('Error checking existing account:', error);
      setMessage('Error checking account. Please try again.');
      setCheckingExisting(false);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Initial session:', session);

      // If user is already logged in, redirect to home
      if (session) {
        router.replace('/home');
      }
    }

    getSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'Session:', session);

        // Handle successful sign in
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Check if profile already exists
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles') // Note: table name should be 'profiles' not 'profile'
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
              console.error('Error checking existing profile:', fetchError);
              return;
            }

            // Create profile if it doesn't exist
            if (!existingProfile) {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .insert({
                  id: session.user.id, // This should be id, not user_id
                  username: session.user.user_metadata.email?.split('@')[0] || session.user.email?.split('@')[0], // Generate username from email
                  display_name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'Anonymous User',
                  avatar_url: session.user.user_metadata.avatar_url,
                  status: 'online',
                })
                .select()
                .single();

              if (profileError) {
                console.error('Error creating profile:', profileError);
                // Still redirect even if profile creation fails
              } else {
                console.log('Profile created successfully:', profileData);
              }
            } else {
              await supabase.from('profiles')
                .update({
                  status: 'online',
                })
                .eq('id', session.user.id)
                .select()
                .single();
            }
            router.replace('/home');
          } catch (error) {
            console.error('Error in auth state change:', error);
            // Still redirect to home even if there's an error
            router.replace('/');
          }
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          router.replace('/');
        }

      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
      setMessage('');
      setCheckingExisting(false);
      setLoading(false);
    };
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setMessage('Initiating Google sign-in...');
      
      // First, let's check if there's already a session (user might be partially logged in)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User already has a session, check if they have a profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (existingProfile) {
          // User already has a profile, just redirect to home
          console.log('User already has profile, redirecting to home');
          router.replace('/home');
          return;
        }
      }

      // Proceed with Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Login error:', error);
        setMessage('Error starting Google sign-in. Please try again.');
        setLoading(false);
        // You might want to show a toast or error message here
        return;
      }

      console.log('OAuth initiated:', data);
    } catch (error) {
      console.error('Unexpected error:', error);
      setMessage('Unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in with your Google account. If you already have an account, you&apos;ll be logged in automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={checkExistingAccount}
              disabled={loading || checkingExisting}
            >
              {loading || checkingExisting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {checkingExisting ? 'Checking account...' : 'Connecting...'}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
            {message && (
              <div className="text-center text-sm text-muted-foreground">
                {message}
              </div>
            )}
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <a href="#" className="underline underline-offset-4">
                Sign up with Google
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>.
      </div>
    </div>
  )
}