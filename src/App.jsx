import { useEffect, useRef, useState } from 'react';
import { DemoContext } from './context.jsx';
import { PROFILES, STORAGE_KEY, command, createSeed, isSupplier } from './domain.js';
import { Alert, Button, Icon, IconButton, Modal, Pill, Select } from './components.jsx';
import { TemplateList, TemplateEditor } from './Templates.jsx';
import { RegistrationList, RegistrationDetail } from './Registrations.jsx';
import { AvailableTemplates, InviteForm, InviteList } from './Invites.jsx';

function readDB() { try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (v?.version === 1 && v.templates?.length && v.registrations && v.invites && v.access) return v; } catch {} return createSeed(); }
function readContext() { try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}-context`)) || {}; } catch { return {}; } }

export default function App() {
  const initial = useRef(readContext());
  const [db, setDB] = useState(readDB), ref = useRef(db);
  const [profileId, setProfileId] = useState(initial.current.profile || 'admin');
  const [tenant, setTenant] = useState(initial.current.tenant || 'Koch');
  const profile = PROFILES.find(p => p.id === profileId) || PROFILES[0], supplier = isSupplier(profile);
  const [route, setRoute] = useState({ page: 'registrations' }), [dirty, setDirty] = useState(false), [pending, setPending] = useState(null);
  const [toast, setToast] = useState(null), [modal, setModal] = useState(null), [inviteTemplate, setInviteTemplate] = useState(null);
  const [failSave, setFailSave] = useState(false), failRef = useRef(false), [storageError, setStorageError] = useState(false);
  useEffect(() => { ref.current = db; try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); setStorageError(false); } catch { setStorageError(true); } }, [db]);
  useEffect(() => { try { localStorage.setItem(`${STORAGE_KEY}-context`, JSON.stringify({ profile: profileId, tenant })); } catch {} }, [profileId, tenant]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const guard = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard); }, [dirty]);
  function notify(message, tone = 'success') { setToast({ message, tone, id: Date.now() }); }
  function apply(type, payload = {}, message) {
    if (type === 'SAVE' && failRef.current) { failRef.current = false; setFailSave(false); notify('Falha simulada ao salvar. Os dados continuam na tela. Tente novamente.', 'error'); return null; }
    try {
      const next = command(ref.current, type, payload, profile, tenant); ref.current = next; setDB(next); if (message) notify(message); return next;
    } catch (e) { notify(e.message, 'error'); return null; }
  }
  function guard(action) { if (dirty) setPending(() => action); else action(); }
  function navigate(page, id) { guard(() => { setDirty(false); setRoute({ page, id }); }); }
  function changeProfile(id) { guard(() => { setDirty(false); setProfileId(id); setRoute({ page: 'registrations' }); }); }
  function changeTenant(name) { guard(() => { setDirty(false); setTenant(name); setRoute({ page: 'registrations' }); }); }
  const navigation = supplier ? [{ page: 'available', label: 'Fichas disponíveis', icon: 'LayoutTemplate' }, { page: 'registrations', label: 'Meus cadastros', icon: 'Package' }] : [{ page: 'registrations', label: 'Cadastros recebidos', icon: 'Package' }, { page: 'templates', label: 'Fichas de cadastro', icon: 'LayoutTemplate' }, { page: 'invites', label: 'Convites', icon: 'Mail' }];
  const activeNav = route.page === 'detail' ? 'registrations' : route.page === 'editor' ? 'templates' : route.page;
  const crumb = navigation.find(n => n.page === activeNav)?.label || 'Cadastro de produtos';
  const value = { db, profile, tenant, supplier, apply, notify, navigate, setDirty, dirty, invite: id => setInviteTemplate(id), route };
  return <DemoContext.Provider value={value}><div className={`app ${supplier ? 'alliance' : 'sense-hub'}`}>
    <div className="demo-bar"><div className="demo-label"><span className="live-dot" /><strong>Ambiente de demonstração</strong><span className="demo-separator" />Dados fictícios · salvos neste navegador</div><div className="demo-controls"><label htmlFor="demo-profile">Perfil</label><select id="demo-profile" value={profileId} onChange={e => changeProfile(e.target.value)}>{PROFILES.map(p => <option value={p.id} key={p.id}>{p.role}</option>)}</select><button onClick={() => setModal('guide')}><Icon name="CircleHelp" size={14} />Roteiro</button><details className="demo-settings"><summary aria-label="Opções da demonstração"><Icon name="Settings2" size={15} /></summary><div><button onClick={e => { e.currentTarget.closest('details').open = false; failRef.current = true; setFailSave(true); notify('O próximo salvamento vai simular uma falha.', 'info'); }}>Simular falha ao salvar</button><button onClick={e => { e.currentTarget.closest('details').open = false; setModal('reset'); }}>Reiniciar demonstração</button></div></details></div></div>
    <header className="app-header"><button className="wordmark" aria-label="Sales Sense, ir para cadastros" onClick={() => navigate('registrations')}><span>sales<span className="wordmark-sense">sense</span><span className="wordmark-point">.</span></span><small>{supplier ? 'ALLIANCE' : 'PLATAFORMA'}</small></button><span className="header-divider" /><nav aria-label="Navegação principal">{navigation.map(n => <button key={n.page} className={activeNav === n.page ? 'active' : ''} onClick={() => navigate(n.page)}><Icon name={n.icon} size={17} />{n.label}<Icon name="ChevronDown" size={12} /></button>)}</nav><div className="header-account"><div className="tenant-select"><span>Varejista</span><Select label="Varejista selecionado" value={tenant} onChange={changeTenant} options={['Koch', 'Prado']} /></div><span className="header-divider" /><div className="user-avatar">{profile.initials}</div><div className="user-name"><strong>{profile.name}</strong><span>{supplier ? 'Fornecedor Exemplo Ltda.' : profile.level}</span></div></div></header>
    <div className="breadcrumb"><button onClick={() => navigate('registrations')}>Início</button><Icon name="ChevronRight" size={12} /><span>Cadastro de produtos</span><Icon name="ChevronRight" size={12} /><button onClick={() => navigate(activeNav)}>{crumb}</button>{['editor', 'detail'].includes(route.page) && <><Icon name="ChevronRight" size={12} /><strong>{route.page === 'editor' ? 'Configuração da ficha' : 'Detalhes do cadastro'}</strong></>}<span className="workspace-label"><span className="tenant-dot" />{tenant} · {supplier ? 'Visão do fornecedor' : 'Operação do varejista'}</span></div>
    {storageError && <div className="global-alert"><Alert tone="warning">O armazenamento do navegador está indisponível. Os dados estão mantidos nesta sessão; exporte antes de fechar.</Alert></div>}
    {failSave && <div className="simulation-notice"><Icon name="Info" size={14} />Simulação ativada: o próximo salvamento apresentará um erro recuperável.<button onClick={() => { failRef.current = false; setFailSave(false); }}>Desativar</button></div>}
    <main className="main-content" key={`${profileId}-${tenant}-${route.page}-${route.id || ''}`}>
      {route.page === 'registrations' && <RegistrationList />}
      {route.page === 'detail' && <RegistrationDetail id={route.id} />}
      {route.page === 'templates' && !supplier && <TemplateList />}
      {route.page === 'editor' && !supplier && <TemplateEditor id={route.id} />}
      {route.page === 'available' && supplier && <AvailableTemplates />}
      {route.page === 'invites' && !supplier && <InviteList />}
    </main>
    <footer className="app-footnote"><span>Sales Sense · Cadastro de produtos</span><span><Icon name="ShieldCheck" size={12} />Protótipo local · nenhuma operação real</span></footer>
    {toast && <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'} key={toast.id}><Icon name={toast.tone === 'error' ? 'TriangleAlert' : toast.tone === 'info' ? 'Info' : 'CheckCircle2'} size={20} /><span>{toast.message}</span><IconButton icon="X" label="Fechar notificação" onClick={() => setToast(null)} /></div>}
    {pending && <Modal title="Sair sem salvar?" subtitle="Há alterações que ainda não foram salvas." onClose={() => setPending(null)} footer={<><Button variant="secondary" onClick={() => setPending(null)}>Continuar editando</Button><Button variant="danger" onClick={() => { const fn = pending; setPending(null); setDirty(false); fn(); }}>Descartar alterações</Button></>}><p>As alterações salvas anteriormente serão preservadas.</p></Modal>}
    {inviteTemplate && <InviteForm templateId={inviteTemplate} onClose={() => setInviteTemplate(null)} />}
    {modal === 'reset' && <Modal title="Reiniciar demonstração?" onClose={() => setModal(null)} footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button><Button variant="danger" onClick={() => { const next = createSeed(); ref.current = next; setDB(next); setDirty(false); setProfileId('admin'); setTenant('Koch'); setRoute({ page: 'registrations' }); setModal(null); notify('Dados de exemplo restaurados.'); }}>Reiniciar</Button></>}><p>Os dados e alterações locais serão substituídos pelos exemplos iniciais.</p></Modal>}
    {modal === 'guide' && <Modal title="Um cadastro, do início ao fim" subtitle="Explore os dois lados do processo no mesmo ambiente." wide onClose={() => setModal(null)} footer={<><Button variant="secondary" onClick={() => setModal(null)}>Explorar livremente</Button><Button icon="ArrowRight" onClick={() => { setModal(null); changeProfile('representante'); }}>Começar como representante</Button></>}><div className="guide-intro"><Pill tone="blue" icon="Clock3">Roteiro de demonstração</Pill><p>Alterne o perfil na faixa superior para continuar cada atividade.</p></div><ol className="guide-list">{[
      ['Prepare a ficha', 'Administrador → Fichas de cadastro. Edite um rascunho, confira permissões, publique e convide rafael@example.com.'],
      ['Cadastre um produto', 'Representante → Fichas disponíveis → Cadastrar produto. Preencha e envie Dados básicos.'],
      ['Confira em Compras', 'Compras → abra o produto. Preencha a etapa, envie para análise e aprove.'],
      ['Peça um ajuste no Fiscal', 'Fiscal → preencha NCM e origem, envie para análise e solicite correção de um campo de Dados básicos.'],
      ['Corrija no Alliance', 'Representante → Corrigir. Somente os campos solicitados ficam editáveis. Reenvie a correção.'],
      ['Retome com outra pessoa', 'Fiscal (outro usuário) → a mesma análise está disponível. Confira e aprove.'],
      ['Conclua o ciclo', 'Representante → preencha Complemento e envie. Compras → conclua Encerramento. O produto ficará Aprovado.'],
    ].map(([title, text], i) => <li key={title}><span>{i + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol><Alert>Para testar o retorno imediatamente, use o produto “Café torrado 500 g”, já em análise no Fiscal. O perfil de consulta permite conferir a interface sem ações de edição.</Alert></Modal>}
  </div></DemoContext.Provider>;
}
