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
              TECHPOINT
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
            <span className="text-xs text-slate-400">sau</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Sign-in link */}
          <p className="text-center text-sm text-slate-500">
          
            <Link
              href="/sign-in"
              className="font-semibold text-[#22624a] transition-colors hover:text-[#1a4d3a]"
            >
              Autentificare
            </Link>
          </p>
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
