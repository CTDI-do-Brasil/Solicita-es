import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadToMinio, getFromMinio, deleteFromMinio } from '../minio';
import { pool } from '../db';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // Até 50MB por arquivo
});

// POST /api/requests/:id/invoices - Upload de múltiplos arquivos de NF
router.post('/requests/:id/invoices', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const uploadedBy = req.body.uploadedBy || 'Compras';

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const uploadedAttachments: any[] = [];

    for (const file of files) {
      const result = await uploadToMinio(file.buffer, file.originalname, file.mimetype, id);
      uploadedAttachments.push({
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: file.originalname,
        url: result.url,
        key: result.key,
        size: result.size,
        contentType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
      });
    }

    // Atualiza o banco de dados se conectado
    try {
      const currentRes = await pool.query('SELECT invoices FROM purchase_requests WHERE id = $1', [id]);
      if (currentRes.rows.length > 0) {
        let existing = currentRes.rows[0].invoices;
        if (typeof existing === 'string') {
          try { existing = JSON.parse(existing); } catch { existing = []; }
        }
        if (!Array.isArray(existing)) existing = [];
        const combined = [...existing, ...uploadedAttachments];
        await pool.query('UPDATE purchase_requests SET invoices = $1, updated_at = NOW() WHERE id = $2', [
          JSON.stringify(combined),
          id,
        ]);
      }
    } catch (dbErr: any) {
      console.warn('[DB] Aviso ao persistir anexo de NF no PostgreSQL:', dbErr.message);
    }

    res.json({
      success: true,
      invoices: uploadedAttachments,
    });
  } catch (error: any) {
    console.error('Erro no upload de nota fiscal:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar upload da nota fiscal' });
  }
});

// GET /api/invoices/file - Download / visualização de arquivo de NF
router.get('/invoices/file', async (req: Request, res: Response) => {
  try {
    const { key, name } = req.query as { key: string; name?: string };
    if (!key) {
      return res.status(400).send('Chave do arquivo não informada.');
    }

    const { stream, buffer, contentType } = await getFromMinio(key);
    const filename = name || 'nota_fiscal';

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    if (buffer) {
      return res.send(buffer);
    }

    if (stream) {
      return stream.pipe(res);
    }

    res.status(404).send('Arquivo não encontrado.');
  } catch (err: any) {
    console.error('Erro ao baixar arquivo da NF:', err);
    res.status(404).send('Arquivo não encontrado no armazenamento.');
  }
});

// DELETE /api/requests/:id/invoices/:invoiceId
router.delete('/requests/:id/invoices/:invoiceId', async (req: Request, res: Response) => {
  try {
    const { id, invoiceId } = req.params;
    const { key } = req.body;

    if (key) {
      await deleteFromMinio(key);
    }

    try {
      const currentRes = await pool.query('SELECT invoices FROM purchase_requests WHERE id = $1', [id]);
      if (currentRes.rows.length > 0) {
        let existing = currentRes.rows[0].invoices;
        if (typeof existing === 'string') {
          try { existing = JSON.parse(existing); } catch { existing = []; }
        }
        if (Array.isArray(existing)) {
          const filtered = existing.filter((inv: any) => inv.id !== invoiceId);
          await pool.query('UPDATE purchase_requests SET invoices = $1, updated_at = NOW() WHERE id = $2', [
            JSON.stringify(filtered),
            id,
          ]);
        }
      }
    } catch (dbErr: any) {
      console.warn('[DB] Aviso ao remover anexo de NF no PostgreSQL:', dbErr.message);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
