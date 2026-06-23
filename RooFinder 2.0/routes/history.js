const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const { sql } = require('../db');

const router = express.Router();
router.use(authMiddleware);

const ALLOWED_SECTIONS = new Set([
  'panel',
  'clasicos',
  'avanzados',
  'interpolacion',
  'diferenciacion',
  'integracion',
  'edo',
  'teoremas',
]);

const ALLOWED_STATUS = new Set(['info', 'success', 'error']);
const DEFAULT_LIMIT = 200;

function normalizeSection(section) {
  return ALLOWED_SECTIONS.has(section) ? section : 'panel';
}

function normalizeStatus(status) {
  return ALLOWED_STATUS.has(status) ? status : 'info';
}

function normalizeRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    section: row.section,
    methodId: row.method_id,
    title: row.title,
    summary: row.summary || '',
    result: row.result || '',
    note: row.note || '',
    status: row.status || 'info',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), 500);
    const rows = await sql`
      SELECT id, user_id, section, method_id, title, summary, result, note, status, created_at, updated_at
      FROM history_entries
      WHERE user_id = ${req.user.id}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ${limit}
    `;
    return res.status(200).json({
      items: rows.map(normalizeRow),
      total: rows.length,
    });
  } catch (err) {
    console.error('[GET /history]', err.message);
    return res.status(500).json({ message: 'Error interno.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'El titulo es requerido.' });
    }

    const section = normalizeSection(String(payload.section || 'panel').trim());
    const methodId = payload.methodId ? String(payload.methodId).trim() : null;
    const summary = String(payload.summary || '').trim();
    const result = String(payload.result || '').trim();
    const note = String(payload.note || '').trim();
    const status = normalizeStatus(String(payload.status || 'info').trim());
    const id = payload.id && /^[0-9a-fA-F-]{36}$/.test(String(payload.id)) ? String(payload.id) : uuidv4();

    const [row] = await sql`
      INSERT INTO history_entries (id, user_id, section, method_id, title, summary, result, note, status, created_at, updated_at)
      VALUES (${id}, ${req.user.id}, ${section}, ${methodId}, ${title}, ${summary}, ${result}, ${note}, ${status}, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        section = EXCLUDED.section,
        method_id = EXCLUDED.method_id,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        result = EXCLUDED.result,
        note = EXCLUDED.note,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id, user_id, section, method_id, title, summary, result, note, status, created_at, updated_at
    `;

    return res.status(201).json({ item: normalizeRow(row) });
  } catch (err) {
    console.error('[POST /history]', err.message);
    return res.status(500).json({ message: 'Error interno.' });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(200).json({ synced: 0, items: [] });
    }

    const synced = [];
    for (const raw of items.slice(0, 250)) {
      const title = String(raw?.title || '').trim();
      if (!title) continue;
      const id = raw.id && /^[0-9a-fA-F-]{36}$/.test(String(raw.id)) ? String(raw.id) : uuidv4();
      const section = normalizeSection(String(raw.section || 'panel').trim());
      const methodId = raw.methodId ? String(raw.methodId).trim() : null;
      const summary = String(raw.summary || '').trim();
      const result = String(raw.result || '').trim();
      const note = String(raw.note || '').trim();
      const status = normalizeStatus(String(raw.status || 'info').trim());

      const [row] = await sql`
        INSERT INTO history_entries (id, user_id, section, method_id, title, summary, result, note, status, created_at, updated_at)
        VALUES (${id}, ${req.user.id}, ${section}, ${methodId}, ${title}, ${summary}, ${result}, ${note}, ${status}, ${raw.createdAt ? new Date(raw.createdAt) : new Date()}, ${raw.updatedAt ? new Date(raw.updatedAt) : new Date()})
        ON CONFLICT (id) DO UPDATE SET
          section = EXCLUDED.section,
          method_id = EXCLUDED.method_id,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          result = EXCLUDED.result,
          note = EXCLUDED.note,
          status = EXCLUDED.status,
          updated_at = GREATEST(history_entries.updated_at, EXCLUDED.updated_at)
        RETURNING id, user_id, section, method_id, title, summary, result, note, status, created_at, updated_at
      `;
      synced.push(normalizeRow(row));
    }

    return res.status(200).json({ synced: synced.length, items: synced });
  } catch (err) {
    console.error('[POST /history/sync]', err.message);
    return res.status(500).json({ message: 'Error interno.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    if (!title) {
      return res.status(400).json({ message: 'El titulo es requerido.' });
    }

    const section = normalizeSection(String(payload.section || 'panel').trim());
    const methodId = payload.methodId ? String(payload.methodId).trim() : null;
    const summary = String(payload.summary || '').trim();
    const result = String(payload.result || '').trim();
    const note = String(payload.note || '').trim();
    const status = normalizeStatus(String(payload.status || 'info').trim());

    const [row] = await sql`
      UPDATE history_entries
      SET section = ${section},
          method_id = ${methodId},
          title = ${title},
          summary = ${summary},
          result = ${result},
          note = ${note},
          status = ${status},
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${req.user.id}
      RETURNING id, user_id, section, method_id, title, summary, result, note, status, created_at, updated_at
    `;

    if (!row) {
      return res.status(404).json({ message: 'Registro no encontrado.' });
    }

    return res.status(200).json({ item: normalizeRow(row) });
  } catch (err) {
    console.error('[PUT /history/:id]', err.message);
    return res.status(500).json({ message: 'Error interno.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const deleted = await sql`
      DELETE FROM history_entries
      WHERE id = ${id} AND user_id = ${req.user.id}
      RETURNING id
    `;

    if (!deleted.length) {
      return res.status(404).json({ message: 'Registro no encontrado.' });
    }

    return res.status(200).json({ message: 'Registro eliminado.' });
  } catch (err) {
    console.error('[DELETE /history/:id]', err.message);
    return res.status(500).json({ message: 'Error interno.' });
  }
});

module.exports = router;
