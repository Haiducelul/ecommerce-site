"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signIn as oauthSignIn } from "next-auth/react";

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

// ─── Schema ──────────────────────────────────────────────────────────────────

const signUpSchema = z.object({
  name: z.string().min(2, { message: "Numele trebuie să aibă cel puțin 2 caractere." }),
  email: z.string().email({ message: "Adresă de email invalidă." }),
  password: z.string().min(4, { message: "Parola trebuie să aibă cel puțin 4 caractere." }),
});

type SignUpValues = z.infer<typeof signUpSchema>;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: SignUpValues) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Înregistrare eșuată. Încearcă din nou.");
        return;
      }

      login(data.user);
      toast("Cont creat cu succes!");
      router.push("/");
    } catch {
      toast("Ceva nu a mers. Verifică conexiunea și încearcă din nou.");
    }
  };

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
            <p className="text-xl font-bold tracking-tight text-slate-900">
              Creează-ți contul
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Alătură-te și descoperă tehnologia de top.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nume complet</FormLabel>
                    <FormControl>
                     
                        <Input
                          type="text"
                          placeholder="Ion Popescu"
                          autoComplete="name"
                        
                          disabled={isSubmitting}
                          {...field}
                        />
                 
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>Parolă</FormLabel>
                    <FormControl>
                      
                        <Input
                          type="password"
                          placeholder="Minim 4 caractere"
                          autoComplete="new-password"
                        
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
                  "Creează cont"
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">sau înregistrare cu</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Social sign-up buttons */}
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
              Ai deja cont?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-[#22624a] transition-colors hover:text-[#1a4d3a]"
              >
                Autentificare
              </Link>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Prin înregistrare, ești de acord cu{" "}
          <Link href="#" className="underline underline-offset-2 hover:text-slate-600">
            Termenii și condițiile
          </Link>{" "}
          noastre.
        </p>
      </div>
    </div>
  );
}
