"use client";

import Link from "next/link";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signIn as oauthSignIn } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/store/useAuth";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email:    z.string().email({ message: "Adresă de email invalidă." }),
  password: z.string().min(4, { message: "Parola trebuie să aibă cel puțin 4 caractere." }),
});
type SignInValues = z.infer<typeof signInSchema>;

// ─── OTP input component ─────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const chars = value.split("").concat(Array(6).fill("")).slice(0, 6);
    chars[idx] = digit;
    const next = chars.join("");
    onChange(next);
    if (digit && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const chars = value.split("").concat(Array(6).fill("")).slice(0, 6);
        chars[idx] = "";
        onChange(chars.join(""));
      } else if (idx > 0) {
        inputs.current[idx - 1]?.focus();
        const chars = value.split("").concat(Array(6).fill("")).slice(0, 6);
        chars[idx - 1] = "";
        onChange(chars.join(""));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const lastIdx = Math.min(pasted.length, 5);
    inputs.current[lastIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] ?? ""}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          disabled={disabled}
          className="w-11 h-12 rounded-lg border border-slate-200 bg-white text-center text-lg font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-[#22624a] focus:ring-2 focus:ring-[#22624a]/20 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null);
  const [otpValue, setOtpValue]             = useState("");
  const [otpSubmitting, setOtpSubmitting]   = useState(false);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  // ── Step 1: credentials ────────────────────────────────────────────────────
  const onSubmit = async (values: SignInValues) => {
    try {
      const res  = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Autentificare eșuată. Încearcă din nou.");
        return;
      }

      if (data.requiresTwoFactor) {
        setTwoFactorEmail(values.email.trim().toLowerCase());
        toast("Un cod de verificare a fost trimis pe emailul tău.");
        return;
      }

      login(data.user);
      toast("Autentificare cu succes!");
      router.push("/");
    } catch {
      toast("Ceva nu a mers. Verifică conexiunea și încearcă din nou.");
    }
  };

  // ── Step 2: OTP verification ───────────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.replace(/\D/g, "").length < 6) {
      toast("Introdu toate cele 6 cifre.");
      return;
    }
    setOtpSubmitting(true);
    try {
      const res  = await fetch("/api/auth/verify-2fa", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: twoFactorEmail, code: otpValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Cod invalid. Încearcă din nou.");
        setOtpValue("");
        return;
      }

      login(data.user);
      toast("Autentificare cu succes!");
      router.push("/");
    } catch {
      toast("Ceva nu a mers. Verifică conexiunea și încearcă din nou.");
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!twoFactorEmail) return;
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form.getValues()),
      });
      if (res.ok) {
        setOtpValue("");
        toast("Un nou cod a fost trimis pe emailul tău.");
      }
    } catch {
      toast("Nu s-a putut retrimite codul. Încearcă din nou.");
    }
  };

  // ── 2FA step ───────────────────────────────────────────────────────────────
  if (twoFactorEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#22624a]">
                BuildTech
              </span>
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#edf5f1]">
                <ShieldCheck className="size-6 text-[#22624a]" strokeWidth={2} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Verificare în doi pași</h2>
              <p className="text-sm text-slate-500">
                Am trimis un cod de 6 cifre la{" "}
                <span className="font-medium text-slate-700">{twoFactorEmail}</span>.
                Introdu codul mai jos.
              </p>
            </div>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-6">
              <OtpInput
                value={otpValue}
                onChange={setOtpValue}
                disabled={otpSubmitting}
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={otpSubmitting || otpValue.replace(/\D/g, "").length < 6}
              >
                {otpSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Se verifică...
                  </>
                ) : (
                  "Verifică codul"
                )}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500">
              <button
                type="button"
                onClick={() => { setTwoFactorEmail(null); setOtpValue(""); }}
                className="flex items-center gap-1.5 text-slate-400 transition-colors hover:text-slate-700"
              >
                <ArrowLeft className="size-3.5" strokeWidth={2} />
                Înapoi
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                className="font-medium text-[#22624a] transition-colors hover:text-[#1a4d3a]"
              >
                Retrimite codul
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1: credentials form ───────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo + headings */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#22624a]">
              BuildTech
            </span>
          </Link>
          <div>
            <p className="mt-1 text-sm text-slate-500">
              Autentifică-te pentru a continua.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresă de email</FormLabel>
                    <FormControl>
                        <Input
                          type="email"
                          placeholder="ion@exemplu.ro"
                          autoComplete="email"
                          disabled={isSubmitting}
                          {...field}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Parolă</FormLabel>
                      <Link
                        href="#"
                        className="text-xs text-slate-400 transition-colors hover:text-[#22624a]"
                      >
                        Ai uitat parola?
                      </Link>
                    </div>
                    <FormControl>
                        <Input
                          type="password"
                          placeholder="Parola ta"
                          autoComplete="current-password"
                          disabled={isSubmitting}
                          {...field}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Se procesează...
                  </>
                ) : (
                  "Autentificare"
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">sau continuă cu</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Social sign-in buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => oauthSignIn("google", { callbackUrl: "/oauth-callback" })}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a]"
            >
              <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuă cu Google
            </button>

            <button
              type="button"
              onClick={() => oauthSignIn("yahoo", { callbackUrl: "/oauth-callback" })}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a]"
            >
              <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#6001D2" d="M0 0h24v24H0z" opacity="0"/>
                <path fill="#6001D2" d="M11.146 15.88L8.3 9.17h2.31l1.7 4.34 1.7-4.34h2.28L11.7 18h-2.2l1.65-2.12zM17.5 9.17h-2.2v8.65h2.2V9.17zm-1.1-1.1a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2z"/>
              </svg>
              Continuă cu Yahoo
            </button>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-center text-sm text-slate-500">
              Nu ai cont?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-[#22624a] transition-colors hover:text-[#1a4d3a]"
              >
                Creează un cont
              </Link>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Datele tale sunt protejate conform{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-slate-600">
            Politicii de confidențialitate
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
