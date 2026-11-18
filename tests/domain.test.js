import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, command, createSeed, current, definition, getAccess, rights, templateIssues, validation, visibleData, visibleEvents } from '../src/domain.js';

const admin = PROFILES.find(p => p.id === 'admin'), supplier = PROFILES.find(p => p.id === 'representante'), fiscal = PROFILES.find(p => p.id === 'fiscal'), otherFiscal = PROFILES.find(p => p.id === 'fiscal2'), compras = PROFILES.find(p => p.id === 'compras'), consulta = PROFILES.find(p => p.id === 'consulta');
const run = (db, type, payload, user = admin, tenant = 'Koch') => command(db, type, payload, user, tenant);
const payload = (db, id, extras = {}) => ({ id, passageId: current(db.registrations.find(r => r.id === id)).id, ...extras });
const reg = (db, id = 'reg-1') => db.registrations.find(r => r.id === id);

test('a estrutura bloqueada exige cópia; editar a cópia preserva a origem', () => {
  const seed = createSeed(), original = structuredClone(seed.templates[0]);
  assert.throws(() => run(seed, 'TEMPLATE_SAVE', { id: 't-koch', template: original }), /bloqueada/);
  let db = run(seed, 'TEMPLATE_COPY', { id: 't-koch' }); const copy = db.templates[0];
  assert.equal(copy.originId, original.id); assert.equal(copy.blockedAt, null); assert.equal(copy.published, false);
  copy.name = 'Ficha nova'; copy.stages[0].fields[0].label = 'Descrição nova';
  db = run(db, 'TEMPLATE_SAVE', { id: copy.id, template: copy });
  assert.deepEqual(db.templates.find(t => t.id === original.id), original);
});

test('publicação exige estrutura válida e um nível apto a aprovar', () => {
  const db = createSeed(), t = structuredClone(db.templates.find(t => t.id === 't-bebidas'));
  t.stages[1].permissions = {};
  assert(templateIssues(t).some(i => i.includes('autorizado a aprovar')));
  const saved = run(db, 'TEMPLATE_SAVE', { id: t.id, template: t });
  assert.throws(() => run(saved, 'TEMPLATE_PUBLISH', { id: t.id }), /aprovar/);
});

test('convite pendente só libera acesso após regularização; revogação bloqueia acesso', () => {
  let db = createSeed(); const user = PROFILES.find(p => p.id === 'pendente');
  assert.equal(getAccess(db, user, 'Koch', 't-koch'), undefined);
  assert.throws(() => run(db, 'START', { templateId: 't-koch' }, user), /acesso/);
  db = run(db, 'REGULARIZE', { id: 'invite-pending' });
  assert(getAccess(db, user, 'Koch', 't-koch'));
  db = run(db, 'START', { templateId: 't-koch' }, user); const id = db.registrations[0].id;
  db = run(db, 'REVOKE', { id: 'invite-pending' });
  assert.equal(rights(db, user, 'Koch', db.templates.find(t => t.id === 't-koch'), reg(db, id)).view, false);
  assert.throws(() => run(db, 'SAVE', payload(db, id, { data: {} }), user), /acesso/);
});

test('o destinatário e o varejista delimitam o acesso', () => {
  const db = createSeed();
  assert.throws(() => run(db, 'APPROVE', payload(db, 'reg-1'), admin, 'Prado'), /não encontrado/);
  assert.throws(() => run(db, 'START', { templateId: 't-koch' }, supplier, 'Prado'), /disponível/);
  assert.equal(rights(db, supplier, 'Koch', db.templates[0], reg(db, 'reg-8')).view, false);
  assert.equal(rights(db, supplier, 'Koch', db.templates[0], reg(db, 'reg-1')).view, true);
});

test('consulta não autoriza alteração, aprovação ou edição de modelos', () => {
  const db = createSeed();
  assert.equal(rights(db, consulta, 'Koch', db.templates[0], reg(db)).approve, false);
  assert.throws(() => run(db, 'APPROVE', payload(db, 'reg-1'), consulta), /permissão/);
  assert.throws(() => run(db, 'SAVE', payload(db, 'reg-4', { data: { descricao: 'Alteração' } }), consulta), /editar/);
  assert.throws(() => run(db, 'TEMPLATE_COPY', { id: 't-koch' }, consulta), /administração/);
});

test('salvar mantém o rascunho; uma validação não aceita envio incompleto', () => {
  let db = run(createSeed(), 'START', { templateId: 't-koch' }, supplier); const id = db.registrations[0].id;
  db = run(db, 'SAVE', payload(db, id, { data: { descricao: 'Produto parcial' } }), supplier);
  assert.equal(current(reg(db, id)).status, 'R');
  const before = structuredClone(db);
  assert.throws(() => run(db, 'SUBMIT', payload(db, id, { data: {} }), supplier), /Preencha/);
  assert.deepEqual(db, before);
});

test('a correção preserva a execução solicitante e retorna ao mesmo setor', () => {
  let db = createSeed(); const sourceId = current(reg(db)).id;
  db = run(db, 'CORRECTION', payload(db, 'reg-1', { targetId: 'basicos', allowed: ['descricao'], reason: 'Informar o conteúdo líquido.' }), fiscal);
  const correctionId = current(reg(db)).id;
  assert.notEqual(sourceId, correctionId); assert.equal(current(reg(db)).returnId, sourceId);
  assert.equal(reg(db).passages.find(p => p.id === sourceId).status, 'E');
  db = run(db, 'SAVE', payload(db, 'reg-1', { data: { descricao: 'Café torrado e moído 500 g' } }), supplier);
  assert.equal(current(reg(db)).status, 'C');
  db = run(db, 'SUBMIT', payload(db, 'reg-1', { data: {} }), supplier);
  assert.equal(current(reg(db)).id, sourceId); assert.equal(current(reg(db)).status, 'E');
  assert.equal(reg(db).passages.find(p => p.id === correctionId).status, 'F');
  assert.equal(reg(db).status, 'E');
  assert(reg(db).events.some(e => e.action === 'RETOMADA' && e.before === 'E' && e.after === 'E'));
  db = run(db, 'APPROVE', payload(db, 'reg-1'), otherFiscal);
  assert.equal(current(reg(db)).stageId, 'complemento'); assert.equal(current(reg(db)).status, 'R');
  assert.equal(reg(db).events.findLast(e => e.action === 'APROVACAO').author, otherFiscal.name);
});

test('não se pode alterar campos fora da correção nem avançar a análise suspensa', () => {
  let db = createSeed(); const old = current(reg(db)).id;
  db = run(db, 'CORRECTION', payload(db, 'reg-1', { targetId: 'basicos', allowed: ['descricao'], reason: 'Ajuste.' }), fiscal);
  assert.throws(() => run(db, 'SAVE', payload(db, 'reg-1', { data: { marca: 'Outra marca' } }), supplier), /não autorizado/);
  assert.throws(() => run(db, 'APPROVE', { id: 'reg-1', passageId: old }, fiscal), /atualizada/);
  assert.throws(() => run(db, 'CORRECTION', payload(db, 'reg-1', { targetId: 'basicos', allowed: ['descricao'], reason: 'Outra.' }), fiscal), /permissão/);
});

test('novo pedido de correção cria outra passagem e preserva os snapshots', () => {
  let db = createSeed(); const firstSnapshot = structuredClone(reg(db).events[0].snapshot);
  for (let n = 0; n < 2; n++) {
    db = run(db, 'CORRECTION', payload(db, 'reg-1', { targetId: 'basicos', allowed: ['descricao'], reason: `Ajuste ${n}` }), fiscal);
    db = run(db, 'SUBMIT', payload(db, 'reg-1', { data: { descricao: `Descrição corrigida ${n}` } }), supplier);
  }
  assert.equal(reg(db).passages.filter(p => p.returnId).length, 2);
  assert.deepEqual(reg(db).events[0].snapshot, firstSnapshot);
});

test('comandos repetidos não aprovam ou avançam a mesma passagem duas vezes', () => {
  let db = createSeed(); const request = payload(db, 'reg-1');
  db = run(db, 'APPROVE', request, fiscal); const total = reg(db).passages.length;
  assert.throws(() => run(db, 'APPROVE', request, fiscal), /atualizada/);
  assert.equal(reg(db).passages.length, total);
});

test('reprovação exige motivo e encerra o cadastro, sem nova edição', () => {
  const seed = createSeed(); assert.throws(() => run(seed, 'REJECT', payload(seed, 'reg-1'), fiscal), /motivo/);
  const db = run(seed, 'REJECT', payload(seed, 'reg-1', { reason: 'Fora do sortimento.' }), fiscal);
  assert.equal(reg(db).status, 'N');
  assert.throws(() => run(db, 'APPROVE', payload(db, 'reg-1'), fiscal), /encerrado/);
});

test('notas internas e snapshots privados não são expostos ao fornecedor', () => {
  const db = createSeed(), r = reg(db), t = db.templates[0];
  assert.equal(visibleData(t, r.data, supplier).observacao_fiscal, undefined);
  assert(visibleEvents(r, t, supplier).every(e => !('observacao_fiscal' in e.snapshot)));
  assert(visibleData(t, r.data, fiscal).observacao_fiscal);
});

test('condições, opções e tabelas repetidas são validadas no envio', () => {
  const t = createSeed().templates[0], fields = t.stages[0].fields;
  assert(!validation(fields, { ...reg(createSeed()).data, organico: false }).certificacao);
  assert(validation(fields, { ...reg(createSeed()).data, organico: true }).certificacao);
  assert(validation(fields, { ...reg(createSeed()).data, unidade: 'OPÇÃO INVÁLIDA' }).unidade);
  assert(validation(t.stages[3].fields, { embalagens: [{ tipo: 'Caixa', quantidade: 0 }] }).embalagens);
});

test('condição de edição limita também o comando de salvamento', () => {
  let db = createSeed();
  db.templates[0].stages[0].fields.find(f => f.key === 'marca').editableWhen = 'organico';
  assert.throws(() => run(db, 'SAVE', payload(db, 'reg-4', { data: { marca: 'Outra marca' } }), supplier), /não autorizado/);
  db = run(db, 'SAVE', payload(db, 'reg-4', { data: { organico: true, marca: 'Marca autorizada' } }), supplier);
  assert.equal(reg(db, 'reg-4').data.marca, 'Marca autorizada');
});

test('ciclo completo: publicação, convite, fornecedor, varejo, complemento e encerramento', () => {
  let db = run(createSeed(), 'TEMPLATE_COPY', { id: 't-koch' }); const t = db.templates[0];
  db = run(db, 'TEMPLATE_PUBLISH', { id: t.id });
  db = run(db, 'INVITE', { id: t.id, supplier: supplier.supplier, document: '12.345.678/0001-90', email: supplier.email, eligible: true });
  db = run(db, 'START', { templateId: t.id }, supplier); const id = db.registrations[0].id;
  assert(db.templates.find(x => x.id === t.id).blockedAt);
  db = run(db, 'SUBMIT', payload(db, id, { data: { descricao: 'Produto de teste', gtin: '7890000000017', marca: 'Exemplo', unidade: 'UN', categoria: 'Mercearia', organico: false } }), supplier);
  assert.equal(current(reg(db, id)).stageId, 'compras');
  db = run(db, 'SUBMIT', payload(db, id, { data: { categoria_merc: 'Mercearia seca', preco: 10 } }), compras);
  db = run(db, 'APPROVE', payload(db, id), compras);
  db = run(db, 'SUBMIT', payload(db, id, { data: { ncm: '09012100', origem: '0 — Nacional' } }), fiscal);
  db = run(db, 'APPROVE', payload(db, id), fiscal);
  assert.equal(current(reg(db, id)).stageId, 'complemento'); assert.equal(reg(db, id).status, 'R');
  db = run(db, 'SUBMIT', payload(db, id, { data: { embalagens: [{ tipo: 'Caixa', quantidade: 12 }] } }), supplier);
  db = run(db, 'SUBMIT', payload(db, id, { data: {} }), compras);
  assert.equal(reg(db, id).status, 'A'); assert.equal(current(reg(db, id)).status, 'F');
});

test('fluxo sem aprovação exigida encerra em F', () => {
  let db = createSeed(), t = structuredClone(db.templates.find(t => t.id === 't-bebidas'));
  t.stages = [t.stages[0]];
  db = run(db, 'TEMPLATE_SAVE', { id: t.id, template: t }); db = run(db, 'TEMPLATE_PUBLISH', { id: t.id });
  db = run(db, 'INVITE', { id: t.id, supplier: supplier.supplier, document: '12.345.678/0001-90', email: supplier.email, eligible: true });
  db = run(db, 'START', { templateId: t.id }, supplier); const id = db.registrations[0].id;
  const data = Object.fromEntries(t.stages[0].fields.filter(f => f.key in reg(db, 'reg-1').data).map(f => [f.key, reg(db, 'reg-1').data[f.key]]));
  db = run(db, 'SUBMIT', payload(db, id, { data }), supplier);
  assert.equal(reg(db, id).status, 'F');
});
