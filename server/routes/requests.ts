import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

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
    items: row.items || [],
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    sector: row.sector,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    managerApprovalStatus: row.manager_approval_status,
    managerApprovedAt: row.manager_approved_at ? new Date(row.manager_approved_at).toISOString() : undefined,
    managerApprovedBy: row.manager_approved_by,
    managerNotes: row.manager_notes,
    approvals: row.approvals,
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
    quotes: row.quotes || [],
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

    const query = `
      INSERT INTO purchase_requests (
        id, code, title, description, reason, link_url, quantity, unit, priority,
        requester_id, requester_name, sector, created_at,
        manager_approval_status, manager_approved_at, manager_approved_by, manager_notes,
        purchase_status, purchase_order_number, supplier, unit_price, total_price, shipping_cost,
        payment_terms, delivery_deadline, purchase_date, expected_delivery_date, purchased_by,
        purchasing_notes, items, quotes, approvals, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23,
        $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33
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
      data.requesterId || null,
      data.requesterName || '',
      data.sector || '',
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
    res.status(201).json(mapRowToRequest(result.rows[0]));
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
        updated_at = $27
      WHERE id = $28
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
      now,
      id
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }
    res.json(mapRowToRequest(result.rows[0]));
  } catch (error: any) {
    console.error('Erro ao atualizar solicitação:', error);
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
