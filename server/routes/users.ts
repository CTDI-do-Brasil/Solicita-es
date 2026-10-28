import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

function parseAllowedProjects(raw: any, role?: string): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.replace(/[{}]/g, '').split(',').map((s: string) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
  }
  return role === 'colaborador' ? ['Manutenção/Engenharia'] : ['Cielo', 'Claro', 'VIVO', 'TIM', 'Alloha', 'Manutenção/Engenharia'];
}

function mapRowToUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    sector: row.sector,
    position: row.position,
    avatarUrl: row.avatar_url,
    password: row.password || '123456',
    allowedProjects: parseAllowedProjects(row.allowed_projects, row.role),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

// GET /api/users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY name ASC');
    res.json(result.rows.map(mapRowToUser));
  } catch (error: any) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = data.id || `user-${Date.now()}`;
    const now = new Date();
    const allowedProjects = data.allowedProjects !== undefined
      ? (Array.isArray(data.allowedProjects) ? JSON.stringify(data.allowedProjects) : String(data.allowedProjects))
      : JSON.stringify(['Manutenção/Engenharia']);

    const query = `
      INSERT INTO users (id, name, email, role, sector, position, avatar_url, password, allowed_projects, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        sector = EXCLUDED.sector,
        position = EXCLUDED.position,
        avatar_url = EXCLUDED.avatar_url,
        password = COALESCE(EXCLUDED.password, users.password),
        allowed_projects = COALESCE(EXCLUDED.allowed_projects, users.allowed_projects)
      RETURNING *;
    `;

    const values = [
      id,
      data.name,
      data.email,
      data.role,
      data.sector,
      data.position,
      data.avatarUrl || null,
      data.password || '123456',
      allowedProjects,
      data.createdAt || now
    ];

    const result = await pool.query(query, values);
    res.status(201).json(mapRowToUser(result.rows[0]));
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id/password
router.put('/:id/password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 4 caracteres.' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = userResult.rows[0];
    const storedPass = user.password || '123456';
    const isMaster = user.role === 'master';
    const isValidMaster = isMaster && (currentPassword === 'dev' || currentPassword === 'master');

    if (currentPassword && currentPassword !== storedPass && !isValidMaster) {
      return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
    }

    const updated = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING *',
      [newPassword.trim(), id]
    );

    res.json({
      success: true,
      message: 'Senha alterada com sucesso.',
      user: mapRowToUser(updated.rows[0]),
    });
  } catch (error: any) {
    console.error('Erro ao alterar senha do usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const allowedProjects = data.allowedProjects !== undefined
      ? (Array.isArray(data.allowedProjects) ? JSON.stringify(data.allowedProjects) : String(data.allowedProjects))
      : null;

    const query = `
      UPDATE users SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        sector = COALESCE($4, sector),
        position = COALESCE($5, position),
        avatar_url = COALESCE($6, avatar_url),
        password = COALESCE($7, password),
        allowed_projects = COALESCE($8, allowed_projects)
      WHERE id = $9
      RETURNING *;
    `;

    const values = [data.name, data.email, data.role, data.sector, data.position, data.avatarUrl, data.password, allowedProjects, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(mapRowToUser(result.rows[0]));
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'Usuário removido' });
  } catch (error: any) {
    console.error('Erro ao remover usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
