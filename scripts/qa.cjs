// Browser QA: node scripts/qa.cjs <puppeteer module path> <Chrome executable>
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const puppeteer = require(process.argv[2] || 'puppeteer');
const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:5176/';

(async () => {
  const { createSeed, STORAGE_KEY } = await import(pathToFileURL(path.join(root, 'src/domain.js')).href);
  const browser = await puppeteer.launch({ headless: true, executablePath: process.argv[3], args: ['--no-sandbox'] });
  const page = await browser.newPage(); const errors = []; const checks = [];
  page.on('pageerror', e => errors.push(e.message));
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function click(text) {
    await page.waitForFunction(text => [...document.querySelectorAll('button')].some(b => b.textContent.replace(/\s+/g, ' ').trim() === text && !b.disabled && b.getClientRects().length), { timeout: 10000 }, text);
    const el = await page.evaluateHandle(text => [...document.querySelectorAll('button')].find(b => b.textContent.replace(/\s+/g, ' ').trim() === text && !b.disabled && b.getClientRects().length), text);
    await el.click(); await pause(90);
  }
  async function fill(selector, value) { await page.waitForSelector(selector); await page.click(selector, { clickCount: 3 }); await page.keyboard.press('Backspace'); await page.type(selector, value); }
  async function profile(id) { await page.select('#demo-profile', id); await pause(130); }
  async function open(protocol) { await page.click(`[aria-label="Abrir cadastro ${protocol}"]`); await page.waitForSelector('.product-form'); }
  async function state() { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), STORAGE_KEY); }
  async function expectState(fn) { for (let i = 0; i < 30; i++) { const db = await state(); if (fn(db)) return db; await pause(100); } throw new Error('Estado esperado não alcançado.'); }
  async function screenshot(name) { await pause(120); const css = await page.addStyleTag({ content: '.toast{visibility:hidden!important}' }); await page.screenshot({ path: path.join(root, 'artifacts', name), fullPage: true }); await css.evaluate(el => el.remove()); }
  async function submit(label) { await click(label); await click('Confirmar envio'); }
  try {
    await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate((key, seed) => { localStorage.setItem(key, JSON.stringify(seed)); localStorage.removeItem(`${key}-context`); }, STORAGE_KEY, createSeed());
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForSelector('h1');
    assert((await page.$eval('h1', e => e.textContent)).includes('Cadastros de produto'));
    await page.screenshot({ path: path.join(root, 'artifacts/01-cadastros.png'), fullPage: true });
    checks.push('Listagem inicial renderizada');
    if (process.env.QA_SCREENSHOT_ONLY) return;
    await page.click('[aria-label="Próxima página"]');
    assert((await page.$eval('tbody', e => e.textContent)).includes('Macarrão'));
    await page.click('[aria-label="Página anterior"]');
    await fill('[aria-label="Buscar cadastro"]', 'Café');
    assert.equal(await page.$$eval('.data-table tbody tr', rows => rows.length), 1);
    await page.click('[aria-label="Limpar busca"]');
    checks.push('Busca e paginação funcionais');

    await profile('fiscal'); await open('FP-2026-0142');
    const source = (await state()).registrations.find(r => r.id === 'reg-1').currentId;
    await click('Solicitar correção');
    await page.click('.correction-fields label:first-child input');
    await fill('#correction-reason', 'Informar o conteúdo líquido e a apresentação na descrição.');
    await screenshot('02-solicitar-correcao.png');
    await click('Confirmar solicitação');
    await expectState(db => db.registrations.find(r => r.id === 'reg-1').status === 'C');
    await profile('representante'); await open('FP-2026-0142');
    assert.equal(await page.$eval('#product-descricao', e => e.disabled), false);
    assert.equal(await page.$eval('#product-marca', e => e.disabled), true);
    assert(!(await page.$eval('body', e => e.innerText)).includes('Conferir enquadramento tributário interno.'));
    await fill('#product-descricao', 'Café torrado e moído 500 g');
    await page.click('.demo-settings summary'); await click('Simular falha ao salvar');
    await click('Salvar alterações');
    assert.equal((await state()).registrations.find(r => r.id === 'reg-1').data.descricao, 'Café torrado 500 g');
    assert.equal(await page.$eval('#product-descricao', e => e.value), 'Café torrado e moído 500 g');
    await click('Salvar alterações');
    await expectState(db => db.registrations.find(r => r.id === 'reg-1').data.descricao === 'Café torrado e moído 500 g');
    await screenshot('03-alliance-correcao.png');
    await submit('Reenviar correção');
    let data = await expectState(db => db.registrations.find(r => r.id === 'reg-1').currentId === source);
    assert.equal(data.registrations.find(r => r.id === 'reg-1').status, 'E');
    checks.push('Correção limitada aos campos autorizados; falha de salvamento recuperável; retorno à mesma análise');

    await profile('fiscal2'); await open('FP-2026-0142');
    await click('Aprovar etapa'); await click('Confirmar aprovação');
    await expectState(db => { const r = db.registrations.find(r => r.id === 'reg-1'); return r.passages.find(p => p.id === r.currentId).stageId === 'complemento'; });
    await profile('representante'); await open('FP-2026-0142');
    await click('Adicionar embalagem');
    await click('Enviar etapa');
    assert((await page.$eval('body', e => e.innerText)).includes('quantidade maior que zero'));
    await fill('[aria-label="Embalagem 2"]', 'Fardo');
    await fill('[aria-label="Quantidade 2"]', '6');
    const file = await page.$('input[type="file"]');
    await file.uploadFile(path.join(root, 'artifacts/01-cadastros.png'));
    await submit('Enviar etapa');
    await profile('compras'); await open('FP-2026-0142');
    await submit('Concluir etapa');
    data = await expectState(db => db.registrations.find(r => r.id === 'reg-1').status === 'A');
    assert(data.registrations.find(r => r.id === 'reg-1').events.some(e => e.action === 'APROVACAO' && e.author === 'Bruno Lima'));
    await screenshot('04-cadastro-aprovado.png');
    checks.push('Outro usuário do Fiscal aprova; complemento normal do fornecedor; anexo, tabela e encerramento em A');

    await profile('consulta'); await open('FP-2026-0144');
    assert.equal(await page.$$eval('.product-actionbar button', els => els.length), 0);
    assert(await page.$eval('#product-preco', e => e.disabled));
    checks.push('Perfil de consulta sem edição ou decisões');

    await profile('admin'); await click('Fichas de cadastro'); await click('Nova ficha');
    const templateId = (await state()).templates[0].id;
    await click('Geral'); await fill('#template-name', 'Ficha de demonstração guiada');
    await click('Etapas e campos'); await click('Adicionar campo à etapa'); await click('Texto longo');
    await fill('#field-label', 'Observação do fornecedor');
    await click('Pré-visualização');
    assert.equal(await page.$('#preview-certificacao'), null);
    await page.click('#preview-organico'); await page.waitForSelector('#preview-certificacao');
    await click('Etapas e campos'); await screenshot('05-editor-ficha.png');
    await click('Publicar ficha');
    await expectState(db => db.templates.find(t => t.id === templateId).published);
    await click('Convidar representante'); await click('Registrar convite');
    await expectState(db => db.invites.some(i => i.templateId === templateId && i.email === 'rafael@example.com'));
    checks.push('Editor adiciona campo; prévia condicional; publicação e convite');

    await profile('representante'); await click('Fichas disponíveis');
    const card = await page.evaluateHandle(() => [...document.querySelectorAll('.available-card')].find(c => c.textContent.includes('Ficha de demonstração guiada')).querySelector('.btn'));
    await card.click(); await click('Iniciar preenchimento');
    let active = (await state()).registrations[0]; const activeId = active.id, protocol = active.protocol;
    assert((await state()).templates.find(t => t.id === templateId).blockedAt);
    await click('Enviar etapa'); assert(await page.$('[aria-invalid="true"]'));
    await fill('#product-descricao', 'Produto do roteiro completo');
    await fill('#product-gtin', '7890000000017');
    await fill('#product-marca', 'Exemplo');
    await page.select('#product-unidade', 'UN'); await page.select('#product-categoria', 'Mercearia');
    await page.click('#product-organico'); await fill('#product-certificacao', 'Certificação demonstrativa');
    await click('Meus cadastros'); await page.waitForSelector('dialog');
    assert((await page.$eval('dialog', e => e.textContent)).includes('Sair sem salvar'));
    await click('Continuar editando'); await click('Salvar rascunho');
    await expectState(db => db.registrations.find(r => r.id === activeId).data.descricao === 'Produto do roteiro completo');
    await page.reload({ waitUntil: 'networkidle0' }); await open(protocol);
    assert.equal(await page.$eval('#product-descricao', e => e.value), 'Produto do roteiro completo');
    await submit('Enviar etapa');
    await expectState(db => { const r = db.registrations.find(r => r.id === activeId); return r.passages.find(p => p.id === r.currentId).stageId === 'compras'; });
    checks.push('Novo produto: obrigatoriedade, condição, proteção ao sair, persistência após recarregar e envio ao varejo');

    await profile('compras'); await open(protocol);
    await page.select('#product-categoria_merc', 'Mercearia seca'); await fill('#product-preco', '15.9');
    await submit('Enviar para análise'); await click('Aprovar etapa'); await click('Confirmar aprovação');
    await profile('fiscal'); await open(protocol);
    await fill('#product-ncm', '09012100'); await page.select('#product-origem', '0 — Nacional');
    await submit('Enviar para análise'); await click('Aprovar etapa'); await click('Confirmar aprovação');
    await profile('representante'); await open(protocol);
    await click('Adicionar embalagem'); await fill('[aria-label="Embalagem 1"]', 'Caixa'); await fill('[aria-label="Quantidade 1"]', '12');
    await submit('Enviar etapa'); await profile('compras'); await open(protocol); await submit('Concluir etapa');
    await expectState(db => db.registrations.find(r => r.id === activeId).status === 'A');
    checks.push('Ciclo de produto novo concluído integralmente pela interface');

    await profile('admin'); await click('Convites'); await click('Simular regularização');
    await profile('pendente'); await click('Fichas disponíveis');
    assert.equal(await page.$$eval('.available-card', c => c.length), 1);
    await profile('admin'); await click('Convites');
    await page.click('[aria-label="Revogar convite paula@example.com"]'); await click('Revogar acesso');
    await profile('pendente'); await click('Fichas disponíveis');
    assert.equal(await page.$$eval('.available-card', c => c.length), 0);
    checks.push('Regularização e revogação refletidas no Alliance');

    await profile('representante'); await page.select('[aria-label="Varejista selecionado"]', 'Prado');
    assert.equal(await page.$$eval('.data-table tbody tr', r => r.length), 0);
    await click('Fichas disponíveis'); assert.equal(await page.$$eval('.available-card', c => c.length), 1);
    await page.select('[aria-label="Varejista selecionado"]', 'Koch'); await click('Fichas disponíveis');
    await screenshot('06-fichas-alliance.png');
    checks.push('Isolamento das visões Koch e Prado');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await screenshot('07-mobile-alliance.png');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    checks.push('Layout móvel sem transbordamento horizontal da página');
    await profile('admin');
    await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
    await page.evaluate((key, seed) => { localStorage.setItem(key, JSON.stringify(seed)); localStorage.removeItem(`${key}-context`); }, STORAGE_KEY, createSeed());
    await page.reload({ waitUntil: 'networkidle0' });
    await page.goto(pathToFileURL(path.join(root, 'prototipo.html')).href, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.app-header');
    assert((await page.$eval('h1', e => e.textContent)).includes('Cadastros de produto'));
    await profile('representante'); await click('Fichas disponíveis');
    assert.equal(await page.$$eval('.available-card', cards => cards.length), 1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.app-header');
    assert.equal(await page.$eval('#demo-profile', e => e.value), 'representante');
    checks.push('HTML portátil abre diretamente via file:// e preserva o contexto após recarregar');
    assert.equal(errors.length, 0);
  } catch (e) {
    await screenshot('qa-failure.png');
    throw e;
  } finally {
    fs.writeFileSync(path.join(root, 'artifacts/qa.json'), JSON.stringify({ checks, errors }, null, 2));
    await browser.close();
    console.log(JSON.stringify({ checks, errors }));
    if (errors.length) process.exitCode = 1;
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
