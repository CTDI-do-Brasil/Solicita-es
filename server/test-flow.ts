import dotenv from 'dotenv';
dotenv.config();

import {
  isSmtpConfigured,
  verifySmtpConnection,
  notifyManagerNewRequest,
  notifyPurchasingManagerApproved,
  notifyCurrentApprover,
  notifyPurchasingFullyApproved,
  notifyRequestRejected,
} from './mailer';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTestFlow() {
  console.log('================================================================');
  console.log('   NEXUS CTDI - TESTE DE DISPARO DE E-MAILS DE TODAS AS ETAPAS   ');
  console.log('================================================================\n');

  console.log('1. Verificando configuração SMTP...');
  if (!isSmtpConfigured()) {
    console.error('❌ ERRO: SMTP não configurado no arquivo .env.');
    console.error('   Por favor, preencha SMTP_HOST, SMTP_USER e SMTP_PASS no .env.');
    process.exit(1);
  }

  const verify = await verifySmtpConnection();
  if (!verify.ok) {
    console.error('❌ ERRO na conexão com servidor SMTP:', verify.message);
    process.exit(1);
  }
  console.log('✅ Conexão SMTP autenticada com sucesso!\n');

  const targetEmail = process.env.EMAIL_OVERRIDE_TO || 'seu e-mail padrão';
  console.log(`🎯 Todos os e-mails serão entregues para: ${targetEmail}`);
  console.log('----------------------------------------------------------------\n');

  const mockRequest = {
    id: 'req-teste-001',
    code: 'S99999',
    title: 'Estação de Retrabalho BGA Avançada com Visão Computacional',
    description: 'Equipamento corporativo para manutenção e reparo de placas eletrônicas multilayer.',
    reason: 'Reposição de equipamento obsoleto para linha de produção da CTDI.',
    quantity: 1,
    unit: 'un',
    priority: 'alta',
    requesterId: 'user-colaborador-01',
    requesterName: 'Roberto Albuquerque (Analista de TI/Engenharia)',
    sector: 'TI',
    supplier: 'TecnoTools Equipamentos Industriais S/A',
    unitPrice: 35000,
    totalPrice: 35000,
    paymentTerms: 'Faturado 30/60/90 Dias',
    deliveryDeadline: '15 dias úteis',
    purchasedBy: 'Alexandre Fontes (Compras)',
    purchasingNotes: 'Fornecedor com menor prazo de entrega e 2 anos de calibração inclusa.',
    items: [
      { name: 'Estação BGA OptiVision 4K', quantity: 1, unit: 'un', description: 'Visão óptica de alta precisão' },
      { name: 'Kit de Bicos e Adaptadores SMD', quantity: 5, unit: 'kit', description: 'Acessórios compatíveis' },
    ],
  };

  // PASSO 1: Colaborador solicita -> Gestor da área
  console.log('📧 [1/5] Disparando E-mail 1: Colaborador solicita -> Gestor da área (TI)...');
  await notifyManagerNewRequest(mockRequest);
  await sleep(1500);

  // PASSO 2: Gestor aprova -> Compras
  console.log('📧 [2/5] Disparando E-mail 2: Gestor aprova -> Setor de Compras...');
  await notifyPurchasingManagerApproved({
    ...mockRequest,
    managerApprovalStatus: 'aprovado',
    managerApprovedBy: 'Marcelo Santos (Gestor de TI)',
    managerNotes: 'Aprovado integralmente com prioridade alta para atendimento de linha.',
  });
  await sleep(1500);

  // PASSO 3: Compras envia para esteira de aprovadores
  console.log('📧 [3/5] Disparando E-mail 3 (Alçada 1): Compras envia -> 1º Aprovador (Fernando)...');
  await notifyCurrentApprover(mockRequest, 'Fernando');
  await sleep(1500);

  console.log('📧 [3.1] Disparando E-mail 3 (Alçada 2): Fernando aprovou -> 2º Aprovador (Eduardo)...');
  await notifyCurrentApprover(mockRequest, 'Eduardo');
  await sleep(1500);

  console.log('📧 [3.2] Disparando E-mail 3 (Alçada 3): Eduardo aprovou -> 3º Aprovador (Luiz)...');
  await notifyCurrentApprover(mockRequest, 'Luiz');
  await sleep(1500);

  // PASSO 4: Aprovadores concluem (100% aprovado) -> Compras
  console.log('📧 [4/5] Disparando E-mail 4: Luiz aprova (100% Aprovado) -> Setor de Compras...');
  await notifyPurchasingFullyApproved(mockRequest);
  await sleep(1500);

  // BONUS: Demonstração de reprovação
  console.log('📧 [5/5] Disparando E-mail 5: Demonstração de Reprovação com Justificativa...');
  await notifyRequestRejected(
    { ...mockRequest, purchaseStatus: 'reprovado_aprovadores' },
    'Eduardo Costa (2º Aprovador - Diretoria Financeira)',
    'Ajustar condição de pagamento para 4 parcelas quinzenais antes de prosseguir.'
  );

  console.log('\n================================================================');
  console.log('🎉 TESTE CONCLUÍDO! Verifique sua caixa de entrada no e-mail:');
  console.log(`   ${targetEmail}`);
  console.log('================================================================\n');
}

runTestFlow().catch((err) => {
  console.error('Erro durante o teste:', err);
});
