# HomeManager Mobile — CLAUDE.md

> Documento de referência para o Claude Code e novos developers.
> **Fonte de verdade: o código. Se este documento divergir do código, o código tem razão.**
> Última actualização: 2026-04-02

---

## 1. Visão Geral

App mobile de gestão doméstica — cliente primário do HomeManager.
Consome a API .NET 10 em `D:/Repos/HomeManager`. Autenticação via Supabase (JWT partilhado).

**Público-alvo**: Famílias e casas partilhadas de 1–N pessoas.

**Estado actual** (2026-04-02):
- Auth (Supabase), criação/adesão a household, inventário Pertences — funcionais end-to-end.
- Tela 1 (`pertences.tsx`) — migrada para `PertencesContext`; mostra cards Por Local e Por Destino com toggle, CRUD de localizações, FAB, skeleton loading.
- Tela 2a (`location-detail.tsx`) — migração PertencesContext completa: cache hit/write, optimistic updates, `refreshCounts()`, `chipChangedRef`, `currentStateRef`.
- Tela 2b (`destination-detail.tsx`) — migração PertencesContext completa: cache hit/write, optimistic updates, `refreshCounts()`, `fetchingRef`, skeleton loading.
- Tela 3 (`search.tsx`) — pesquisa server-side com debounce; funcional.
- Histórico (`history.tsx`) — lista de itens resolvidos, scroll infinito, restaurar; funcional.
- `item-form.tsx` — criar/editar item (câmara, localização, destino, dono, dar saída, apagar).
- Dashboard e Despensa — placeholders ("em breve").
- **Tarefas** — módulo completo: DateCarousel, TaskCard com accordion, skeleton loading, optimistic updates, TaskForm modal com recorrência (diária/semanal/mensal).
- **⚠️ BUG**: `household-setup.tsx` usa `useAuth().refreshHouseholds` em vez de `useHousehold().refreshHouseholds` — o `HouseholdContext` foi criado recentemente e este componente não foi actualizado.
- **Código morto**: `DestinationFilter.tsx`, `SearchBar.tsx`, `LocationGroupCard.tsx` — resquícios de uma refactoring anterior; nenhuma tela os importa actualmente.

**Nota importante — Categoria removida**:
`categoryId` foi **removido intencionalmente** do Mobile após testes mostrarem que o conceito não faz sentido para a app. O `item-form.tsx` não tem seletor de categoria — este é o estado correcto. O backend ainda tem os endpoints de categoria e `categoryId` nos DTOs, mas o cleanup da API está pendente.

---

## 2. Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React Native via **Expo SDK 54** |
| Linguagem | TypeScript |
| Navegação | **Expo Router 6** (file-based routing) |
| Auth | Supabase JS + **AsyncStorage** (sessão persistida) |
| HTTP | `fetch()` nativo via wrapper `api.ts` |
| Câmara/Galeria | `expo-image-picker` |
| Imagens | `expo-image` (caching memory-disk) |
| Ícones | `lucide-react-native` 0.475.0 |
| Build cloud | EAS Build (free tier, 30 builds/mês) |
| Dev | Expo Go no telemóvel físico |

**Nota — SecureStore vs AsyncStorage**: A sessão Supabase está em `AsyncStorage`, não em `expo-secure-store`. A migração aconteceu porque `SecureStore` corrompeu dados em operações de background. O pacote `expo-secure-store` ainda está instalado e nos `plugins` do `app.json` mas não é usado para auth.

---

## 3. Dependências

### Runtime

| Pacote | Versão | Notas |
|--------|--------|-------|
| `expo` | ~54.0.33 | |
| `expo-router` | ~6.0.23 | File-based routing |
| `react` | 19.1.0 | |
| `react-native` | 0.81.5 | |
| `react-native-reanimated` | ~4.1.1 | Animações |
| `react-native-worklets` | 0.5.1 | Peer de reanimated |
| `react-native-gesture-handler` | ~2.28.0 | Gestos |
| `react-native-safe-area-context` | ~5.6.0 | Safe areas |
| `react-native-screens` | ~4.16.0 | Navegação nativa |
| `react-native-svg` | 15.12.1 | SVG (Logo no login) |
| `@supabase/supabase-js` | ^2.99.2 | Auth + Storage |
| `@react-native-async-storage/async-storage` | 2.2.0 | Sessão persistida |
| `expo-secure-store` | ~15.0.8 | Instalado, **não usado para auth** |
| `expo-image-picker` | ~17.0.10 | Câmara + galeria |
| `expo-camera` | ~17.0.10 | |
| `expo-image` | ~3.0.11 | Componente de imagem com cache |
| `expo-splash-screen` | ~31.0.13 | Controlo manual do splash |
| `expo-constants` | ~18.0.13 | |
| `expo-linking` | ~8.0.11 | |
| `lucide-react-native` | ^0.475.0 | **Fixado — v1.0.1 estava quebrado** |
| `@expo-google-fonts/nunito` | ^0.4.2 | Nunito_700Bold, Nunito_800ExtraBold |

### Dev

| Pacote | Versão |
|--------|--------|
| `typescript` | ~5.9.2 |
| `@types/react` | ~19.1.10 |

### `.npmrc`

```
legacy-peer-deps=true
```

**Não remover** — necessário para compatibilidade de dependências do Expo SDK 54.

---

## 4. Estrutura de Pastas

```
HomeManager.Mobile/
├── app/
│   ├── _layout.tsx              ← Raiz: AuthProvider → HouseholdProvider → AuthGuard → Slot
│   │                               Carrega fontes Nunito; retorna null enquanto loading
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Stack sem header
│   │   └── login.tsx            ← Login / Registo / confirmação email; Logo SVG inline
│   └── (app)/
│       ├── _layout.tsx          ← Exporta STATUS_BAR_HEIGHT; AppHeader com dropdown de household
│       │                           e avatar; tabs (Dashboard, Inventory, Finance, Tasks, Settings); isMounted ref
│       ├── dashboard.tsx        ← Placeholder "Dashboard — em breve"
│       ├── household-setup.tsx  ← Criar / entrar em household; ⚠️ usa useAuth() (bug — ver §11)
│       ├── profile.tsx          ← Nome editável, email read-only; isDirty guard
│       ├── tasks.tsx            ← Módulo Tarefas: DateCarousel + TaskCard accordion + FAB + TaskForm modal
│       ├── task-form.tsx        ← Modal criar/editar tarefa; recurrence picker (nunca/diária/semanal/mensal)
│       └── inventory/
│           ├── _layout.tsx      ← Stack envolto em PertencesProvider
│           ├── index.tsx        ← Container com pill tabs Pertences / Despensa
│           ├── pertences.tsx    ← Tela 1: cards Por Local / Por Destino; migrada para contexto
│           ├── location-detail.tsx   ← Tela 2a: itens paginados + chips destino; ⚠️ migração pendente
│           ├── destination-detail.tsx ← Tela 2b: itens agrupados por local; ⚠️ migração pendente
│           ├── search.tsx       ← Tela 3: pesquisa server-side, debounce 350ms
│           ├── history.tsx      ← Histórico de resolvidos, scroll infinito, restaurar
│           ├── despensa.tsx     ← Placeholder "Em breve"
│           └── item-form.tsx    ← Modal criar/editar; câmara, dono, dar saída, apagar
├── components/
│   ├── AuthGuard.tsx            ← Routing via useEffect + router.replace; esconde splash screen
│   ├── ItemMenuProvider.tsx     ← Modal de menu contextual; posicionamento dinâmico acima/abaixo
│   ├── tasks/
│   │   ├── DateCarousel.tsx     ← FlatList horizontal de 121 dias (-60..+60); getItemLayout; scrollToIndex
│   │   ├── TaskCard.tsx         ← Card com accordion (long-press); concluir/reabrir/editar/apagar
│   │   └── TasksSkeleton.tsx    ← 6 skeleton cards para loading state
│   └── inventory/
│       ├── InventoryItemRow.tsx ← Row com long-press (openMenu), color bar, foto, badge destino
│       ├── SearchBar.tsx        ← ⚠️ CÓDIGO MORTO — não importado por nenhuma tela
│       ├── DestinationFilter.tsx ← ⚠️ CÓDIGO MORTO — não importado por nenhuma tela
│       ├── LocationGroupCard.tsx ← ⚠️ CÓDIGO MORTO — não importado por nenhuma tela
│       └── modals/
│           ├── AddLocationModal.tsx         ← Sheet bottom; campos nome + emoji
│           ├── EditLocationModal.tsx        ← Sheet bottom; pré-popula com initialName/initialIcon
│           └── DeleteLocationConfirmModal.tsx ← Modal centrado; prop locationName recebida
│                                               mas ignorada (usa _locationName); texto genérico
├── contexts/
│   ├── AuthContext.tsx          ← AuthProvider + useAuth; sessão via onAuthStateChange + AppState
│   ├── HouseholdContext.tsx     ← HouseholdProvider + useHousehold; pendingLoad pattern;
│   │                               hasHousehold: boolean | null (null = loading)
│   ├── ItemMenuContext.tsx      ← Dois contextos separados: ItemMenuContext (actions) +
│   │                               ItemMenuStateContext (state) — evita re-renders desnecessários
│   └── PertencesContext.tsx     ← PertencesProvider + usePertences; locationCounts,
│                                   destinationCounts, locations, refreshCounts, refreshLocations,
│                                   detailCache (1-slot cache da última tela de detalhe)
├── constants/
│   ├── colors.ts                ← Paleta warm/earthy (ver §9)
│   ├── config.ts                ← Config { apiUrl, supabaseUrl, supabaseAnonKey } de EXPO_PUBLIC_*
│   └── destinations.ts         ← Destination as const (não enum); DESTINATION_META; helpers;
│                                   DESTINATION_ALL_OPTIONS; DESTINATION_RESOLVE_OPTIONS
├── hooks/
│   └── useInventory.ts         ← ⚠️ LEGACY — não usado por nenhuma tela activa; candidato a remoção
├── services/
│   ├── api.ts                  ← fetch wrapper; authTokenGetter + signOutHandler injectáveis;
│   │                               401 → signOut + lança 'SESSION_EXPIRED'; resposta vazia → null
│   ├── auth.service.ts         ← Supabase auth; refreshPromise singleton (previne concurrent refresh)
│   ├── storage.service.ts      ← urlCache Map com buffer 5 min antes de expirar;
│   │                               upload usa arrayBuffer() (Blob não funciona no RN)
│   ├── household.service.ts    ← getMyHouseholds, getHousehold, createHousehold, joinHousehold
│   ├── inventory.service.ts    ← getItems, searchItems, getCountsByLocation,
│   │                              getCountsByDestination, getResolvedItems, CRUD, resolve, restore
│   ├── location.service.ts     ← getLocations, createLocation, updateLocation, deleteLocation
│   ├── task.service.ts         ← getTasksByDate, createTask, updateTask, completeTask,
│   │                              reopenTask, deleteTask, deleteRecurrence
│   └── user.service.ts         ← getMe, updateMe
└── types/
    ├── api-response.ts         ← ApiResponse<T> { success, message, data, timestamp }
    ├── paged-response.ts       ← PagedResponse<T> { items, total, page, pageSize, hasMore }
    ├── inventory-counts.ts     ← LocationCount, DestinationCount
    ├── household.ts            ← Household + HouseholdUser { userId, role, user{id,name,email} }
    ├── inventory-item.ts       ← InventoryItem; ownerName?: string marcado "não vem da API"
    ├── location.ts             ← Location { id, householdId, name, icon?, createdAt }
    ├── task.ts                 ← Task, CreateTaskRequest, UpdateTaskRequest, RecurrencePattern
    └── user.ts                 ← UserProfile { id, email, name, createdAt, updatedAt }
```

---

## 5. Arquitectura e Padrões

### Fluxo de Auth e Routing

```
app/_layout.tsx
  └─ AuthProvider (sessão Supabase via onAuthStateChange + AppState refresh)
      └─ HouseholdProvider (carrega households quando session.user.id muda)
          └─ AuthGuard (routing + splash screen)
              └─ Slot (rotas)

AuthGuard routing:
  !session && !inAuth         → replace('/(auth)/login')
  session && hasHousehold === true && inAuth → replace('/(app)/dashboard')
  session && hasHousehold === false && !inHouseholdSetup → replace('/(app)/household-setup')
  session && hasHousehold === true && inHouseholdSetup  → replace('/(app)/dashboard')

Splash screen: escondido em AuthGuard com splashHidden useRef (evita esconder cedo)
```

### `HouseholdContext` — `pendingLoad` pattern

```typescript
pendingLoad = !!session && session.user.id !== lastLoadedSessionId
```

Previne o flash de "sem household" durante o gap entre render e useEffect. `hasHousehold: boolean | null` — `null` significa loading; `false` significa definitivamente sem household.

### `api.ts` — wrapper injectável

```typescript
// Injectável — permite auth.service.ts injectar o getter após inicialização
setAuthTokenGetter(getter: () => Promise<string | null>)
setSignOutHandler(handler: () => void)
```

- `401` → chama `signOutHandler()` + lança `'SESSION_EXPIRED'`
- Resposta sem body → retorna `null` (evita erro JSON.parse em 204)
- Prefixo `/api` adicionado automaticamente: `api.get('/users/me')` → `GET {apiUrl}/api/users/me`

### Refresh JWT proactivo — singleton promise

`auth.service.ts` usa um `refreshPromise` singleton:
```typescript
if (!refreshPromise) {
  refreshPromise = supabase.auth.refreshSession().finally(() => refreshPromise = null);
}
return refreshPromise;
```
Previne múltiplas chamadas concurrent ao `refreshSession()`.

### `PertencesContext` — estado partilhado do módulo Inventário

- Carregado em `inventory/_layout.tsx` → disponível em todas as rotas de inventário
- `refreshCounts()` — `Promise.all([getCountsByLocation, getCountsByDestination])`
- `refreshLocations()` — separado de `refreshCounts` (mais barato)
- `detailCache: DetailCache | null` — 1 slot de cache para a última tela de detalhe
  - `DetailCache = { key: string; items: InventoryItem[]; photoUrls: Record<string,string>; page: number; hasMore: boolean }`
  - `key` = `'loc:{locationId}:{chip}'` ou `'dest:{destination}'`
- Limpa tudo (incluindo cache) ao trocar de household

### `ItemMenuContext` — dual context pattern

Dois contextos separados para evitar que consumidores de actions re-renderizem com mudanças de state:
- `ItemMenuContext` — `{ openMenu, closeMenu }` (estável — não muda)
- `ItemMenuStateContext` — `{ isVisible, menuItem, menuLayout, menuActions }` (muda ao abrir/fechar)

`ItemMenuProvider.tsx` envolve os consumers e renderiza `ItemMenuModal` internamente.

### `STATUS_BAR_HEIGHT`

Exportado de `app/(app)/_layout.tsx`. Usado em:
- `ItemMenuProvider.tsx` — cálculo de posição do menu
- `InventoryItemRow.tsx` — `measure()` subtrai `STATUS_BAR_HEIGHT` de `pageY`

### Padrão de scroll infinito

```typescript
<FlatList
  onEndReachedThreshold={0.3}
  onEndReached={() => { if (hasMore && !loading) loadPage(page + 1); }}
/>
```

`loadPage(n, true)` — `resetToFirst=true` força recarregar da página 1 (usado após mutações que invalidam a lista).

### `StorageService` — cache de URLs assinadas

- `urlCache: Map<string, { url, expiresAt }>` — in-memory
- Buffer de 5 minutos: se `expiresAt - Date.now() < 5 * 60 * 1000` → considera expirado
- `getSignedUrls(paths[])` — só faz fetch das paths não cacheadas; retorna `Record<string, string>`
- Upload: `arrayBuffer()` (não `Blob` — não funciona no React Native)

---

## 6. Módulo Inventário — Arquitectura de Telas

### Tela 1 — `pertences.tsx` ✅ Migrada para PertencesContext

- **Sem estado local de fetch** — lê `locationCounts`, `destinationCounts`, `locations`, `countsLoading`, `countsError` directamente do contexto
- Toggle `[👁] [⇄]` alterna entre vista Por Local e Por Destino
  - `[👁]` oculta locais/destinos com 0 itens
  - `[⇄]` activo (cor primária) quando em vista Por Destino
- Card Histórico fixo no fim da lista com separador visual
- FAB abre `ItemForm` sem localização pré-selecionada; após `onSaved` chama `refreshCounts()`
- CRUD de localizações na própria tela (Add/Edit/Delete modals)
- Após qualquer mutação de localização: `refreshLocations()` + `refreshCounts()`
- Loading: **skeleton de 5 cards** (usando `Colors.border`) — não `ActivityIndicator`
- Botão ⋮ usa `useRef<View>` + `measure()` para posicionamento dinâmico (flip acima/abaixo)
- `numberOfLines={1}` no ícone da localização — previne wrap com emojis múltiplos
- Chips de destino: `flexShrink: 0` + `marginRight: 8` (não `gap`) — resolve bug de compressão em `FlatList` horizontal

### Tela 2a — `location-detail.tsx` ✅ Migração PertencesContext completa

- Recebe `locationId` (UUID ou `"null"`) e `locationName` via query params
- `fetchingRef: useRef<boolean>` — previne double-fetch simultâneo
- Dois useEffects: boot (household + locationId) + chips (mudança de destino seleccionado)
- Chips de destino no topo (Todos / Indefinido / Manter / Vender / Doar / Descartar)
- Scroll infinito: 30 itens por página
- Long-press → menu contextual (editar / dar saída / eliminar)
- FAB adiciona item pré-selecionado para esta localização
- `useFocusEffect` cleanup: limpa `items`, `photoUrls`, `page`, `hasMore` ao sair
- Resolve e delete: `loadPage(1, true)` (full reload)
- Cache hit no boot (`loc:{locationId}:Todos`); write no cleanup via `currentStateRef`
- Actualizações optimistas: edit → map, delete/resolve → filter, create → reload + `refreshCounts()`

### Tela 2b — `destination-detail.tsx` ✅ Migração PertencesContext completa

- Recebe `destination` (valor ou `"null"`) e `label` via query params
- **Sem** `fetchingRef` — candidato a double-fetch (diferente da Tela 2a)
- Itens agrupados por localização com `SectionList` e divisores estáticos
- `sectionHeader` com `marginTop: 16` — separação visual entre secções
- Loading: `ActivityIndicator` — **inconsistente** com Tela 2a (skeleton) e Tela 1 (skeleton)
- `useFocusEffect` cleanup
- Cache hit no boot (`dest:{destination}`); write no cleanup via `currentStateRef`
- `fetchingRef` adicionado; skeleton loading (8 linhas) em vez de `ActivityIndicator`
- Actualizações optimistas: edit → map, delete/resolve → filter, create → reload + `refreshCounts()`

### Tela 3 — `search.tsx` ✅

- Input com debounce 350ms via `debounceTimer` ref
- Mínimo 2 caracteres para disparar fetch (`InventoryService.searchItems`)
- Resultados agrupados por localização com `SectionList`
- Scroll infinito por página
- `autoFocus` no TextInput
- `useFocusEffect` cleanup: limpa query + itens + fotos ao sair

### Histórico — `history.tsx` ✅

- Lista flat cronológica de itens com `status = "resolved"`
- `formatDatePT()` com array de abreviaturas de meses portuguesas
- `restoringId: string | null` — indicador de loading por item individual
- Sem `ItemMenuProvider` — sem long-press
- `useFocusEffect` cleanup

---

## 7. `item-form.tsx` — Contrato

```typescript
interface ItemFormProps {
  visible: boolean;
  householdId: string;
  locations: Location[];
  item?: InventoryItem;               // se presente → modo edição
  preselectedLocationId?: string;
  onClose: () => void;
  onSaved: (saved: InventoryItem | null) => void;
}
```

`onSaved` callback:
- **Edição**: retorna `InventoryItem` construído client-side com campos actualizados
- **Criação / Delete / Resolve**: retorna `null`

**Campos do formulário**: nome, quantidade, localização, valor (€), descrição, destino, dono (só se >1 membro)

**Sem campo de categoria** — removido intencionalmente (ver §1).

**Acções especiais (só em edição)**:
- "Dar saída" — abre picker com `DESTINATION_RESOLVE_OPTIONS` (Vender / Doar / Descartar — exclui Manter e Indefinido) → chama `resolveItem()`
- "Apagar" — modal de confirmação → chama `deleteItem()`

**Foto**: câmara ou galeria via `expo-image-picker`; upload via `StorageService.uploadItemPhoto()` usando `arrayBuffer()`. Se `previewUri` for null e não houver `selectedFile`, `photoUrl` é enviado como `undefined` (remove foto).

**Membros**: carregados via `HouseholdService.getHousehold(householdId)` quando o modal abre; visível só com >1 membro.

---

## 8. Design System

### Paleta (earthy/warm)

| Token | Valor | Uso |
|-------|-------|-----|
| `Colors.primary` | `#2D6A4F` | Verde floresta — botões, chips activos, links |
| `Colors.primaryDark` | `#047857` | Hover/pressed state |
| `Colors.background` | `#f2ece0` | Fundo geral (bege quente) |
| `Colors.surface` | `#fdfaf4` | Cards, inputs, modais |
| `Colors.border` | `#d6ccba` | Bordas, dividers, skeleton |
| `Colors.textPrimary` | `#261e0f` | Texto principal (castanho escuro) |
| `Colors.textSecondary` | `#6b5c3e` | Labels, placeholders, ícones secundários |
| `Colors.warning` | `#d97706` | Alertas |
| `Colors.error` | `#dc2626` | Erros, botões destrutivos |

**Modo escuro**: não suportado. `app.json` tem `"userInterfaceStyle": "light"`.

### Tipografia

Fonte Nunito carregada em `app/_layout.tsx` via `@expo-google-fonts/nunito`:
- `Nunito_700Bold` — texto UI geral
- `Nunito_800ExtraBold` — Logo no ecrã de login

### Destinations — color bar e badge

```typescript
// constants/destinations.ts
const DESTINATION_META = {
  Keep:    { barColor: '#16a34a', badge: { bg: '#dcfce7', text: '#166534' }, label: 'Manter' },
  Sell:    { barColor: '#2563eb', badge: { bg: '#dbeafe', text: '#1e40af' }, label: 'Vender' },
  Donate:  { barColor: '#9333ea', badge: { bg: '#f3e8ff', text: '#6b21a8' }, label: 'Doar' },
  Trash:   { barColor: '#dc2626', badge: { bg: '#fee2e2', text: '#991b1b' }, label: 'Descartar' },
}

DEFAULT_BAR_COLOR = '#d6ccba' // Colors.border — usado para null/Undecided
```

`DESTINATION_RESOLVE_OPTIONS` — apenas Vender / Doar / Descartar (exclui Keep e Undecided).
`DESTINATION_ALL_OPTIONS` — inclui `{ value: '', label: 'Sem destino' }` como primeiro item.

### Língua

- **UI**: Português (PT-BR) — "Salvar", "Excluir", "A criar...", "Pertences"
- **Código**: Inglês — variáveis, funções, comentários

---

## 9. API Contract (resumo)

Todos os endpoints requerem `Authorization: Bearer {supabase_jwt}`.

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/inventory/items` | Itens paginados; params: `householdId`, `locationId`, `destination`, `status`, `page`, `pageSize` |
| `GET /api/inventory/items/search` | Pesquisa por nome; params: `householdId`, `q` (≥2 chars), `page`, `pageSize` |
| `GET /api/inventory/items/counts/by-location` | Contadores por localização; param: `householdId` |
| `GET /api/inventory/items/counts/by-destination` | Contadores por destino; param: `householdId` |
| `GET /api/inventory/items/{id}` | Item único |
| `POST /api/inventory/items` | Criar item |
| `PUT /api/inventory/items/{id}` | Actualizar item (204 sem body) |
| `DELETE /api/inventory/items/{id}` | Apagar item (204 sem body) |
| `POST /api/inventory/items/{id}/resolve` | Dar saída `{ destination }` |
| `POST /api/inventory/items/{id}/restore` | Restaurar item `{}` |
| `GET /api/households/{id}/locations` | Locations do household |
| `POST /api/households/{id}/locations` | Criar location |
| `PUT /api/locations/{id}` | Actualizar location |
| `DELETE /api/locations/{id}` | Apagar location (itens → `locationId = null`) |
| `GET /api/users/me` | Perfil do utilizador |
| `PUT /api/users/me` | Actualizar nome |
| `GET /api/household` | Todos os households do utilizador |
| `GET /api/household/{id}` | Household único (inclui `householdUsers[]`) |
| `POST /api/household` | Criar household |
| `POST /api/household/join/{inviteCode}` | Aderir a household |
| `GET /api/tasks?householdId=&date=YYYY-MM-DD` | Tarefas para um dia; gera recorrências lazy |
| `POST /api/tasks` | Criar tarefa; `recurrencePattern` opcional (`daily`/`weekly`/`monthly`) |
| `PUT /api/tasks/{id}` | Actualizar tarefa (title, description, assigneeId, dueDate) |
| `POST /api/tasks/{id}/complete` | Marcar concluída |
| `POST /api/tasks/{id}/reopen` | Reabrir tarefa |
| `DELETE /api/tasks/{id}` | Apagar tarefa |
| `PUT /api/task-recurrences/{id}` | Actualizar recorrência (assigneeId, isActive) |
| `DELETE /api/task-recurrences/{id}` | Apagar recorrência (soft-delete) |

`PagedResponse<T>`: `{ items[], total, page, pageSize, hasMore }`

`locationId="null"` (string) → filtra itens sem localização.
`destination="null"` (string) → filtra itens sem destino.

**`InventoryItem.ownerName`** — não vem da API. Deve ser resolvido client-side a partir de `HouseholdService.getHousehold()`.

---

## 10. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_API_URL` | URL base do backend .NET (ex: `https://api.example.com`) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Chave anónima Supabase |

Lidas em `constants/config.ts`:
```typescript
export const Config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};
```

---

## 11. Regras de Desenvolvimento

- Branch principal: `main` — push após cada tarefa
- **`npx expo install`** para pacotes nativos (gere versões compatíveis com o SDK)
- **`npm install`** apenas para JS puro (ex: `@supabase/supabase-js`)
- **Não alterar** `app.json`, `eas.json`, `.npmrc`, `package.json` sem razão explícita
- **`.npmrc` tem `legacy-peer-deps=true`** — não remover
- UI em Português (PT-BR). Código em Inglês.
- Não introduzir `categoryId` de volta ao formulário — foi removido intencionalmente

---

## 12. Comandos

```bash
npx expo start                                         # dev com QR code (Expo Go)
npx expo start --clear                                 # dev limpando cache Metro
npx expo-doctor                                        # validar compatibilidade de dependências
eas build --platform android --profile preview         # APK para teste (Android)
eas build --platform android --profile production      # Build de produção (autoIncrement)
eas build --platform android --profile development     # Build de desenvolvimento (developmentClient)
```

**Perfis EAS** (`eas.json`):
- `development` — developmentClient: true, internal
- `preview` — APK, internal
- `production` — autoIncrement: true (produção)

---

## 13. Gotchas React Native (bugs já encontrados)

| Problema | Causa | Solução aplicada |
|----------|-------|-----------------|
| `crypto.randomUUID()` não existe | API Web não disponível no RN | `Date.now() + Math.random().toString(36).substring(2,10)` |
| Upload Supabase Storage falha | SDK não aceita `Blob` no RN | `response.arrayBuffer()` em vez de `Blob` |
| SecureStore corrompida em background | Escritas não atómicas | Migrado para `AsyncStorage` |
| `supabase.auth.signOut()` bloqueia | `refreshSession()` mantém lock | Não chamar `refreshSession()` no boot |
| `lucide-react-native` v1.0.1 quebrado | `dist` era directório vazio | Fixado em 0.475.0 |
| Sessão expirada sem redirect | Estado auth+households misturado | Separado em AuthProvider + HouseholdProvider + AuthGuard |
| Menu contextual desalinhado | `measure()` inclui status bar | Subtrair `STATUS_BAR_HEIGHT` ao `pageY` |
| Chips de filtro quebram horizontalmente | `gap` comprime chips em FlatList | `flexShrink: 0` no chip + `marginRight` em vez de `gap`; sem `alignItems` no `contentContainerStyle` |
| Emojis múltiplos quebram cards | Text wraps para segunda linha | `numberOfLines={1}` no Text do ícone |
| Splash screen aparece antes do redirect | `hideAsync()` disparava cedo | Movido para AuthGuard com `splashHidden useRef` |
| `toISOString()` envia dia errado à noite | Converte para UTC — no Brasil (UTC-3) meia-noite local = dia anterior UTC | Usar `formatDateParam()` em `utils/taskDates.ts` (componentes locais da data) |
| `gap` em FlatList horizontal do DateCarousel | Comprime itens em RN | `marginRight: 4` + `flexShrink: 0` no chip; nunca `gap` |
| `DateCarousel` constrói janela no module-level | `DATE_WINDOW` é fixo no momento do import | Se a app ficar em background dias, o carrossel fica desfasado — reiniciar a app |
| `CropImageActivity` não registada | `expo-image-picker` ausente dos plugins | Adicionado ao array `plugins` do `app.json` — requer rebuild EAS |
| `household-setup.tsx` usa `useAuth()` | `HouseholdContext` criado depois | ⚠️ Bug por corrigir — deve usar `useHousehold()` |

---

## 14. Restrições — Nunca Fazer sem Aprovação Explícita

### Não alterar sem justificação

| Restrição | Razão |
|-----------|-------|
| **Não adicionar `categoryId` ao `item-form.tsx`** | Removido intencionalmente após testes — a lógica não faz sentido na app |
| **Não usar `expo install` para pacotes JS puro** | Pode selecionar versões incompatíveis; usar `npm install` para JS puro |
| **Não alterar `app.json`, `eas.json`** | Afectam builds nativos; qualquer mudança requer rebuild EAS |
| **Não remover `.npmrc` `legacy-peer-deps`** | Necessário para compatibilidade do SDK 54 |
| **Não usar `SecureStore` para auth** | Corrompeu dados em background — migrado para AsyncStorage |
| **Não chamar `refreshSession()` no boot** | Causa deadlock com `supabase.auth.signOut()` |
| **Não fazer upload com `Blob`** | Não funciona no React Native — usar `arrayBuffer()` |

### Não quebrar

| Restrição | Razão |
|-----------|-------|
| **Não alterar a ordem AuthProvider → HouseholdProvider → AuthGuard** | AuthGuard depende de ambos os contextos; HouseholdProvider depende da session do AuthContext |
| **Não partilhar estado entre `PertencesContext` e cada tela de detalhe** | Cada tela tem o seu próprio estado de items — o contexto só partilha contadores e cache de 1 slot |
| **Não expor `ownerName` da API** | É resolvido client-side; a API não retorna este campo |
| **Não remover `STATUS_BAR_HEIGHT` export de `(app)/_layout.tsx`** | Usado por `ItemMenuProvider` e `InventoryItemRow` para posicionamento correcto |
| **Não usar `gap` em FlatList horizontal de chips** | Comprime chips em React Native — usar `marginRight` + `flexShrink: 0` |

### Ficheiros sensíveis

| Ficheiro | Razão |
|---------|-------|
| `app.json` | Qualquer mudança pode exigir rebuild EAS ($) |
| `eas.json` | Configuração de builds — não alterar perfis sem razão |
| `constants/config.ts` | Ponto único de leitura das env vars |
| `services/api.ts` | Qualquer mudança afecta todos os endpoints da app |
| `contexts/AuthContext.tsx` | Alterações ao fluxo de sessão afectam o routing de toda a app |

---

## 15. Relação com o Repositório da API

O backend (`D:/Repos/HomeManager`) é partilhado com o cliente Web (legado). O Mobile é o **cliente primário**.

### O que é partilhado

- **Endpoints REST** — todos os documentados em §9
- **Schema da DB** — migrations afectam ambos os clientes
- **Supabase Auth** — mesmo projecto, mesmo JWT
- **Supabase Storage** — bucket `item-photos`

### Regras de compatibilidade

| Regra | Detalhe |
|-------|---------|
| **Coordenar mudanças breaking na API** | Renomear campos em `ItemResponse`, remover endpoints — coordenar antes do deploy |
| **Adicionar campos é safe; remover não é** | Novos campos opcionais são backwards-compatible; remover/renomear não são |
| **Cleanup de `categoryId` na API pendente** | `categoryId` foi removido do Mobile mas ainda existe na API — a limpeza da API deve ser coordenada |
| **Migrações são irreversíveis** | Testar localmente antes de push |

### Impacto de mudanças na API sobre o Mobile

Sempre que alterar:
- **Shape de `ItemResponse`** → verificar `types/inventory-item.ts` e todos os `getItems()` calls
- **Novos endpoints** → documentar no CLAUDE.md da API antes de implementar no Mobile
- **Migrations** → coordenar para garantir consistência de dados

---

## 16. Estado Actual

### Funcional end-to-end

- Autenticação (signup/signin, refresh proactivo, confirmação email, redirect automático)
- Household criar, entrar via código de convite, seletor no header
- Perfil: nome editável, email read-only, `isDirty` guard no botão salvar
- Pertences:
  - Tela 1: lista Por Local / Por Destino, toggle visibilidade, FAB, skeleton loading
  - Tela 2a: itens paginados, chips destino, scroll infinito, CRUD, FAB pré-selecionado
  - Tela 2b: itens agrupados por local, SectionList, scroll infinito, CRUD
  - Tela 3: pesquisa server-side com debounce 350ms, resultados paginados
  - Histórico: lista flat de resolvidos, scroll infinito, restaurar por item
  - Item form: câmara/galeria, upload Storage, picker de dono, dar saída, apagar
  - Menu contextual long-press (editar / dar saída / eliminar)
  - CRUD de localizações (criar/editar/apagar) na Tela 1
- `PertencesContext` criado e Tela 1 migrada

### Placeholders

- Dashboard (`dashboard.tsx`) — mostra nome do household + "em breve"
- Despensa (`despensa.tsx`) — ícone 🛒 + "Em breve..."

### Backlog (por prioridade)

#### 1. ✅ PertencesContext: migração Tela 2a + Tela 2b — CONCLUÍDO (2026-04-03)

`location-detail.tsx` e `destination-detail.tsx` foram migrados:

- `chipChangedRef` (Tela 2a) — previne double-fetch no mount
- `currentStateRef` — evita stale closure no cleanup
- Cache hit no boot (`loc:{locationId}:Todos` / `dest:{destination}`)
- Cache write no `useFocusEffect` cleanup via `setDetailCache`
- Actualizações optimistas: edit → map, delete/resolve → filter, create → reload
- `refreshCounts()` chamado após resolve e delete
- `fetchingRef` adicionado à Tela 2b
- Skeleton loading (8 linhas) substituiu `ActivityIndicator` na Tela 2b

#### 2. 🐛 BUG — `household-setup.tsx` usa `useAuth()` para `refreshHouseholds`

Deve usar `useHousehold()` após a criação do `HouseholdContext`. Verificar se `refreshHouseholds` está exposto por `HouseholdContext` e actualizar a importação.

#### 3. 🧹 Limpeza — Remover código morto

- `components/inventory/DestinationFilter.tsx`
- `components/inventory/SearchBar.tsx`
- `components/inventory/LocationGroupCard.tsx`
- `hooks/useInventory.ts`

Nenhum destes é importado por qualquer tela activa. Resquícios da refactoring de UI anterior.

#### 4. 🧹 Limpeza — Remover `categoryId` da API

`categoryId` foi removido do Mobile. Cleanup pendente no backend:
- Remover de `ItemResponse` DTO
- Remover de `CreateItemRequest` / `UpdateItemRequest`
- Avaliar remoção dos `CategoryController` endpoints (coordenar com Web legado)

#### 5. Dashboard — implementação real

Ecrã actualmente placeholder.

#### 6. Despensa — implementação real

Aba actualmente placeholder. Backend `PantryController` já funcional.

#### 7. `ownerName` nas telas de detalhe

`ownerName` não vem da API — é resolvido client-side. As telas de detalhe (2a, 2b) não fazem este lookup actualmente. Solução: carregar membros do household uma vez e resolver `ownerId → name` localmente.

#### 8. Swipe down para fechar `item-form`

`PanResponder` no handle bar do modal.

---

## 17. Contexto para Agentes AI

### Ordem de leitura recomendada para um agente novo

1. **Este ficheiro** (CLAUDE.md) — visão completa antes de ler qualquer código
2. `contexts/PertencesContext.tsx` — arquitectura central do módulo de inventário
3. `app/(app)/inventory/pertences.tsx` — referência de implementação migrada (estado do "feito")
4. `app/(app)/inventory/location-detail.tsx` + `destination-detail.tsx` — estado "por migrar"
5. `services/api.ts` + `services/inventory.service.ts` — contrato com o backend
6. `contexts/ItemMenuContext.tsx` — padrão de dual context

### Checklist pré-implementação

- [ ] Ler o ficheiro alvo antes de propor qualquer mudança
- [ ] Verificar se o padrão existe já implementado em `pertences.tsx` (referência)
- [ ] Não adicionar `categoryId` — foi removido intencionalmente
- [ ] Para novas telas com fetch: incluir `fetchingRef`, `useFocusEffect` cleanup, `onEndReached`
- [ ] Para mutações: chamar `refreshCounts()` do `PertencesContext` se afectar contadores
- [ ] Para uploads de foto: usar `arrayBuffer()`, não `Blob`
- [ ] `STATUS_BAR_HEIGHT` deve ser subtraído de `pageY` em qualquer `measure()` call
- [ ] Chips horizontais: `flexShrink: 0` + `marginRight`, nunca `gap` no container

### Gotchas específicos do código

| Gotcha | Detalhe |
|--------|---------|
| **`detailCache` é 1 slot** | Guardar cache substitui qualquer cache anterior — só o último detalhe visitado é guardado |
| **`locationId="null"` (string)** | Para itens sem localização, passar a string `"null"`, não o valor null |
| **`destination=""` (string vazia)** | `DESTINATION_ALL_OPTIONS` usa `value: ''` para "Sem destino" — não é null |
| **`ownerName` não vem da API** | O campo existe no tipo mas tem comentário explícito — não assumir que a API o retorna |
| **`refreshHouseholds` em `useAuth()`** | Bug conhecido — deve ser `useHousehold()`. Não replicar este padrão. |
| **Código morto nos components** | `DestinationFilter`, `SearchBar`, `LocationGroupCard` existem mas não são usados — não importar |
| **`expo-secure-store` está instalado** | Mas não é usado para auth — não usar para persistência de sessão |

---

## 18. Migrações e Builds

### Builds EAS

| Perfil | Plataforma | Distribuição | Tipo |
|--------|-----------|-------------|------|
| `development` | Android/iOS | Internal | Development client |
| `preview` | Android | Internal | APK (teste) |
| `production` | Android/iOS | Store | Auto-increment version |

**`appVersionSource: "remote"`** — versão gerida pelo EAS, não pelo `app.json` local.

### Mudanças que requerem novo build EAS

- Qualquer mudança em `app.json` (plugins, permissões, ícones)
- Adicionar/remover pacotes com módulos nativos
- Mudanças de configuração em `eas.json`

Mudanças que **não** requerem rebuild (só `npx expo start`):
- Código TypeScript/React
- Estilos
- Lógica de negócio

---

*Última actualização: 2026-04-02*

**Principais mudanças nesta revisão (reescrita completa):**
- Documento reescrito do zero com 18 secções
- Documentado bug `household-setup.tsx` usando `useAuth()` em vez de `useHousehold()`
- Código morto identificado: `DestinationFilter`, `SearchBar`, `LocationGroupCard`, `useInventory`
- Remoção intencional de `categoryId` do Mobile documentada; cleanup da API marcado como pendente
- Backlog expandido com critérios de aceite detalhados para PertencesContext migration
- Design system completo (paleta, Nunito, DESTINATION_META)
- Relação com repositório da API documentada
- Restricções explícitas com justificações
- Contexto para agentes AI com checklist e gotchas específicos
- `app.json` features documentadas (light-only, plugins, predictiveBackGestureEnabled)
- Todos os perfis EAS documentados
- 5 pacotes em falta adicionados à tabela de dependências
