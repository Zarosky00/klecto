/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { signIn, signUp, type AuthState } from "./actions";

const initialState: AuthState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [visible, setVisible] = useState(false);
  const [signInState, signInAction, signingIn] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, initialState);
  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link href="/" className="auth-brand"><span className="brand-mark"><i /><i /><i /></span><strong>klecto</strong></Link>
        <div className="auth-quote"><span>COLLECT · CONNECT · REMEMBER</span><h1>Your things have<br />stories to tell.</h1><p>Build a living archive of what matters, then meet the people who understand exactly why.</p></div>
        <div className="auth-proof"><div><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=85" alt="" /><img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=85" alt="" /><img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=85" alt="" /></div><span><strong>12,400+</strong> stories already kept</span></div>
      </section>
      <section className="auth-form-wrap">
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Preview Klecto</Link>
        <div className="auth-form-card">
          <span className="auth-icon"><Sparkles size={22} /></span>
          <h2>{mode === "signin" ? "Welcome back." : "Start your shelf."}</h2>
          <p>{mode === "signin" ? "The good stuff is right where you left it." : "A home for the pieces you would never call just stuff."}</p>
          <div className="auth-toggle"><button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button></div>
          <form action={mode === "signin" ? signInAction : signUpAction}>
            {mode === "signup" && <div className="auth-pair"><label><span>Name</span><input name="displayName" autoComplete="name" placeholder="Arjun Kapoor" required /></label><label><span>Username</span><input name="username" autoComplete="username" placeholder="arjcollects" required /></label></div>}
            <label><span>Email</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <label><span>Password</span><div className="password-input"><LockKeyhole size={16} /><input name="password" type={visible ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 8 characters" minLength={8} required /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            {state.error && <div className="auth-message error">{state.error}</div>}
            {state.success && <div className="auth-message success"><Check size={15} />{state.success}</div>}
            <button className="auth-submit" disabled={pending}>{pending ? "One moment…" : mode === "signin" ? "Enter Klecto" : "Create my account"}<ArrowRight size={17} /></button>
          </form>
          <small>By continuing, you agree to Klecto’s Terms and Community Guidelines.</small>
        </div>
      </section>
    </main>
  );
}
