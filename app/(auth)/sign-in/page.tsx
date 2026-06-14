"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

const signInSchema = z.object({
  email: z.string().email({ message: "Adresă de email invalidă." }),
  password: z.string().min(4, { message: "Parola trebuie să aibă cel puțin 4 caractere." }),
});

type SignInValues = z.infer<typeof signInSchema>;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: SignInValues) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Autentificare eșuată. Încearcă din nou.");
        return;
      }

      login(data.user);
      toast("Autentificare cu succes!");
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
              TECHPOINT
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
            <span className="text-xs text-slate-400">sau</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Sign-up link */}
          <p className="text-center text-sm text-slate-500">
            
            <Link
              href="/sign-up"
              className="font-semibold text-[#22624a] transition-colors hover:text-[#1a4d3a]"
            >
              Creează un cont
            </Link>
          </p>
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
