/**
 * lib/email.ts — Server-side email utility using nodemailer.
 * Configure SMTP via environment variables. In development without
 * SMTP credentials, the code is printed to the console as a fallback.
 */
import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendTwoFactorEmail(
  to: string,
  code: string
): Promise<void> {
  const transport = createTransport();

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#22624a;margin:0 0 8px">BuildTech — Cod de verificare</h2>
      <p style="color:#475569;margin:0 0 24px">Folosește codul de mai jos pentru a finaliza autentificarea. Codul este valabil <strong>10 minute</strong>.</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:24px;text-align:center">
        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1e293b">${code}</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;margin:20px 0 0">Dacă nu ai solicitat acest cod, ignoră acest email.</p>
    </div>
  `;

  if (!transport) {
    console.log(
      `[2FA] No SMTP configured — code for ${to}: ${code}`
    );
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? `"BuildTech" <noreply@buildtech.ro>`,
    to,
    subject: `${code} — Codul tău de verificare BuildTech`,
    html,
    text: `Codul tău de verificare BuildTech este: ${code}\nValabil 10 minute.`,
  });
}
