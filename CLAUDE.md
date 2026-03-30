# HomeManager Mobile — CLAUDE.md

> Documento de referência para o Claude Code.
> Actualizar no final de cada tarefa relevante.
> Última actualização: 2026-03-30

## 1. Visão Geral

App mobile de gestão doméstica — versão nativa do HomeManager Web.
Consome a mesma API .NET 10. Autenticação via Supabase (JWT partilhado com o web).

## 2. Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React Native via Expo SDK 54 |
| Linguagem | TypeScript |
| Navegação | Expo Router 6 (file-based) |
| Auth | Supabase JS + AsyncStorage (sessão) |
| HTTP | fetch() nativo via wrapper api.ts |
| Câmara | expo-image-picker |
| Build cloud | EAS Build (free tier, 30 builds/mês) |
| Dev | Expo Go no telemóvel físico |

## 3. Dependências principais

| Pacote | Versão |
|--------|--------|
| expo | ~54.0.33 |
| expo-router | ~6.0.23 |
| react | 19.1.0 |
| react-native | 0.81.5 |
| react-native-reanimated | ~4.1.1 |
| react-native-worklets | 0.5.1 |
| @supabase/supabase-js | ^2.99.2 |
| @react-native-async-storage/async-storage | 2.2.0 |
| expo-secure-store | ~15.0.8 |
| expo-image-picker | ~17.0.10 |
| expo-camera | ~17.0.10 |
| expo-image | ~2.0.0 |
| lucide-react-native | 0.475.0 |
| react-native-svg | 15.12.1 |
| @expo-google-fonts/nunito | latest |
| expo-splash-screen | ~0.29.x |

## 4. Estrutura de Pastas

```
HomeManager.Mobile/
├── app/
│   ├── _layout.tsx              ← Layout raiz — monta AuthProvider + HouseholdProvider + AuthGuard + Slot. Zero lógica de navegação.
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Stack sem header
│   │   └── login.tsx            ← Login + Registo + confirmação email
│   └── (app)/
│       ├── _layout.tsx          ← header + tab navigator (ícones Lucide); consome useHousehold() do contexto externo; useFocusEffect com isMounted ref para não disparar refreshHouseholds na primeira montagem
│       ├── dashboard.tsx        ← Dashboard (placeholder)
│       ├── household-setup.tsx  ← Criar / entrar em household
│       ├── profile.tsx          ← Ecrã de perfil (nome editável, email read-only)
│       └── inventory/
│           ├── index.tsx        ← Container com abas Pertences / Despensa
│           ├── pertences.tsx    ← Lista agrupada por local com toolbar, histórico, ownerName
│           ├── despensa.tsx     ← Placeholder "Em breve"
│           └── item-form.tsx    ← Modal criar/editar item (câmara, dono, dar saída)
├── components/
│   ├── AuthGuard.tsx            ← routing via useEffect + router.replace; usa session + hasHousehold; redireciona para household-setup se sem casa; esconde splash screen após primeira decisão de routing
│   ├── ItemMenuProvider.tsx     ← Modal do menu contextual, consome ItemMenuContext; envolve listas
│   └── inventory/
│       ├── SearchBar.tsx
│       ├── DestinationFilter.tsx
│       ├── LocationGroupCard.tsx
│       ├── InventoryItemRow.tsx
│       └── modals/
│           ├── AddLocationModal.tsx
│           ├── EditLocationModal.tsx
│           └── DeleteLocationConfirmModal.tsx
├── contexts/
│   ├── AuthContext.tsx          ← AuthProvider + useAuth hook; sessão via onAuthStateChange; expõe session + loading
│   ├── HouseholdContext.tsx     ← HouseholdProvider + useHousehold; carrega households quando há sessão; hasHousehold: boolean|null; limpa no logout
│   └── ItemMenuContext.tsx      ← estado do menu contextual genérico (openMenu/closeMenu + useItemMenuState)
├── constants/
│   ├── colors.ts
│   ├── config.ts
│   └── destinations.ts          ← Destination const+type, metadados, opções centralizadas
```

**Fontes do design system** (carregadas em `app/_layout.tsx` via `useFonts`):
- `Nunito_800ExtraBold` — títulos/logo principal
- `Nunito_700Bold` — subtítulos/labels do logo

**Splash screen**: `backgroundColor: #f2ece0`; `SplashScreen.preventAutoHideAsync()` chamado no root layout; splash é escondida no `AuthGuard` após a primeira decisão de routing (via `useRef splashHidden` para garantir uma única chamada) — evita flash de tela branca durante verificação da sessão Supabase e garante que o redirect já está determinado antes de mostrar o ecrã.

```
├── hooks/
│   └── useInventory.ts          ← items, locations, historyItems, loadData, loadHistory
├── services/
│   ├── api.ts                   ← fetch wrapper; authTokenGetter + signOutHandler injetáveis; 401 chama signOutHandler automaticamente
│   ├── auth.service.ts          ← Supabase auth; injecta token getter em api.ts; refresh proativo quando token expira em < 60s (singleton promise)
│   ├── storage.service.ts       ← URLs assinadas + upload Supabase Storage
│   ├── household.service.ts     ← getMyHouseholds, getHousehold, createHousehold, joinHousehold
│   ├── inventory.service.ts     ← CRUD + resolveItem + restoreItem + getResolvedItems
│   ├── location.service.ts
│   └── user.service.ts          ← getMe, updateMe
└── types/
    ├── api-response.ts
    ├── household.ts             ← Household + HouseholdUser (com user: { id, name, email })
    ├── inventory-item.ts        ← InventoryItem com ownerId, ownerName, status, resolvedAt
    ├── location.ts
    └── user.ts                  ← UserProfile
```

## 5. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| EXPO_PUBLIC_API_URL | URL base do backend .NET |
| EXPO_PUBLIC_SUPABASE_URL | URL do projecto Supabase |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Chave anónima Supabase |

## 6. Regras de Desenvolvimento

- Branch principal é `main` — push após cada tarefa
- SEMPRE usar `npx expo install` para pacotes nativos
- `npm install` apenas para JS puro (ex: @supabase/supabase-js)
- `.npmrc` tem `legacy-peer-deps=true` — não remover
- Não alterar app.json, eas.json, .npmrc, package.json sem razão explícita
- UI em Português (PT). Código em Inglês.
- Manter este ficheiro actualizado no final de cada tarefa

## 7. Comandos

```bash
npx expo start          # dev com QR code
npx expo start --clear  # dev limpando cache Metro (usar após mudanças de dependências nativas)
npx expo-doctor         # validar dependências
eas build --platform android --profile preview  # APK para testar
```

## 8. Gotchas React Native (bugs já encontrados)

| Problema | Causa | Solução aplicada |
|----------|-------|-----------------|
| `crypto.randomUUID()` não existe | API Web não disponível no RN | `Date.now() + Math.random().toString(36).substring(2,10)` |
| Upload Supabase Storage falha com "Network request failed" | SDK não aceita `Blob` no RN | Usar `response.arrayBuffer()` em vez de `response.blob()` |
| SecureStore com chunks corrompida em background | Escritas não atómicas quando iOS suspende o app a meio do refresh token | Migrado para `AsyncStorage` (atómico, sem limite de tamanho) + `AppState` listener para `stopAutoRefresh` em background |
| `supabase.auth.signOut()` bloqueia indefinidamente | `refreshSession()` no boot mantém o lock interno do Supabase | Não chamar `refreshSession()` no boot — usar apenas `getSession()` |
| lucide-react-native v1.0.1 quebrado | `dist/cjs/lucide-react-native.js` era directório em vez de ficheiro | Fixado na versão 0.475.0 |
| Sessão expirada deixava app em estado intermédio sem redirect para login | Estado de auth e households misturado no mesmo contexto criava condições de corrida | Separado em `AuthProvider` (sessão pura via `onAuthStateChange`) + `HouseholdProvider` (carrega quando há sessão) + `AuthGuard` (`useEffect` + `router.replace` com guards por `authLoading`/`householdLoading`) |
| Menu contextual desalinhado e cortado em itens no fundo do ecrã | `measure` devolve `pageY` incluindo a status bar; sem lógica de flip quando o espaço abaixo é insuficiente | Subtrair `STATUS_BAR_HEIGHT` ao `pageY`; calcular `spaceBelow` vs `menuEstimatedHeight` — se insuficiente, abrir acima do item (`opensAbove`) |
| Splash screen mostrada antes do redirect estar determinado | `SplashScreen.hideAsync()` em `_layout.tsx` disparava quando auth/fontes carregavam, antes do AuthGuard decidir o destino | Movido `hideAsync()` para `AuthGuard` com `useRef splashHidden` — só esconde após a primeira decisão de routing |

## 9. Diferenças vs Web (Angular)

| Aspecto | Web | Mobile |
|---------|-----|--------|
| Estado | Signals | useState + hooks |
| HTTP | HttpClient + interceptor | fetch() + api.ts |
| Auth storage | localStorage | AsyncStorage (sessão Supabase) |
| Câmara | input[capture] problemático | expo-image-picker nativo |
| Routing | Angular Router | Expo Router file-based |
| Styling | Tailwind v4 | StyleSheet.create() |
| Listas longas | *ngFor | FlatList (virtualizado) |
| Modais | div absoluta | Modal RN |

## 10. Estado Actual

### Feito
- Projecto Expo SDK 54 funcional (validado com expo-doctor)
- EAS configurado
- .npmrc com legacy-peer-deps=true
- Serviços: api.ts, auth.service.ts, inventory.service.ts,
  location.service.ts, household.service.ts, storage.service.ts
- Tipos TypeScript: Household + HouseholdUser, Location, InventoryItem
  (com ownerId, ownerName, status, resolvedAt), ApiResponse
  — categorias removidas (sem category.service.ts nem types/category.ts)
- Navegação base com Expo Router (root layout com auth + household redirect)
- Design system alinhado com o web (Colors + StyleSheet)
- .env configurado localmente, .env.example no repo
- Sessão Supabase via AsyncStorage (substituiu SecureStore + chunking)
- AppState listener — stopAutoRefresh em background, startAutoRefresh em foreground
- Arquitetura de auth/routing refatorada:
  - `AuthProvider` — sessão pura via `onAuthStateChange`, expõe `session` + `loading`
  - `HouseholdProvider` — carrega households quando há sessão; `hasHousehold: boolean|null`; limpa estado no logout
  - `AuthGuard` — `useEffect + router.replace`; guards com `authLoading`/`householdLoading`; redireciona para `household-setup` quando sem casa
  - `api.ts` — `authTokenGetter`/`signOutHandler` injetáveis; 401 faz signOut automático
  - `auth.service.ts` — refresh proativo quando token expira em < 60s (singleton promise para evitar race)
- Ecrã de Login/Registo com confirmação de email
- Household Setup — criar ou entrar via código de convite
- Shell da app: header com seletor de household (+ adicionar casa),
  avatar com logout, tab bar com ícones Lucide (Home / Package, strokeWidth 2/1.5)
- Inventário — aba Pertences:
  - Lista agrupada por local com pesquisa e filtros por destino
  - Fotos com URLs assinadas (bucket privado Supabase Storage)
  - Linha colorida por destino, header de local com ícone e contador
  - Botão adicionar por local, grupos minimizáveis, botão criar local
  - Gestão de locais inline (editar/excluir via menu ⋮)
  - Todos os locais visíveis mesmo vazios
  - Grupos começam todos colapsados (expandedLocations Set vazio por omissão)
  - Toolbar: ocultar grupos vazios (Eye/EyeOff) + colapsar/expandir tudo (Lucide)
  - Histórico: modal com itens resolvidos, badges de destino, data em PT, botão Restaurar
  - ownerName resolvido client-side a partir dos membros da casa
- Formulário de item:
  - Criar/editar com câmara nativa e upload para Supabase Storage
  - Picker de dono (visível apenas com >1 membro na casa)
  - Botão "Dar saída do item" (âmbar) com picker Vender/Doar/Descartar
    e destaque ✓ para o destino pré-selecionado
  - Erros de CRUD com feedback visível ao utilizador
- constants/destinations.ts — Destination const+type centralizado,
  metadados (label, badge, barColor), opções para picker/filtro/resolve
  (elimina duplicação entre InventoryItemRow, item-form, pertences)
- Ecrã de Perfil — nome editável, email read-only, avatar com inicial;
  acessível via "Perfil" no modal do avatar (header); tab oculta com href:null
- Long press em qualquer item abre menu contextual genérico ancorado ao item
  (ItemMenuProvider + ItemMenuContext) — actions configuráveis por lista;
  Pertences usa Editar / Dar saída / Eliminar; toque simples continua a abrir o formulário

### Backlog (por ordem)

1. **Dashboard** — ecrã ainda placeholder
2. **Despensa** — aba ainda placeholder
3. **Swipe down para fechar item-form** — PanResponder no handleBar com
   threshold 80px; requer mudar Modal para `transparent={true}` + backdrop,
   removendo `presentationStyle="pageSheet"`
4. **Variáveis de ambiente via `eas secret:create`** — para builds EAS
   as env vars têm de ser registadas como secrets no EAS Cloud
