import Link from "next/link";
import { Cpu, Mail, MapPin, Phone } from "lucide-react";

const PHONE = "+40 700 000 000";
const PHONE_HREF = "tel:+40700000000";
const EMAIL = "contact@buildtech.ro";
const EMAIL_HREF = "mailto:contact@buildtech.ro";

const QUICK_LINKS = [
  { label: "Despre noi", href: "#" },
  { label: "Contact", href: EMAIL_HREF },
  { label: "Termeni și condiții", href: "#" },
  { label: "Politică de confidențialitate", href: "#" },
] as const;

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: "Facebook", href: "#", icon: FacebookIcon },
  { label: "Instagram", href: "#", icon: InstagramIcon },
  { label: "LinkedIn", href: "#", icon: LinkedinIcon },
] as const;
export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-50 text-gray-700">
      {/* Top contact bar */}
      <div className="border-t border-gray-200">
        <div className="mx-auto flex w-[90%] max-w-[1400px] flex-col items-start justify-center gap-4 px-4 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:justify-center lg:gap-12">
          <div className="flex items-center gap-2.5 text-sm text-gray-700">
            <MapPin className="size-4 shrink-0 text-gray-500" strokeWidth={1.75} aria-hidden />
            <span>Vizitează-ne — București, România</span>
          </div>
          <a
            href={PHONE_HREF}
            className="flex items-center gap-2.5 text-sm text-gray-700 transition-colors hover:text-gray-900"
          >
            <Phone className="size-4 shrink-0 text-gray-500" strokeWidth={1.75} aria-hidden />
            {PHONE}
          </a>
          <a
            href={EMAIL_HREF}
            className="flex items-center gap-2.5 text-sm text-gray-700 transition-colors hover:text-gray-900"
          >
            <Mail className="size-4 shrink-0 text-gray-500" strokeWidth={1.75} aria-hidden />
            {EMAIL}
          </a>
        </div>
      </div>

      {/* Main body */}
      <div className="mx-auto w-[90%] max-w-[1400px] px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          {/* Col 1 — Logo & About */}
          <div className="max-w-sm">
            <div className="mb-4 flex items-center gap-2">
              <Cpu className="size-5 shrink-0 text-[#22624a]" strokeWidth={1.75} aria-hidden />
              <span className="text-lg font-bold tracking-tight text-gray-900">
                <span>Build</span>
                <span className="text-[#22624a]">Tech</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Magazinul tău de încredere pentru laptopuri, telefoane și accesorii IT. Produse verificate,
              livrare rapidă și suport dedicat.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[#22624a] hover:text-[#22624a]"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2 — Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-900">
              Informatii utile
            </h3>
            <ul className="flex flex-col gap-2.5">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 transition-colors hover:text-[#22624a]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Newsletter */}
          <div className="md:col-span-2 lg:col-span-1">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-900">
              Newsletter
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Abonează-te pentru oferte exclusive și noutăți din lumea tech.
            </p>
            <form className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Adresa ta de email
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                name="email"
                placeholder="Adresa ta de email"
                className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a]"
              />
              <button
                type="submit"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#22624a] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
              >
                Abonează-te
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-200 py-6">
        <p className="text-center text-xs text-gray-500 sm:text-sm">
          © {new Date().getFullYear()} BuildTech. Toate drepturile rezervate.
        </p>
      </div>
    </footer>
  );
}
