const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { randomInt } = require('crypto');
const { sql } = require('../db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/brevo');
require('dotenv').config();

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const isProd = process.env.NODE_ENV === 'production';

function sendServerError(res, scope, err) {
  console.error(`[${scope}]`, err);
  return res.status(500).json({
    message: 'Error interno del servidor.',
    ...(isProd ? {} : { debug: err.message })
  });
}

function generateVerificationCode() {
  return String(randomInt(100000, 1000000));
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ message: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Correo electronico invalido.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'La contrasena debe tener al menos 8 caracteres.' });
    }

    const existing = await sql`
      SELECT id FROM users
      WHERE email = ${email.toLowerCase()} OR username = ${username.trim()}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return res.status(409).json({ message: 'El correo o nombre de usuario ya esta registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [newUser] = await sql`
      INSERT INTO users (username, email, password_hash)
      VALUES (${username.trim()}, ${email.toLowerCase()}, ${hashedPassword})
      RETURNING id, username, email
    `;

    const verificationToken = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO email_verifications (user_id, token, expires_at)
      VALUES (${newUser.id}, ${verificationToken}, ${expiresAt})
    `;

    let mailWarning = null;
    try {
      await sendVerificationEmail({
        to: newUser.email,
        username: newUser.username,
        token: verificationToken
      });
    } catch (mailErr) {
      mailWarning = 'La cuenta se creó, pero no se pudo enviar el correo de verificación.';
      console.error('[POST /register] verification email error:', mailErr.message);
    }

    return res.status(201).json({
      message: mailWarning || 'Cuenta creada. Revisa tu correo para verificarla.',
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
      emailSent: !mailWarning,
      verificationCode: process.env.NODE_ENV === 'development' ? verificationToken : undefined
    });
  } catch (err) {
    return sendServerError(res, 'POST /register', err);
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    const verificationCode = String(code || '').trim();

    if (!email || !verificationCode) {
      return res.status(400).json({ message: 'Correo y codigo de verificacion requeridos.' });
    }

    const [record] = await sql`
      SELECT ev.id, ev.user_id, ev.expires_at, ev.used, u.email, u.username
      FROM email_verifications ev
      JOIN users u ON u.id = ev.user_id
      WHERE ev.token = ${verificationCode}
        AND u.email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (!record) {
      return res.status(400).json({ message: 'Codigo invalido o inexistente.' });
    }
    if (record.used) {
      return res.status(400).json({ message: 'Este codigo ya fue utilizado.' });
    }
    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ message: 'El codigo de verificacion expiro. Solicita uno nuevo.' });
    }

    await sql`UPDATE email_verifications SET used = TRUE WHERE id = ${record.id}`;
    await sql`UPDATE users SET verified = TRUE, updated_at = NOW() WHERE id = ${record.user_id}`;

    return res.status(200).json({
      message: 'Cuenta verificada correctamente.',
      verified: true
    });
  } catch (err) {
    return sendServerError(res, 'POST /verify-email', err);
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Correo requerido.' });
    }

    const [user] = await sql`
      SELECT id, username, email, verified FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (!user || user.verified) {
      return res.status(200).json({ message: 'Si el correo existe y no esta verificado, recibiras un codigo.' });
    }

    await sql`
      UPDATE email_verifications SET used = TRUE
      WHERE user_id = ${user.id} AND used = FALSE
    `;

    const newToken = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO email_verifications (user_id, token, expires_at)
      VALUES (${user.id}, ${newToken}, ${expiresAt})
    `;

    let mailWarning = null;
    try {
      await sendVerificationEmail({ to: user.email, username: user.username, token: newToken });
    } catch (mailErr) {
      mailWarning = 'Se genero un nuevo codigo, pero no se pudo enviar el correo.';
      console.error('[POST /resend-verification] email error:', mailErr.message);
    }

    return res.status(200).json({
      message: mailWarning || 'Correo de verificacion reenviado.',
      emailSent: !mailWarning,
      verificationCode: process.env.NODE_ENV === 'development' ? newToken : undefined
    });
  } catch (err) {
    return sendServerError(res, 'POST /resend-verification', err);
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contrasena son requeridos.' });
    }

    const [user] = await sql`
      SELECT id, username, email, COALESCE(password_hash, password) AS password_hash, verified FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        message: 'Esta cuenta no tiene contraseña registrada. Usa recuperacion o crea una nueva cuenta.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    if (!user.verified) {
      return res.status(403).json({
        message: 'Cuenta no verificada. Revisa tu correo o solicita un nuevo enlace.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = `${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '')}`;
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${refreshToken}, ${refreshExpiry})
    `;

    return res.status(200).json({
      message: 'Sesion iniciada correctamente.',
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    return sendServerError(res, 'POST /login', err);
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const genericResponse = () => res.status(200).json({
      message: 'Si ese correo esta registrado, recibiras instrucciones para restablecer tu contrasena.'
    });

    if (!email) return genericResponse();

    const [user] = await sql`
      SELECT id, username, email FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (!user) return genericResponse();

    await sql`
      UPDATE password_resets SET used = TRUE
      WHERE user_id = ${user.id} AND used = FALSE
    `;

    const resetToken = `${uuidv4().replace(/-/g, '')}${uuidv4().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await sql`
      INSERT INTO password_resets (user_id, token, expires_at)
      VALUES (${user.id}, ${resetToken}, ${expiresAt})
    `;

    try {
      await sendPasswordResetEmail({ to: user.email, username: user.username, token: resetToken });
    } catch (mailErr) {
      console.error('[POST /forgot-password] email error:', mailErr.message);
    }

    return genericResponse();
  } catch (err) {
    return sendServerError(res, 'POST /forgot-password', err);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token y nueva contrasena son requeridos.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La contrasena debe tener al menos 8 caracteres.' });
    }

    const [record] = await sql`
      SELECT pr.id, pr.user_id, pr.expires_at, pr.used
      FROM password_resets pr
      WHERE pr.token = ${token}
      LIMIT 1
    `;

    if (!record) return res.status(400).json({ message: 'Token invalido.' });
    if (record.used) return res.status(400).json({ message: 'Este enlace ya fue utilizado.' });
    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ message: 'El enlace de recuperacion expiro.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await sql`UPDATE password_resets SET used = TRUE WHERE id = ${record.id}`;
    await sql`
      UPDATE users SET password_hash = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${record.user_id}
    `;

    await sql`DELETE FROM refresh_tokens WHERE user_id = ${record.user_id}`;

    return res.status(200).json({ message: 'Contrasena actualizada correctamente. Ya puedes iniciar sesion.' });
  } catch (err) {
    return sendServerError(res, 'POST /reset-password', err);
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await sql`DELETE FROM refresh_tokens WHERE token = ${refreshToken}`;
    }
    return res.status(200).json({ message: 'Sesion cerrada.' });
  } catch (err) {
    return sendServerError(res, 'POST /logout', err);
  }
});

module.exports = router;
