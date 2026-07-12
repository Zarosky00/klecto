"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.extend({
    displayName: z.string().trim().min(2).max(60),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details." };

  const supabase = await createClient();
  const { email, password, displayName, username } = parsed.data;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm`,
    },
  });
  if (error) return { error: error.message };
  return { success: "Check your email to confirm your account." };
}
