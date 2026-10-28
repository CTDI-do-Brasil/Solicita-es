import { Router, Request, Response } from 'express';
import { pool } from '../db';
import {
  notifyManagerNewRequest,
  notifyPurchasingManagerApproved,
  notifyCurrentApprover,
  notifyPurchasingFullyApproved,
  notifyRequestRejected,
} from '../mailer';

const router = Router();

function parseJsonSafe(val: any, fallback: any = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

// Mapeador de linha do banco para formato TypeScript frontend
function mapRowToRequest(row: any) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    reason: row.reason,
    linkUrl: row.link_url,
    quantity: Number(row.quantity),
    unit: row.unit,
    priority: row.priority,
    items: parseJsonSafe(row.items, []),
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    sector: row.sector,
    project: row.project,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    managerApprovalStatus: row.manager_approval_status,
    managerApprovedAt: row.manager_approved_at ? new Date(row.manager_approved_at).toISOString() : undefined,
    managerApprovedBy: row.manager_approved_by,
    managerNotes: row.manager_notes,
    approvals: parseJsonSafe(row.approvals, undefined),
    purchaseStatus: row.purchase_status,
    purchaseOrderNumber: row.purchase_order_number,
    supplier: row.supplier,
    unitPrice: row.unit_price ? Number(row.unit_price) : undefined,
    totalPrice: row.total_price ? Number(row.total_price) : undefined,
    shippingCost: row.shipping_cost ? Number(row.shipping_cost) : undefined,
    paymentTerms: row.payment_terms,
    deliveryDeadline: row.delivery_deadline,
    purchaseDate: row.purchase_date,
    expectedDeliveryDate: row.expected_delivery_date,
    purchasedBy: row.purchased_by,
    purchasingNotes: row.purchasing_notes,
    quotes: parseJsonSafe(row.quotes, []),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

// GET /api/requests
router.get('/', async (req: Request, res: Response) => {
  try {
    const { sector, requesterId, status } = req.query;
    let query = 'SELECT * FROM purchase_requests WHERE 1=1';
    const params: any[] = [];

    if (sector) {
      params.push(sector);
      query += ` AND sector = $${params.length}`;
    }
    if (requesterId) {
      params.push(requesterId);
      query += ` AND requester_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND purchase_status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    const requests = result.rows.map(mapRowToRequest);
    res.json(requests);
  } catch (error: any) {
    console.error('Erro ao buscar solicitações:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/requests/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM purchase_requests WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    res.json(mapRowToRequest(result.rows[0]));
  } catch (error: any) {
    console.error('Erro ao buscar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/requests
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = data.id || `req-${Date.now()}`;
    
    // Gerar código sequencial se não enviado
    let code = data.code;
    if (!code) {
      const countRes = await pool.query('SELECT COUNT(*) as count FROM purchase_requests');
      const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
      code = `S${String(nextNum).padStart(5, '0')}`;
    }

    // Garantir que requester_id não quebre restrição de chave estrangeira caso o usuário ainda não exista no banco
    let safeRequesterId: string | null = null;
    if (data.requesterId) {
      try {
        const uCheck = await pool.query('SELECT id FROM users WHERE id = $1', [data.requesterId]);
        if (uCheck.rows.length > 0) {
          safeRequesterId = data.requesterId;
        } else if (data.requesterName) {
          // Cria o usuário automaticamente no PostgreSQL para manter integridade
          await pool.query(
            `INSERT INTO users (id, name, email, role, sector, position)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [
              data.requesterId,
              data.requesterName,
              data.requesterEmail || `${data.requesterId}@ctdibrasil.com.br`,
              data.role || 'colaborador',
              data.sector || 'TI',
              data.position || 'Colaborador Solicitante'
            ]
          );
          safeRequesterId = data.requesterId;
        }
      } catch {
        safeRequesterId = null;
      }
    }

    const query = `
      INSERT INTO purchase_requests (
        id, code, title, description, reason, link_url, quantity, unit, priority,
        requester_id, requester_name, sector, project, created_at,
        manager_approval_status, manager_approved_at, manager_approved_by, manager_notes,
        purchase_status, purchase_order_number, supplier, unit_price, total_price, shipping_cost,
        payment_terms, delivery_deadline, purchase_date, expected_delivery_date, purchased_by,
        purchasing_notes, items, quotes, approvals, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34
      ) RETURNING *;
    `;

    const now = new Date();
    const values = [
      id,
      code,
      data.title || '',
      data.description || '',
      data.reason || '',
      data.linkUrl || '',
      data.quantity || 1,
      data.unit || 'un',
      data.priority || 'media',
      safeRequesterId,
      data.requesterName || '',
      data.sector || '',
      data.project || null,
      data.createdAt || now,
      data.managerApprovalStatus || 'pendente',
      data.managerApprovedAt || null,
      data.managerApprovedBy || null,
      data.managerNotes || null,
      data.purchaseStatus || 'aguardando_aprovacao_gestor',
      data.purchaseOrderNumber || null,
      data.supplier || null,
      data.unitPrice || null,
      data.totalPrice || null,
      data.shippingCost || null,
      data.paymentTerms || null,
      data.deliveryDeadline || null,
      data.purchaseDate || null,
      data.expectedDeliveryDate || null,
      data.purchasedBy || null,
      data.purchasingNotes || null,
      JSON.stringify(data.items || []),
      JSON.stringify(data.quotes || []),
      data.approvals ? JSON.stringify(data.approvals) : null,
      now
    ];

    const result = await pool.query(query, values);
    const createdReq = mapRowToRequest(result.rows[0]);

    // GATILHO 1: Colaborador solicita -> Gestor do setor recebe email de aviso
    if (createdReq.managerApprovalStatus === 'pendente') {
      notifyManagerNewRequest(createdReq).catch((err) => {
        console.error('[Nexus Mailer] Erro ao disparar e-mail de nova solicitação:', err.message);
      });
    }

    res.status(201).json(createdReq);
  } catch (error: any) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/requests/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const now = new Date();

    // 1. Obter estado atual antes da atualização para detectar transição de status
    const oldResult = await pool.query('SELECT * FROM purchase_requests WHERE id = $1', [id]);
    const oldRow = oldResult.rows[0];

    const query = `
      UPDATE purchase_requests SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        reason = COALESCE($3, reason),
        link_url = COALESCE($4, link_url),
        quantity = COALESCE($5, quantity),
        unit = COALESCE($6, unit),
        priority = COALESCE($7, priority),
        manager_approval_status = COALESCE($8, manager_approval_status),
        manager_approved_at = COALESCE($9, manager_approved_at),
        manager_approved_by = COALESCE($10, manager_approved_by),
        manager_notes = COALESCE($11, manager_notes),
        purchase_status = COALESCE($12, purchase_status),
        purchase_order_number = COALESCE($13, purchase_order_number),
        supplier = COALESCE($14, supplier),
        unit_price = COALESCE($15, unit_price),
        total_price = COALESCE($16, total_price),
        shipping_cost = COALESCE($17, shipping_cost),
        payment_terms = COALESCE($18, payment_terms),
        delivery_deadline = COALESCE($19, delivery_deadline),
        purchase_date = COALESCE($20, purchase_date),
        expected_delivery_date = COALESCE($21, expected_delivery_date),
        purchased_by = COALESCE($22, purchased_by),
        purchasing_notes = COALESCE($23, purchasing_notes),
        items = COALESCE($24, items),
        quotes = COALESCE($25, quotes),
        approvals = COALESCE($26, approvals),
        project = COALESCE($27, project),
        updated_at = $28
      WHERE id = $29
      RETURNING *;
    `;

    const values = [
      data.title,
      data.description,
      data.reason,
      data.linkUrl,
      data.quantity,
      data.unit,
      data.priority,
      data.managerApprovalStatus,
      data.managerApprovedAt,
      data.managerApprovedBy,
      data.managerNotes,
      data.purchaseStatus,
      data.purchaseOrderNumber,
      data.supplier,
      data.unitPrice,
      data.totalPrice,
      data.shippingCost,
      data.paymentTerms,
      data.deliveryDeadline,
      data.purchaseDate,
      data.expectedDeliveryDate,
      data.purchasedBy,
      data.purchasingNotes,
      data.items ? JSON.stringify(data.items) : null,
      data.quotes ? JSON.stringify(data.quotes) : null,
      data.approvals ? JSON.stringify(data.approvals) : null,
      data.project,
      now,
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    const updatedReq = mapRowToRequest(result.rows[0]);

    // 2. DISPAROS AUTOMÁTICOS BASEADOS NA TRANSIÇÃO DE ESTADO
    if (oldRow) {
      const oldReq = mapRowToRequest(oldRow);

      // GATILHO 2: Gestor aprova -> Compras recebe um email de aviso
      const justApprovedByManager = 
        oldReq.managerApprovalStatus !== 'aprovado' && updatedReq.managerApprovalStatus === 'aprovado';
      if (justApprovedByManager) {
        notifyPurchasingManagerApproved(updatedReq).catch((err) => {
          console.error('[Nexus Mailer] Erro ao disparar e-mail de aprovação do gestor:', err.message);
        });
      }

      // Notificação caso o gestor reprove
      const justRejectedByManager =
        oldReq.managerApprovalStatus !== 'reprovado' && updatedReq.managerApprovalStatus === 'reprovado';
      if (justRejectedByManager) {
        notifyRequestRejected(
          updatedReq,
          updatedReq.managerApprovedBy || 'Gestor do Setor',
          updatedReq.managerNotes || 'Sem justificativa informada.'
        ).catch(() => {});
      }

      // GATILHO 3: Compras envia a solicitação para os Aprovadores -> Aprovador da vez recebe email
      // Submissão inicial para esteira executiva (1º Aprovador: Fernando)
      const justSentToApprovers = 
        oldReq.purchaseStatus !== 'em_aprovacao' && updatedReq.purchaseStatus === 'em_aprovacao';
      if (justSentToApprovers) {
        const firstApprover = updatedReq.approvals?.currentApprover || 'Fernando';
        notifyCurrentApprover(updatedReq, firstApprover).catch((err) => {
          console.error('[Nexus Mailer] Erro ao disparar e-mail para 1º aprovador:', err.message);
        });
      }

      // GATILHO 3 (Avanço sequencial dos aprovadores - Opção A):
      // Quando um aprovador aprova e a vez passa para o próximo (Eduardo ou Luiz)
      const oldCurrentApprover = oldReq.approvals?.currentApprover;
      const newCurrentApprover = updatedReq.approvals?.currentApprover;

      if (oldCurrentApprover && newCurrentApprover && oldCurrentApprover !== newCurrentApprover) {
        if (newCurrentApprover === 'Eduardo') {
          notifyCurrentApprover(updatedReq, 'Eduardo').catch((err) => {
            console.error('[Nexus Mailer] Erro ao disparar e-mail para Eduardo (2º Aprovador):', err.message);
          });
        } else if (newCurrentApprover === 'Luiz') {
          notifyCurrentApprover(updatedReq, 'Luiz').catch((err) => {
            console.error('[Nexus Mailer] Erro ao disparar e-mail para Luiz (3º Aprovador):', err.message);
          });
        }
      }

      // GATILHO 4: Aprovadores aprovam (100% concluído) -> Compras recebe um email de aviso
      const justFullyApproved = 
        (oldCurrentApprover !== 'concluido' && newCurrentApprover === 'concluido') ||
        (oldReq.purchaseStatus !== 'pedido_emitido' && updatedReq.purchaseStatus === 'pedido_emitido');

      if (justFullyApproved) {
        notifyPurchasingFullyApproved(updatedReq).catch((err) => {
          console.error('[Nexus Mailer] Erro ao disparar e-mail de aprovação final para Compras:', err.message);
        });
      }

      // Reprovação na esteira de aprovadores executivos
      const justRejectedByApprover =
        (oldCurrentApprover !== 'reprovado' && newCurrentApprover === 'reprovado') ||
        (oldReq.purchaseStatus !== 'reprovado_aprovadores' && updatedReq.purchaseStatus === 'reprovado_aprovadores');

      if (justRejectedByApprover) {
        const lastAction = updatedReq.approvals?.history?.[updatedReq.approvals.history.length - 1];
        const rejectedBy = lastAction?.by || 'Aprovador da Diretoria';
        const reason = lastAction?.notes || 'Reprovado durante a esteira de aprovação executiva.';
        notifyRequestRejected(updatedReq, rejectedBy, reason).catch(() => {});
      }
    }

    res.json(updatedReq);
  } catch (error: any) {
    console.error('Erro ao atualizar solicitação:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/requests/all ou DELETE /api/requests (Limpar todas as solicitações)
router.delete('/all', async (_req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM system_logs');
    await pool.query('DELETE FROM purchase_requests');
    res.json({ success: true, message: 'Todas as solicitações foram excluídas com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir todas as solicitações:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', async (_req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM system_logs');
    await pool.query('DELETE FROM purchase_requests');
    res.json({ success: true, message: 'Todas as solicitações foram excluídas com sucesso' });
  } catch (error: any) {
    console.error('Erro ao excluir todas as solicitações:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/requests/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM purchase_requests WHERE id = $1', [id]);
    res.json({ success: true, message: 'Solicitação excluída' });
  } catch (error: any) {
    console.error('Erro ao excluir solicitação:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
