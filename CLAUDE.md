# GoFlow — Contexto para Claude Code

GoFlow é uma PWA (Progressive Web App) mobile-first para interagir com o gateway LLM da CI&T (`flow.ciandt.com`). Construída com React/Vite e deployada na Vercel. O projeto foi inteiramente desenvolvido via Cursor AI — este arquivo preserva todas as decisões, convenções e contexto acumulado.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite 5 |
| Estilo | CSS puro (`src/App.css`) — sem Tailwind, sem CSS Modules |
| Storage | IndexedDB via `idb` (sem backend de dados) |
| PWA | `vite-plugin-pwa` + Workbox |
| Deploy | Vercel (auto-deploy do branch `main` em `github.com/viniciusrv-cit/goflow`) |
| Serverless | Vercel Functions em `api/chat.js` e `api/models.js` |

---

## Comandos

```bash
npm install       # instalar dependências
npm run dev       # servidor local (localhost:5173)
npm run build     # build de produção para dist/
npm run preview   # preview do build local
```

**Deploy:** push para `main` → Vercel faz deploy automático.

---

## Arquitetura

### Navegação (mobile-first, sem router)

A app tem dois "screens" gerenciados por estado em `ChatWindow.jsx`:

- `view === 'list'` → tela inteira com lista de conversas
- `view === 'chat'` → tela inteira com a conversa ativa

**Android back button:** ao entrar no chat, `window.history.pushState()` cria uma entrada de history. O listener `popstate` captura o botão Voltar do Android e navega para a lista. O botão `←` usa `suppressPopstate` para navegar imediatamente sem aguardar o popstate.

### Fluxo de dados

```
ProfileSelector → App.jsx → ChatWindow.jsx
                                ├── ConversationList (lista)
                                └── Chat screen (mensagens + input)
```

- Profiles, conversas, templates, contextos: persistidos em **IndexedDB** via `src/services/profileService.js`
- Requests LLM: `src/services/apiService.js` → proxy Vercel `/api/chat`
- Diagnósticos: `src/services/gatewayDiagnostics.js` + `GatewayDiagnostics.jsx`

### Gateway LLM

- Endpoint: `https://flow.ciandt.com/flow-llm-proxy/v1/`
- Autenticação: Bearer token (JWT rotativo — o usuário configura no profile)
- Formato: compatível com OpenAI Chat Completions
- `max_tokens` é **sempre obrigatório** mesmo para modelos sem suporte a temperature
- Erros HTTP 400 têm mensagem aninhada em JSON string dentro de `error.message` — veja `parseGatewayError()` em `apiService.js`
- HTTP 500 faz retry automático (2 tentativas, backoff 2s/4s)
- Latência típica: 5–50s dependendo do payload

---

## Estrutura de arquivos

```
goflow/
├── api/
│   ├── chat.js          # Vercel Function: proxy para gateway LLM
│   └── models.js        # Vercel Function: lista de modelos disponíveis
├── src/
│   ├── App.jsx           # Root: gerencia profile ativo, roteamento de telas
│   ├── App.css           # Todos os estilos (CSS custom properties)
│   ├── main.jsx          # Entrypoint React
│   ├── components/
│   │   ├── ChatWindow.jsx        # Orquestrador principal (lista + chat)
│   │   ├── ConversationList.jsx  # Lista simples de conversas (sem menu)
│   │   ├── ChatInput.jsx         # Textarea + toolbar (sem Enter para enviar)
│   │   ├── MessageBubble.jsx     # Bolha de mensagem com copy/share
│   │   ├── ProfileSelector.jsx   # Criação e seleção de profiles
│   │   ├── ProfileIndicator.jsx  # Badge de profile no header
│   │   ├── Settings.jsx          # Edição de profile + parâmetros
│   │   ├── ModelPicker.jsx       # Seletor dinâmico de modelos do gateway
│   │   ├── ProgressBar.jsx       # Barra de progresso durante request
│   │   ├── PreviewModal.jsx      # Preview/edição antes de enviar (templates, arquivos)
│   │   ├── TemplateManager.jsx   # CRUD de templates de prompt
│   │   ├── ContextLibrary.jsx    # Biblioteca de contextos versionados
│   │   ├── FileImport.jsx        # Import de .txt, .md, .pdf, .docx
│   │   ├── GatewayDiagnostics.jsx # Tela de diagnóstico do gateway
│   │   ├── TagSelector.jsx       # (inativo — tags removidas da UI)
│   │   ├── ThemeSettings.jsx     # (inativo — tema/fonte removidos da UI)
│   │   └── Menu.jsx              # Menu dropdown global (Settings, Diagnóstico)
│   └── services/
│       ├── profileService.js     # IndexedDB: profiles, conversas, templates, etc.
│       ├── apiService.js         # Chamadas ao gateway com retry e latency tracking
│       └── gatewayDiagnostics.js # Testes T1-T4 do gateway
├── public/
│   └── manifest.json    # PWA manifest (gerado via vite-plugin-pwa)
├── vercel.json           # Config Vercel (SPA rewrite)
├── vite.config.js        # Build config + PWA plugin
└── CLAUDE.md             # Este arquivo
```

---

## Profile — campos

```js
{
  id, name, baseUrl, token,   // conexão
  model,                       // ex: "anthropic.claude-4-6-sonnet"
  useAdvancedParams: true,     // se false: só envia model + messages + max_tokens
  temperature: 0.7,            // só enviado se useAdvancedParams === true
  maxTokens: 4096,             // sempre enviado (obrigatório)
  systemPrompt: '',            // só enviado se useAdvancedParams === true
  createdAt
}
```

`useAdvancedParams: false` é necessário para modelos como `claude-sonnet-5` que não suportam `temperature`.

---

## Convenções de código

- **Sem TypeScript** — projeto usa JS puro (`.jsx`, `.js`)
- **Sem comentários óbvios** — comentar apenas intenções não-óbvias
- **CSS custom properties** definidas em `:root` no `App.css`
- **Menus/dropdowns** usam padrão `menu-backdrop` (div fixed transparente) para fechar ao clicar fora — nunca adicionar `document.addEventListener` para fechar menus
- **Formulários** em Settings têm `form-actions` com `position: sticky; bottom: 0` para ficarem sempre visíveis
- **Navegação** — toda mudança de `view` passa por `goToChat()` ou `goToListInternal()` em `ChatWindow.jsx`, nunca setar `setView` diretamente
- **Enter no textarea** — nunca enviar mensagem com Enter; envio é exclusivo pelo botão

---

## Decisões de produto registradas

| Item | Decisão |
|---|---|
| Pending requests | **Opção A**: um request por vez; bloqueia envio nas demais conversas |
| Tema escuro | Removido da UI — ilegível; reintroduzir só com WCAG AA validado |
| Ajuste de fonte | Removido da UI — não funcional; reintroduzir via CSS variables |
| Tags | Removidas da UI — código de suporte existe, reativar quando o fluxo completo estiver pronto |
| Navegação mobile | Full-screen (lista → chat), não sidebar |
| Opções por conversa | Apenas no `⋮` dentro da tela do chat; a lista de conversas não tem menu por item |

---

## Backlog — status

### Implementados (✅)
- P0: Retry automático, estado pending por conversa, barra de progresso, erro de gateway parseado
- P1: Import de arquivo (txt/md/pdf/docx), copy/share de mensagem, preview antes de enviar
- P2: Organização (pin, archive, duplicate, export .md), busca de conversas
- P3: Templates de prompt, biblioteca de contextos versionados
- P4: Diagnóstico de gateway (T1-T4: latência, erros, payload, sessão), profile com parâmetros

### Pendentes (backlog original — itens 12, 20)
- **Item 12 — Tags**: agrupamento por projeto/cliente, filtro por tag. Código base existe (`tagService`, `TagSelector.jsx`). Reativar quando o fluxo completo estiver funcional.
- **Item 20 — Tema/fonte**: dark mode com contraste WCAG AA, ajuste de fonte via CSS variables com persistência.

---

## Banco de dados IndexedDB

DB: `goflow-db` versão 2. Stores:

| Store | Descrição |
|---|---|
| `profiles` | Profiles de conexão |
| `conversations` | Conversas com array de mensagens embutido |
| `templates` | Templates de prompt |
| `contextLibrary` | Contextos versionados |
| `latencyHistory` | Histórico de latência por profile |
| `pendingRequests` | Requests pendentes (crash recovery) |
| `settings` | Configurações globais (key-value) |
| `tags` | Tags para conversas (inativo na UI) |

---

## GitHub

Repositório: `https://github.com/viniciusrv-cit/goflow`  
Branch principal: `main` (deploy automático na Vercel)

```bash
git add -A
git commit -m "mensagem"
git push
```

**Nota:** o PowerShell no Windows não suporta `&&` — usar `;` ou comandos separados.

---

## Versão atual: v1.1.1
