const fetch = require('node-fetch');
require('dotenv').config();
const { getAppUrl } = require('./app-url');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.BREVO_SENDER_EMAIL;
const FROM_NAME = process.env.BREVO_SENDER_NAME || 'RootFinder';
const APP_URL = getAppUrl();

async function sendEmail({ to, subject, html }) {
  if (!API_KEY || !FROM_EMAIL) {
    console.warn('[Brevo] Missing credentials, skipping email send.');
    return { skipped: true };
  }

  const body = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: to }],
    subject,
    htmlContent: html
  };

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo error: ${err.message || res.statusText}`);
  }

  return res.json();
}

async function sendVerificationEmail({ to, username, token }) {
  const code = `${token}`;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#020408;font-family:Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:560px;background:#06090f;border:1px solid rgba(0,255,224,0.16);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:40px 36px;">
              <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#00ffe0;font-weight:700;margin-bottom:14px;">Verificar cuenta</div>
              <h1 style="margin:0 0 14px 0;color:#eef2ff;font-size:30px;line-height:1.1;">Confirma tu acceso</h1>
              <p style="margin:0 0 28px 0;color:#8892a4;font-size:15px;line-height:1.7;">Hola <strong style="color:#eef2ff;">${username}</strong>, usa el siguiente código en la web para completar la verificación de tu cuenta.</p>

              <div style="margin:0 0 28px 0;padding:18px 16px;border-radius:16px;border:1px solid rgba(0,255,224,0.22);background:rgba(0,255,224,0.06);text-align:center;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8892a4;margin-bottom:10px;">Código de verificación</div>
                <div style="font-size:34px;line-height:1;font-weight:800;letter-spacing:10px;color:#00ffe0;font-family:Courier New,Courier,monospace;">${code}</div>
              </div>

              <p style="margin:0;color:#8892a4;font-size:12px;line-height:1.7;">El código expira en 24 horas. Si no creaste esta cuenta, puedes ignorar este correo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({ to, subject: 'Verifica tu cuenta en RootFinder', html });
}

async function sendPasswordResetEmail({ to, username, token }) {
  const link = `${APP_URL}/reset-password.html?token=${token}`;
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#020408;font-family:Segoe UI,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#06090f;border:1px solid rgba(255,77,77,0.2);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:40px;"><h1 style="color:#eef2ff;">Restablece tu contraseña</h1><p style="color:#8892a4;">Hola <strong style="color:#eef2ff;">${username || 'usuario'}</strong>, recibimos una solicitud para restablecer tu acceso.</p>
        <p><a href="${link}" style="display:inline-block;padding:15px 24px;background:linear-gradient(135deg,#ff4d4d,#a855f7);border-radius:10px;color:#fff;text-decoration:none;font-weight:700;">Restablecer contraseña</a></p>
        <p style="color:#8892a4;font-size:12px;">Enlace directo:<br/><a href="${link}" style="color:#00ffe0;word-break:break-all;">${link}</a></p></td></tr>
      </table>
    </td></tr></table></body></html>`;

  return sendEmail({ to, subject: 'Restablece tu contrasena en RootFinder', html });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
