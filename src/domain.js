export const STORAGE_KEY = 'sales-sense-fichas-demo-v1';
export const STATUS = { R: 'Rascunho', C: 'Correção', E: 'Em análise', F: 'Finalizado', A: 'Aprovado', N: 'Não aprovado' };
export const ACTIONS = { CRIACAO: 'Passagem iniciada', SALVAMENTO: 'Rascunho salvo', ENVIO: 'Etapa enviada', APROVACAO: 'Etapa aprovada', REPROVACAO: 'Etapa não aprovada', DEVOLUCAO: 'Correção solicitada', FINALIZACAO: 'Etapa concluída', RETOMADA: 'Análise retomada' };
export const PROFILES = [
  { id: 'admin', name: 'Marina Costa', role: 'Varejista — administrador', level: 'Administração', initials: 'MC' },
  { id: 'compras', name: 'Lucas Santos', role: 'Varejista — Compras', level: 'Compras', initials: 'LS' },
  { id: 'fiscal', name: 'Ana Oliveira', role: 'Varejista — Fiscal', level: 'Fiscal', initials: 'AO' },
  { id: 'fiscal2', name: 'Bruno Lima', role: 'Varejista — Fiscal (outro usuário)', level: 'Fiscal', initials: 'BL' },
  { id: 'consulta', name: 'Carla Souza', role: 'Varejista — consulta', level: 'Consulta', initials: 'CS' },
  { id: 'representante', name: 'Rafael Martins', role: 'Fornecedor — representante', supplier: 'Fornecedor Exemplo Ltda.', email: 'rafael@example.com', initials: 'RM' },
  { id: 'pendente', name: 'Paula Almeida', role: 'Fornecedor — cadastro pendente', supplier: 'Fornecedor Exemplo Ltda.', email: 'paula@example.com', initials: 'PA' },
];
export const LEVELS = ['Administração', 'Compras', 'Fiscal', 'Consulta'];
export const TYPES = { text: 'Texto', textarea: 'Texto longo', number: 'Número', select: 'Seleção', boolean: 'Sim / Não', date: 'Data', file: 'Arquivo', table: 'Tabela' };
export const isSupplier = p => !!p.supplier;
export const current = r => r?.passages.find(p => p.id === r.currentId);
export const definition = (t, p) => t?.stages.find(s => s.id === p?.stageId);
export const timeLabel = d => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
const clone = obj => structuredClone(obj);
const now = () => new Date().toISOString();
const assert = (v, m) => { if (!v) throw new Error(m); };
const field = (key, label, type = 'text', required = false, extra = {}) => ({ key, label, type, required, help: '', ...extra });
const permissions = level => Object.fromEntries(LEVELS.map(l => [l, { view: true, edit: l === 'Administração' || l === level, approve: l === 'Administração' || l === level }]));

export function defaultStages() {
  return [
    { id: 'basicos', title: 'Dados básicos', sector: 'Fornecedor', supplier: true, approval: false, returns: [], permissions: permissions('Compras'), fields: [
      field('descricao', 'Descrição do produto', 'text', true, { help: 'Informe o nome comercial e o conteúdo da embalagem.', max: 120, wide: true }),
      field('gtin', 'GTIN / EAN', 'text', true, { help: 'Código de barras com 8, 12, 13 ou 14 dígitos.', mask: 'digits' }),
      field('marca', 'Marca', 'text', true), field('unidade', 'Unidade de venda', 'select', true, { options: ['UN', 'KG', 'LT', 'CX'] }),
      field('categoria', 'Categoria do produto', 'select', true, { options: ['Mercearia', 'Bebidas', 'Higiene', 'Limpeza'] }),
      field('organico', 'Produto orgânico', 'boolean'), field('certificacao', 'Certificação orgânica', 'text', true, { condition: 'organico', help: 'Obrigatório somente para produtos orgânicos.' }),
    ] },
    { id: 'compras', title: 'Compras', sector: 'Compras', supplier: false, approval: true, returns: ['basicos'], permissions: permissions('Compras'), fields: [
      field('categoria_merc', 'Categoria mercadológica', 'select', true, { options: ['Mercearia seca', 'Bebidas não alcoólicas', 'Higiene pessoal'] }),
      field('preco', 'Custo de referência (R$)', 'number', true, { min: 0.01 }), field('prazo', 'Prazo de pagamento (dias)', 'number', false, { min: 0 }),
      field('observacao_compras', 'Observação interna de Compras', 'textarea', false, { private: true, wide: true }),
    ] },
    { id: 'fiscal', title: 'Fiscal', sector: 'Fiscal', supplier: false, approval: true, returns: ['basicos'], permissions: permissions('Fiscal'), fields: [
      field('ncm', 'NCM', 'text', true, { mask: 'ncm', help: 'Classificação fiscal com 8 dígitos.' }),
      field('origem', 'Origem da mercadoria', 'select', true, { options: ['0 — Nacional', '1 — Estrangeira — importação direta', '2 — Estrangeira — adquirida no mercado interno'] }),
      field('cest', 'CEST', 'text', false, { mask: 'digits' }), field('observacao_fiscal', 'Observação interna do Fiscal', 'textarea', false, { private: true, wide: true }),
    ] },
    { id: 'complemento', title: 'Complemento', sector: 'Fornecedor', supplier: true, approval: false, returns: [], permissions: permissions('Compras'), fields: [
      field('embalagens', 'Embalagens de fornecimento', 'table', true, { wide: true, help: 'Cadastre pelo menos uma embalagem com quantidade maior que zero.' }),
      field('disponibilidade', 'Disponível a partir de', 'date'), field('anexos', 'Imagens e documentos', 'file', false, { wide: true, help: 'Arquivos apenas demonstrativos. Guardamos o nome, sem enviar o conteúdo.' }),
    ] },
    { id: 'encerramento', title: 'Encerramento', sector: 'Compras', supplier: false, approval: false, returns: [], permissions: permissions('Compras'), fields: [field('observacao_final', 'Observação de conclusão', 'textarea', false, { wide: true, private: true })] },
  ];
}

const sample = { descricao: 'Café torrado 500 g', gtin: '7890000000017', marca: 'Origem', unidade: 'UN', categoria: 'Mercearia', organico: false, categoria_merc: 'Mercearia seca', preco: 18.9, prazo: 28, ncm: '09012100', origem: '0 — Nacional', observacao_fiscal: 'Conferir enquadramento tributário interno.', embalagens: [{ tipo: 'Caixa', quantidade: 12, gtin: '17890000000014' }], anexos: [] };
const ago = h => new Date(Date.now() - h * 3600000).toISOString();
function addEvent(db, r, p, action, before, after, user, reason = '', extra = {}) {
  r.events.push({ id: ++db.seq, passageId: p.id, stageId: p.stageId, action, before, after, author: user.name, sector: user.level || 'Fornecedor', date: now(), reason, snapshot: clone(r.data), private: false, ...extra });
  r.updated = now();
}
function openPassage(db, r, stage, user, opts = {}) {
  const p = { id: ++db.seq, stageId: stage.id, status: opts.returnId ? 'C' : 'R', created: now(), returnId: opts.returnId || null, allowed: opts.allowed || [], reason: opts.reason || '' };
  r.passages.push(p); r.currentId = p.id; r.status = p.returnId ? 'C' : stage.supplier ? 'R' : 'E';
  addEvent(db, r, p, 'CRIACAO', null, p.status, user);
  return p;
}
function advance(db, r, t, user) {
  const p = current(r); const index = t.stages.findIndex(s => s.id === p.stageId);
  if (index < t.stages.length - 1) return openPassage(db, r, t.stages[index + 1], user);
  r.status = t.stages.some(s => s.approval) ? 'A' : 'F'; r.finished = now();
}
export function createSeed() {
  const db = { version: 1, seq: 2000, templates: [], registrations: [], invites: [], access: [] };
  db.templates = [
    { id: 't-koch', tenant: 'Koch', name: 'Cadastro de alimentos e bebidas', description: 'Informações comerciais, fiscais e logísticas para novos produtos.', active: true, published: true, publishedAt: ago(180), blockedAt: ago(170), originId: null, updated: ago(24), stages: defaultStages() },
    { id: 't-bebidas', tenant: 'Koch', name: 'Cadastro de bebidas', description: 'Modelo em preparação para o segmento de bebidas.', active: true, published: false, blockedAt: null, originId: null, updated: ago(7), stages: defaultStages() },
    { id: 't-prado', tenant: 'Prado', name: 'Ficha de novos produtos', description: 'Cadastro de produtos para a rede Prado.', active: true, published: true, publishedAt: ago(100), blockedAt: null, originId: null, updated: ago(9), stages: defaultStages() },
  ];
  for (const t of [db.templates[0], db.templates[2]]) {
    const id = `invite-${t.id}`;
    db.invites.push({ id, tenant: t.tenant, templateId: t.id, supplier: 'Fornecedor Exemplo Ltda.', email: 'rafael@example.com', document: '12.345.678/0001-90', eligible: true, sent: ago(150), revoked: false });
    db.access.push({ id: `access-${t.id}`, inviteId: id, tenant: t.tenant, templateId: t.id, email: 'rafael@example.com', supplier: 'Fornecedor Exemplo Ltda.', revoked: false });
  }
  db.invites.push({ id: 'invite-pending', tenant: 'Koch', templateId: 't-koch', supplier: 'Fornecedor Exemplo Ltda.', email: 'paula@example.com', document: '12.345.678/0001-90', eligible: false, sent: ago(18), revoked: false });
  const presets = [
    ['Café torrado 500 g', 2, 'E', 'Fornecedor Exemplo Ltda.', 2],
    ['Suco de uva integral 1 L', 0, 'C', 'Fornecedor Exemplo Ltda.', 4],
    ['Biscoito integral 200 g', 1, 'E', 'Fornecedor Exemplo Ltda.', 6],
    ['Arroz branco tipo 1 · 5 kg', 0, 'R', 'Fornecedor Exemplo Ltda.', 8],
    ['Azeite extravirgem 500 ml', 3, 'R', 'Fornecedor Exemplo Ltda.', 11],
    ['Granola tradicional 300 g', 4, 'A', 'Fornecedor Exemplo Ltda.', 25],
    ['Molho de tomate 340 g', 2, 'N', 'Fornecedor Exemplo Ltda.', 29],
    ['Macarrão de sêmola 500 g', 2, 'E', 'Distribuidora Horizonte', 31],
  ];
  presets.forEach(([name, idx, status, supplier, hours], i) => {
    const t = db.templates[0], u = PROFILES[0];
    const r = { id: `reg-${i + 1}`, protocol: `FP-2026-${String(142 + i).padStart(4, '0')}`, tenant: 'Koch', templateId: t.id, supplier, representativeEmail: 'rafael@example.com', accessId: 'access-t-koch', data: { ...clone(sample), descricao: name }, status: 'R', passages: [], events: [], currentId: null, created: ago(hours + 20), updated: ago(hours) };
    db.registrations.push(r);
    for (let n = 0; n <= idx; n++) {
      const p = openPassage(db, r, t.stages[n], u);
      p.status = n < idx ? t.stages[n].approval ? 'A' : 'F' : status === 'A' && !t.stages[n].approval ? 'F' : status;
      if (n < idx) addEvent(db, r, p, p.status === 'A' ? 'APROVACAO' : 'FINALIZACAO', 'E', p.status, u);
    }
    if (status === 'C') {
      const source = current(r); source.stageId = 'fiscal'; source.status = 'E';
      addEvent(db, r, source, 'DEVOLUCAO', 'E', 'E', PROFILES[2], 'Ajustar a descrição para informar o conteúdo líquido.');
      openPassage(db, r, t.stages[0], PROFILES[2], { returnId: source.id, allowed: ['descricao'], reason: 'Ajustar a descrição para informar o conteúdo líquido.' });
    } else { r.status = status === 'R' && idx > 0 ? 'R' : status; }
    if (status === 'A' || status === 'N') {
      addEvent(db, r, current(r), status === 'A' ? 'APROVACAO' : 'REPROVACAO', 'E', status, u, status === 'N' ? 'Produto não aprovado para o sortimento atual.' : 'Cadastro conferido e concluído.');
      r.finished = ago(hours);
    }
    r.updated = ago(hours);
    r.events.forEach((e, n) => { e.date = ago(hours + (r.events.length - n) * 0.3); });
  });
  return db;
}

export function getAccess(db, user, tenant, templateId) {
  return db.access.find(a => a.tenant === tenant && a.templateId === templateId && a.email === user.email && a.supplier === user.supplier && !a.revoked && db.invites.some(i => i.id === a.inviteId && i.eligible && !i.revoked));
}
export function rights(db, user, tenant, t, r = null, stageOverride = null) {
  if (!t || t.tenant !== tenant || (r && (r.tenant !== tenant || r.templateId !== t.id))) return { view: false, edit: false, approve: false };
  const stage = stageOverride || definition(t, current(r));
  if (isSupplier(user)) {
    const view = !!getAccess(db, user, tenant, t.id) && (!r || (r.supplier === user.supplier && r.representativeEmail === user.email));
    return { view, edit: view && !!r && !!stage?.supplier && ['R', 'C'].includes(current(r)?.status) && !['A', 'F', 'N'].includes(r.status), approve: false };
  }
  const grants = stage?.permissions[user.level];
  const view = !stage ? true : !!grants?.view;
  const editable = !!r && ['R', 'C'].includes(current(r)?.status) && !stage?.supplier && !['A', 'F', 'N'].includes(r.status);
  return { view, edit: view && !!grants?.edit && editable, approve: view && !!grants?.approve && current(r)?.status === 'E' && !stage?.supplier && !['A', 'F', 'N'].includes(r?.status) };
}
export const fieldVisible = (f, data) => !f.condition || !!data[f.condition];
export function validation(fields, data) {
  const errors = {};
  for (const f of fields) {
    if (!fieldVisible(f, data)) continue;
    const v = data[f.key], empty = v == null || v === '' || (Array.isArray(v) && !v.length);
    if (f.required && empty) { errors[f.key] = 'Preencha este campo para continuar.'; continue; }
    if (empty) continue;
    if (f.max && String(v).length > f.max) errors[f.key] = `Use no máximo ${f.max} caracteres.`;
    if (f.type === 'number' && (!Number.isFinite(Number(v)) || (f.min != null && Number(v) < f.min))) errors[f.key] = `Informe um número válido${f.min != null ? ` a partir de ${f.min}` : ''}.`;
    if (f.key === 'gtin' && !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(v)) errors[f.key] = 'Use 8, 12, 13 ou 14 dígitos.';
    if (f.mask === 'ncm' && !/^\d{8}$/.test(v)) errors[f.key] = 'Informe os 8 dígitos do NCM.';
    if (f.type === 'select' && !(f.options || []).includes(v)) errors[f.key] = 'Selecione uma opção válida.';
    if (f.type === 'table' && (!Array.isArray(v) || v.some(row => !row.tipo?.trim() || !Number.isFinite(Number(row.quantidade)) || Number(row.quantidade) <= 0))) errors[f.key] = 'Informe o tipo e uma quantidade maior que zero em cada linha.';
  }
  return errors;
}
export function templateIssues(t) {
  const issues = [];
  if (!t.name.trim()) issues.push('Informe o nome da ficha.');
  if (!t.stages.length) issues.push('Adicione ao menos uma etapa.');
  if (t.stages[0] && !t.stages[0].supplier) issues.push('A demonstração inicia com uma etapa do fornecedor.');
  const keys = new Set();
  for (const s of t.stages) {
    if (!s.title.trim()) issues.push('Todas as etapas precisam de um título.');
    if (s.supplier && s.approval) issues.push(`${s.title}: nesta demonstração, a aprovação deve ocorrer em uma etapa interna.`);
    if (s.approval && !Object.values(s.permissions).some(p => p.view && p.approve)) issues.push(`${s.title}: associe um nível autorizado a aprovar.`);
    for (const f of s.fields) {
      if (!f.label.trim()) issues.push(`${s.title}: informe o nome de todos os campos.`);
      if (keys.has(f.key)) issues.push(`A chave ${f.key} está repetida.`); keys.add(f.key);
      if (f.type === 'select' && !f.options?.length) issues.push(`${f.label}: adicione opções de seleção.`);
      if (f.condition && (!s.fields.some(other => other.key === f.condition && other.type === 'boolean') || f.condition === f.key)) issues.push(`${f.label}: escolha uma condição válida da mesma etapa.`);
      if (f.editableWhen && (!s.fields.some(other => other.key === f.editableWhen && other.type === 'boolean') || f.editableWhen === f.key)) issues.push(`${f.label}: escolha uma condição de edição válida da mesma etapa.`);
    }
    if (s.returns.some(id => !t.stages.some(other => other.id === id))) issues.push(`${s.title}: destino de correção não encontrado.`);
  }
  return [...new Set(issues)];
}

export function visibleData(t, data, user) {
  const keys = t.stages.filter(s => isSupplier(user) || s.permissions[user.level]?.view).flatMap(s => s.fields.filter(f => !(isSupplier(user) && f.private)).map(f => f.key));
  return Object.fromEntries(Object.entries(data).filter(([k]) => keys.includes(k)));
}
export function visibleEvents(r, t, user) {
  return r.events.filter(e => (!isSupplier(user) || !e.private) && (isSupplier(user) || t.stages.find(s => s.id === e.stageId)?.permissions[user.level]?.view)).map(e => ({ ...e, snapshot: visibleData(t, e.snapshot, user) }));
}

export function command(input, type, payload, user, tenant) {
  const db = clone(input);
  if (type === 'RESET') return createSeed();
  if (['TEMPLATE_SAVE', 'TEMPLATE_COPY', 'TEMPLATE_PUBLISH', 'TEMPLATE_NEW', 'INVITE', 'REVOKE', 'REGULARIZE'].includes(type)) {
    assert(user.id === 'admin', 'Apenas a administração pode executar esta ação.');
    if (type === 'TEMPLATE_NEW') {
      db.templates.unshift({ id: `t-${++db.seq}`, tenant, name: 'Nova ficha de cadastro', description: '', active: true, published: false, blockedAt: null, originId: null, updated: now(), stages: defaultStages() });
      return db;
    }
    if (type === 'REVOKE' || type === 'REGULARIZE') {
      const i = db.invites.find(i => i.id === payload.id && i.tenant === tenant); assert(i, 'Convite não encontrado.');
      if (type === 'REVOKE') { i.revoked = true; db.access.filter(a => a.inviteId === i.id).forEach(a => a.revoked = true); }
      else { assert(!i.revoked, 'Convite revogado.'); i.eligible = true; db.access.push({ id: `access-${++db.seq}`, inviteId: i.id, tenant, templateId: i.templateId, email: i.email, supplier: i.supplier, revoked: false }); }
      return db;
    }
    const t = db.templates.find(t => t.id === payload.id && t.tenant === tenant); assert(t, 'Ficha não encontrada.');
    if (type === 'TEMPLATE_COPY') {
      db.templates.unshift({ ...clone(t), id: `t-${++db.seq}`, name: `${t.name} (cópia)`, originId: t.id, blockedAt: null, published: false, publishedAt: null, updated: now() });
    } else if (type === 'TEMPLATE_SAVE') {
      assert(!t.blockedAt, 'Esta ficha está bloqueada. Crie uma cópia.');
      const safe = clone(payload.template);
      Object.assign(t, { name: safe.name, description: safe.description, active: safe.active, stages: safe.stages, published: false, updated: now() });
    } else if (type === 'TEMPLATE_PUBLISH') {
      assert(!t.blockedAt, 'A ficha já iniciada não pode ser republicada com outra estrutura.');
      const problems = templateIssues(t); assert(!problems.length, problems.join(' ')); assert(t.active, 'Ative a ficha antes de publicar.');
      t.published = true; t.publishedAt = now(); t.updated = now();
    } else if (type === 'INVITE') {
      assert(t.published && t.active, 'Publique uma ficha ativa antes de convidar.');
      assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email), 'Informe um e-mail válido.');
      assert(payload.supplier?.trim() && payload.document?.replace(/\D/g, '').length >= 11, 'Informe o fornecedor e CPF/CNPJ.');
      assert(!db.invites.some(i => i.templateId === t.id && i.email === payload.email.toLowerCase().trim() && !i.revoked), 'Já existe um convite ativo para este destinatário e ficha.');
      const i = { id: `invite-${++db.seq}`, tenant, templateId: t.id, supplier: payload.supplier.trim(), email: payload.email.toLowerCase().trim(), document: payload.document, eligible: !!payload.eligible, sent: now(), revoked: false };
      db.invites.unshift(i);
      if (i.eligible) db.access.push({ id: `access-${++db.seq}`, inviteId: i.id, tenant, templateId: t.id, email: i.email, supplier: i.supplier, revoked: false });
    }
    return db;
  }
  if (type === 'START') {
    const t = db.templates.find(t => t.id === payload.templateId && t.tenant === tenant);
    assert(t?.published && t.active, 'Esta ficha não está disponível.');
    const access = getAccess(db, user, tenant, t.id); assert(isSupplier(user) && access, 'Você não possui acesso liberado a esta ficha.');
    const id = ++db.seq;
    const r = { id: `reg-${id}`, protocol: `FP-2026-${String(id).padStart(4, '0')}`, tenant, templateId: t.id, supplier: user.supplier, representativeEmail: user.email, accessId: access.id, data: {}, passages: [], events: [], created: now(), updated: now(), status: 'R' };
    db.registrations.unshift(r); openPassage(db, r, t.stages[0], user); t.blockedAt ||= now(); return db;
  }
  const r = db.registrations.find(r => r.id === payload.id && r.tenant === tenant); assert(r, 'Cadastro não encontrado.');
  const t = db.templates.find(t => t.id === r.templateId && t.tenant === tenant);
  const p = current(r), s = definition(t, p), grant = rights(db, user, tenant, t, r);
  assert(grant.view, 'Você não possui acesso a este cadastro.');
  assert(!['A', 'F', 'N'].includes(r.status), 'Este cadastro já foi encerrado.');
  assert(payload.passageId === p.id, 'A etapa foi atualizada. Reabra o cadastro antes de continuar.');
  if (type === 'SAVE' || type === 'SUBMIT') {
    assert(grant.edit, 'Você não pode editar esta passagem.');
    const allowedFields = s.fields.filter(f => !p.returnId || p.allowed.includes(f.key));
    const proposed = { ...r.data, ...(payload.data || {}) };
    const allowedKeys = allowedFields.filter(f => fieldVisible(f, proposed) && (!f.editableWhen || proposed[f.editableWhen])).map(f => f.key);
    for (const [key, value] of Object.entries(payload.data || {})) {
      if (JSON.stringify(r.data[key]) === JSON.stringify(value)) continue;
      assert(allowedKeys.includes(key), 'O envio contém alteração de um campo não autorizado.');
      r.data[key] = clone(value);
    }
    if (type === 'SAVE') addEvent(db, r, p, 'SALVAMENTO', p.status, p.status, user);
    else {
      const errors = validation(allowedFields, r.data); assert(!Object.keys(errors).length, Object.values(errors)[0]);
      const before = p.status;
      if (p.returnId) {
        const dest = r.passages.find(x => x.id === p.returnId); assert(dest?.status === 'E', 'O destino da correção não está mais pendente.');
        p.status = 'F'; addEvent(db, r, p, 'ENVIO', before, 'F', user);
        addEvent(db, r, p, 'FINALIZACAO', 'F', 'F', user, 'Correção entregue ao setor solicitante.');
        r.currentId = dest.id; r.status = 'E'; addEvent(db, r, dest, 'RETOMADA', 'E', 'E', { name: 'Sistema', level: 'Processo' }, 'Dados corrigidos recebidos para nova conferência.');
      } else {
        p.status = s.approval ? 'E' : 'F'; addEvent(db, r, p, 'ENVIO', before, p.status, user);
        if (s.approval) r.status = 'E';
        else { addEvent(db, r, p, 'FINALIZACAO', 'F', 'F', user); advance(db, r, t, user); }
      }
    }
  } else if (type === 'APPROVE' || type === 'REJECT' || type === 'CORRECTION') {
    assert(grant.approve, 'Você não possui permissão para decidir nesta etapa.');
    if (type === 'APPROVE') { p.status = 'A'; addEvent(db, r, p, 'APROVACAO', 'E', 'A', user); advance(db, r, t, user); }
    if (type === 'REJECT') { assert(payload.reason?.trim(), 'Informe o motivo da não aprovação.'); p.status = 'N'; r.status = 'N'; r.finished = now(); addEvent(db, r, p, 'REPROVACAO', 'E', 'N', user, payload.reason.trim()); }
    if (type === 'CORRECTION') {
      assert(payload.reason?.trim(), 'Informe o motivo da correção.');
      const target = t.stages.find(stage => stage.id === payload.targetId);
      assert(target && s.returns.includes(target.id), 'Destino de correção não permitido.');
      assert(r.passages.some(x => x.stageId === target.id), 'A etapa de destino ainda não foi executada.');
      assert(payload.allowed?.length && payload.allowed.every(k => target.fields.some(f => f.key === k && !f.private)), 'Selecione campos válidos para correção.');
      addEvent(db, r, p, 'DEVOLUCAO', 'E', 'E', user, payload.reason.trim(), { targetId: target.id, allowed: clone(payload.allowed) });
      openPassage(db, r, target, user, { returnId: p.id, reason: payload.reason.trim(), allowed: payload.allowed });
    }
  } else throw new Error('Ação não reconhecida.');
  return db;
}
