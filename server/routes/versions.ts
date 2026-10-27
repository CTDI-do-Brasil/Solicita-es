import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

function mapRowToVersion(row: any) {
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    description: row.description,
    changelog: row.changelog || [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    createdBy: row.created_by,
    status: row.status,
    approvedByReviewerId: row.approved_by_reviewer_id,
    approvedByReviewerName: row.approved_by_reviewer_name,
    approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : undefined,
    reviewerNotes: row.reviewer_notes,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
    publishedBy: row.published_by,
  };
}

// GET /api/versions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM app_versions ORDER BY created_at DESC');
    res.json(result.rows.map(mapRowToVersion));
  } catch (error: any) {
    console.error('Erro ao buscar versões:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/versions
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = data.id || `ver-${Date.now()}`;
    const now = new Date();

    const query = `
      INSERT INTO app_versions (
        id, version, title, description, changelog, created_at, created_by,
        status, approved_by_reviewer_id, approved_by_reviewer_name, approved_at,
        reviewer_notes, published_at, published_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        version = EXCLUDED.version,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        changelog = EXCLUDED.changelog,
        status = EXCLUDED.status,
        approved_by_reviewer_id = EXCLUDED.approved_by_reviewer_id,
        approved_by_reviewer_name = EXCLUDED.approved_by_reviewer_name,
        approved_at = EXCLUDED.approved_at,
        reviewer_notes = EXCLUDED.reviewer_notes,
        published_at = EXCLUDED.published_at,
        published_by = EXCLUDED.published_by
      RETURNING *;
    `;

    const values = [
      id,
      data.version,
      data.title,
      data.description,
      JSON.stringify(data.changelog || []),
      data.createdAt || now,
      data.createdBy,
      data.status || 'em_revisao',
      data.approvedByReviewerId || null,
      data.approvedByReviewerName || null,
      data.approvedAt || null,
      data.reviewerNotes || null,
      data.publishedAt || null,
      data.publishedBy || null
    ];

    const result = await pool.query(query, values);
    res.status(201).json(mapRowToVersion(result.rows[0]));
  } catch (error: any) {
    console.error('Erro ao salvar versão:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reviewers
router.get('/reviewers', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM version_reviewers ORDER BY name ASC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Erro ao buscar revisores:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
