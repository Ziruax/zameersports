"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminLogin } from "@/hooks/use-admin";
import { ApiError } from "@/lib/api";

/** Centered sign-in card for the admin overlay. */
export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const login = useAdminLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loginErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 503) return "Database hiccup — retry";
      return err.message;
    }
    return "Something went wrong — please try again.";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    try {
      await login.mutateAsync({ email: email.trim(), password });
      onSuccess();
    } catch (err) {
      setError(loginErrorMessage(err));
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-neutral-100 p-4">
      <div className="w-full max-w-sm">
        <Card className="overflow-hidden rounded-2xl border-neutral-200 shadow-lg">
          <div
            className="h-1.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-amber-400"
            aria-hidden="true"
          />
          <CardContent className="flex flex-col items-center gap-5 px-6 py-8">
            <Image
              src="/images/brand/logo.png"
              alt="Zameer Sports"
              width={56}
              height={56}
              className="h-14 w-14 rounded-2xl object-cover"
              priority
            />
            <div className="text-center">
              <h1 className="font-display text-xl font-bold uppercase tracking-wide text-neutral-900">
                Zameer Sports Admin
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Sign in to manage your store
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-3" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-xs font-medium text-neutral-600">
                  Email
                </label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-xs font-medium text-neutral-600">
                  Password
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              {error ? (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                disabled={login.isPending}
                className="h-11 w-full bg-emerald-600 font-semibold hover:bg-emerald-700"
              >
                {login.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Lock aria-hidden="true" />
                )}
                Sign In
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
