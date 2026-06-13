const express = require('express');
const { sql } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, username, email, verified, created_at
      FROM users WHERE id = ${req.user.id}
      LIMIT 1
    `;

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

    return res.status(200).json({ user });
  } catch (err) {
    console.error('[GET /me]', err.message);
    return res.status(500).json({ message: 'Error interno.' });
  }
});

router.put('/change-password', async (req, res) => {
  const bcrypt = require('bcryptjs');
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Contrasena actual y nueva son requeridas.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'La nueva contrasena debe tener al menos 8 caracteres.' });
    }

    const [user] = await sql`
      SELECT id, COALESCE(password_hash, password) AS password_hash FROM users WHERE id = ${req.user.id}
    `;

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'La contrasena actual es incorrecta.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await sql`
      UPDATE users SET password_hash = ${hashed}, updated_at = NOW()
      WHERE id = ${req.user.id}
    `;

    return res.status(200).json({ message: 'Contrasena actualizada correctamente.' });
  } catch (err) {
    console.error('[PUT /change-password]', err.message);
    return res.status(500).json({ message: 'Error interno.' });
  }
});

module.exports = router;
