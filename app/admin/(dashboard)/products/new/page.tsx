import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          aria-label="Înapoi la produse"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Produs nou</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Completează toate detaliile pentru a adăuga produsul în catalog.
          </p>
        </div>
      </div>

      <ProductForm />
    </div>
  );
}
