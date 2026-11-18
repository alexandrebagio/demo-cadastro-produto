# Protótipo React — cadastro de produtos

Protótipo interativo preparado em **17/11/2026**, seguindo os ERs, o BPMN e o [roteiro para o Lovable](../sense-hub/prototipo-lovable/prompt-lovable.md). As visões do varejista e do representante utilizam o mesmo estado local, com telas e permissões diferentes.

## Abrir sem instalar

Abra **[prototipo.html](prototipo.html)** no Chrome ou Edge. O arquivo contém o React compilado, os ícones e o CSS; não precisa de servidor ou instalação. O carregamento das fontes web é opcional: sem internet, a interface utiliza as fontes alternativas do sistema.

Os dados são salvos no armazenamento do navegador. A visualização por arquivo e a visualização por servidor possuem armazenamentos separados. Para restaurar os exemplos iniciais, use a engrenagem na faixa superior e **Reiniciar demonstração**.

## Executar o projeto React

Requer Node.js 20.19 ou superior. Nesta pasta, execute:

```powershell
npm ci
npm run dev
```

Acesse **http://127.0.0.1:5176**. No Windows, também é possível abrir [iniciar.cmd](iniciar.cmd), que instala as dependências se necessário e inicia o servidor com abertura do navegador. Encerre com `Ctrl+C` no terminal.

```powershell
npm test
npm run build
```

O build gera `dist/` para servir por HTTP e atualiza `prototipo.html`, a versão portátil. Não abra `dist/index.html` diretamente por arquivo; use a versão portátil para isso.

## O que está disponível

- Navegação horizontal, breadcrumb, temas do Alliance/Sense Hub, tabelas compactas, filtros, ordenação, paginação e painel de detalhes.
- Alternância de perfis na faixa de demonstração e seleção dos varejistas Koch/Prado.
- Listagem de fichas, criação, cópia com origem, edição, validação e publicação.
- Editor de etapas e campos com reordenação, propriedades, obrigatoriedade, ajuda, máscaras simples e condições de visibilidade/edição.
- Pré-visualização funcional: marque **Produto orgânico** para liberar a certificação.
- Tipos texto, texto longo, número, seleção, booleano, data, arquivo e tabela repetida de embalagens.
- Matriz de consulta/edição/aprovação por etapa e nível.
- Bloqueio da estrutura no primeiro cadastro iniciado, com alteração posterior por cópia.
- Convites, elegibilidade simulada, regularização e revogação.
- Fichas disponíveis e cadastros por produto no Alliance.
- Salvamento de rascunho, envio, validação, análise, aprovação, não aprovação e conclusão de etapas sem aprovação.
- Correção com motivo, seleção de campos, passagem própria e retorno à análise do setor solicitante.
- Histórico com autor, ações, estados, snapshots e comparação de campos, filtrado para a visão do fornecedor.
- Persistência local, proteção ao sair com alterações, erro de salvamento simulável e exportação CSV da listagem filtrada.
- Layout móvel, modais com foco e teclado, estados vazios e avisos de acesso indisponível.

As cores e a estrutura visual foram baseadas nos componentes locais dos frontends `alliance-front-react` e `sense-hub-front-react`, conforme [referências de layout](../sense-hub/prototipo-lovable/referencias-layout.md). A identidade está representada pelo nome em texto; não há novo logotipo gráfico.

## Roteiro curto: correção e retorno a outro usuário do setor

1. Na faixa superior, selecione **Varejista — Fiscal**.
2. Abra **Café torrado 500 g**, protocolo `FP-2026-0142`, já em análise.
3. Clique em **Solicitar correção**, marque **Descrição do produto**, informe um motivo e confirme.
4. Troque para **Fornecedor — representante**, abra o mesmo produto e ajuste a descrição. Os outros campos estarão bloqueados.
5. Salve e clique em **Reenviar correção**. A passagem de correção é concluída, e a análise Fiscal original volta a ser a atividade atual, em `E`.
6. Selecione **Varejista — Fiscal (outro usuário)**. Bruno pode conferir e aprovar, embora Ana tenha solicitado o ajuste.
7. Troque para o representante, preencha/envie **Complemento** e depois use **Varejista — Compras** para concluir **Encerramento**.
8. Confira o cadastro aprovado e o histórico preservado.

A entrega de uma correção não aprova automaticamente o Fiscal e não refaz Compras. Novos pedidos de correção criam novas passagens.

## Roteiro completo: criar ficha e produto

1. Como **administrador**, abra **Fichas de cadastro** e crie uma ficha ou copie um modelo.
2. Configure etapas, campos e permissões; confira a prévia e publique.
3. Convide `rafael@example.com`, mantendo **Fornecedor Exemplo Ltda.** e a condição de cadastro/contratação aptos.
4. Como **representante**, abra **Fichas disponíveis**, localize a nova ficha e inicie um produto.
5. Preencha os Dados básicos. Use, por exemplo, GTIN `7890000000017`, marca, unidade `UN` e categoria `Mercearia`. Salve e envie.
6. Como **Compras**, preencha categoria mercadológica e custo, envie para análise e aprove.
7. Como **Fiscal**, preencha NCM `09012100` e origem, envie para análise e aprove ou solicite correção.
8. Como representante, preencha as embalagens em **Complemento** e envie.
9. Como Compras, conclua **Encerramento**.

Há um roteiro disponível também pelo botão **Roteiro** na faixa superior.

## Perfis e dados de exemplo

| Perfil | Pessoa | Finalidade |
|---|---|---|
| Administrador | Marina Costa | Configurar modelos, convites e operar as etapas autorizadas. |
| Compras | Lucas Santos | Preencher e decidir nas etapas de Compras. |
| Fiscal | Ana Oliveira | Preencher, analisar e pedir correções no Fiscal. |
| Fiscal — outro usuário | Bruno Lima | Demonstrar a responsabilidade do setor na retomada. |
| Consulta | Carla Souza | Consultar sem editar ou decidir. |
| Representante | Rafael Martins | Acesso liberado por `rafael@example.com`. |
| Cadastro pendente | Paula Almeida | Demonstrar regularização por `paula@example.com`. |

Na tela **Convites**, a administração pode simular a regularização de Paula. Revogar seu convite remove a liberação no Alliance, preservando os dados. E-mails, CPF/CNPJ, arquivos e empresas fornecedoras são referências demonstrativas.

## Estados e convenções

Os códigos são `R` Rascunho, `C` Correção, `E` Em análise, `F` Finalizado, `A` Aprovado e `N` Não aprovado. O status do cadastro principal é separado do estado de cada passagem.

Nesta demonstração, o cadastro termina em `A` quando conclui o fluxo com aprovações exigidas e em `F` quando o fluxo não exige aprovação. Essa convenção foi apresentada como proposta no BPMN. A regra está centralizada na função `advance` de `src/domain.js`.

O histórico demonstra `CRIACAO`, `SALVAMENTO`, `ENVIO`, `APROVACAO`, `REPROVACAO`, `DEVOLUCAO`, `FINALIZACAO` e `RETOMADA`. A abertura e a retomada foram incluídas como eventos propostos. `RETOMADA` pode ser `E → E`.

## Estrutura do projeto

| Arquivo | Responsabilidade |
|---|---|
| `src/domain.js` | Dados de exemplo, permissões simuladas, validações e comandos de workflow. |
| `src/App.jsx` | Contextos, navegação, persistência, notificações e demonstração. |
| `src/Templates.jsx` | Listagem e editor de fichas. |
| `src/Invites.jsx` | Convites e fichas disponíveis ao representante. |
| `src/Registrations.jsx` | Listagem, detalhes, preenchimento, decisões e correção. |
| `src/components.jsx` | Componentes compartilhados, campos e histórico. |
| `src/styles.css` | Tokens visuais, layouts e responsividade. |
| `tests/domain.test.js` | Testes de regras e transições. |
| `scripts/qa.cjs` | Verificação navegável com Puppeteer e Chrome externos. |
| `scripts/portable.mjs` | Montagem do HTML portátil a partir do build. |

## Verificação realizada

- **16 testes de domínio aprovados**, cobrindo o ciclo completo, correções sucessivas, snapshots, campos restritos, elegibilidade, revogação, permissões, isolamento por varejista e repetição de comandos.
- **12 verificações no navegador**, incluindo o ciclo completo pela interface, retomada por outro Fiscal, falha de salvamento com recuperação, editor/publicação/convite, persistência após recarga, regularização/revogação e visualização móvel de 390 px.
- HTML portátil aberto e utilizado diretamente por `file://`, com persistência do contexto após recarregar.
- Build de produção concluído e nenhuma exceção JavaScript durante a verificação navegável.

As capturas e o relatório da execução ficam em `artifacts/`. O script de navegador recebe o caminho de uma instalação de Puppeteer e o executável do Chrome:

```text
node scripts/qa.cjs "<caminho-do-modulo-puppeteer>" "<caminho-do-chrome.exe>"
```

Execute o servidor de desenvolvimento antes desse script. Puppeteer não é dependência de execução do aplicativo. O navegador automatizado usa seu próprio contexto e restaura os exemplos na origem HTTP ao terminar; não usa o perfil pessoal do usuário.

## Limites do protótipo

O protótipo é uma demonstração de frontend: os perfis, permissões, convites e assinaturas são simulados no navegador. Não substitui autorização de servidor e não deve receber dados reais. Não consulta APIs de negócio, schemas, ERP ou serviços de e-mail.

Os anexos guardam somente nome/tamanho; o conteúdo não é persistido. As regras dos campos são uma implementação representativa do roteiro, não o motor completo do contrato JSON. A gestão de usuários/níveis utiliza os perfis de exemplo, sem um CRUD de usuários. Etapas de aprovação pertencem ao varejista nesta primeira demonstração, e o fluxo inicia pelo fornecedor.

Os dados são privados ao navegador/origem utilizados: não há sincronização entre computadores ou colaboração simultânea. As garantias de repetição/concorrência demonstram o comando local; transações e idempotência distribuídas precisam ser implementadas no backend real.
