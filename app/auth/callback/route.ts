import { supabase } from "@/lib/supabase";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful authentication - redirect to home
      return NextResponse.redirect(`${origin}/home`);
    }
  }

  // Something went wrong - redirect back to login
  return NextResponse.redirect(`${origin}/`);
}
