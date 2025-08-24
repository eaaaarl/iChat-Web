import { supabase } from "@/lib/supabase";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.session) {
        console.log('Successfully authenticated user:', data.session.user.email);
        
        // Check if user already has a profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking existing profile:', profileError);
        }

        if (existingProfile) {
          console.log('User already has profile, updating status to online');
          // Update status to online for existing users
          await supabase
            .from('profiles')
            .update({ status: 'online' })
            .eq('id', data.session.user.id);
        } else {
          console.log('Creating new profile for user');
          // Profile will be created in the login form's auth state change handler
        }

        // Successful authentication - redirect to home
        return NextResponse.redirect(`${origin}/home`);
      } else {
        console.error('Error exchanging code for session:', error);
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
    }
  }

  // Something went wrong - redirect back to login
  return NextResponse.redirect(`${origin}/`);
}
