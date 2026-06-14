"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

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

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  email:    z.string().email({ message: "Adresă de email invalidă." }),
  password: z.string().min(1, { message: "Parola este obligatorie." }),
});

type FormValues = z.infer<typeof schema>;

// ─── Inner component (needs useSearchParams, must be inside Suspense) ────────

function AdminLoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/admin";

  const form = useForm<FormValues>({
    resolver:      zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: FormValues) => {
    try {
      const res  = await fetch("/api/admin/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.error ?? "Autentificare eșuată.");
        return;
      }

      toast("Bine ai venit, administrator!");
      router.push(from);
      router.refresh(); // re-run server components after cookie is set
    } catch {
      toast("Eroare de rețea. Încearcă din nou.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
         
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Panou de admin
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Autentificre cu contul de admin.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-5"
              noValidate
            >
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email administrator</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@techpoint.ro"
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
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                className="mt-1 w-full bg-[#22624a] hover:bg-[#1a4d3a]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Se verifică…
                  </>
                ) : (
                  "Intră în panou"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Acces restricționat — doar pentru administratori autorizați.
        </p>
      </div>
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
