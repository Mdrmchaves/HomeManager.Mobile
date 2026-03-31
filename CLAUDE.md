# HomeManager Mobile — CLAUDE.md

> Documento de referência para o Claude Code.
> Actualizar no final de cada tarefa relevante.
> Última actualização: 2026-03-31 (UI/UX fixes inventário)

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
| expo-image | ~3.0.11 |
| lucide-react-native | 0.475.0 |
| react-native-svg | 15.12.1 |
| @expo-google-fonts/nunito | latest |
| expo-splash-screen | ~31.0.13 |

## 4. Estrutura de Pastas

```
HomeManager.Mobile/
├── app/
│   ├── _layout.tsx              ← Layout raiz — AuthProvider + HouseholdProvider + AuthGuard + Slot
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Stack sem header
│   │   └── login.tsx            ← Login + Registo + confirmação email
│   └── (app)/
│       ├── _layout.tsx          ← header + tab navigator (Lucide); useFocusEffect com isMounted ref
│       ├── dashboard.tsx        ← Dashboard (placeholder)
│       ├── household-setup.tsx  ← Criar / entrar em household
│       ├── profile.tsx          ← Perfil (nome editável, email read-only)
│       └── inventory/
│           ├── _layout.tsx      ← Stack screenOptions={{ headerShown: false }}
│           ├── index.tsx        ← Container com abas Pertences / Despensa
│           ├── pertences.tsx    ← Tela 1: lista de cards Por Local / Por Destino
│           ├── location-detail.tsx   ← Tela 2 via local: itens paginados + chips destino
│           ├── destination-detail.tsx ← Tela 2 via destino: itens agrupados por local
│           ├── search.tsx       ← Tela 3: pesquisa global server-side com debounce
│           ├── history.tsx      ← Histórico: itens resolvidos, scroll infinito, restaurar
│           ├── despensa.tsx     ← Placeholder "Em breve"
│           └── item-form.tsx    ← Modal criar/editar item (câmara, dono, dar saída)
├── components/
│   ├── AuthGuard.tsx            ← routing via useEffect + router.replace; esconde splash
│   ├── ItemMenuProvider.tsx     ← Modal menu contextual; envolve listas com long-press
│   └── inventory/
│       ├── SearchBar.tsx        ← Input de pesquisa reutilizável (não usado na Tela 1)
│       ├── DestinationFilter.tsx ← Chips de filtro (não usado na Tela 1)
│       ├── LocationGroupCard.tsx ← Não usado na Tela 1; disponível para uso futuro
│       ├── InventoryItemRow.tsx ← Row de item com long-press para menu contextual
│       └── modals/
│           ├── AddLocationModal.tsx
│           ├── EditLocationModal.tsx
│           └── DeleteLocationConfirmModal.tsx
├── contexts/
│   ├── AuthContext.tsx          ← AuthProvider + useAuth; sessão via onAuthStateChange
│   ├── HouseholdContext.tsx     ← HouseholdProvider + useHousehold; hasHousehold: boolean|null
│   └── ItemMenuContext.tsx      ← menu contextual genérico (openMenu/closeMenu)
├── constants/
│   ├── colors.ts
│   ├── config.ts
│   └── destinations.ts         ← Destination const+type, metadados, opções centralizadas
├── hooks/
│   └── useInventory.ts         ← Legacy hook; mantido para compatibilidade mas não usado
│                                  nas novas telas — cada tela faz o seu próprio fetch
├── services/
│   ├── api.ts                  ← fetch wrapper; authTokenGetter + signOutHandler injetáveis
│   ├── auth.service.ts         ← Supabase auth; refresh proativo (singleton promise)
│   ├── storage.service.ts      ← URLs assinadas + upload Supabase Storage
│   ├── household.service.ts    ← getMyHouseholds, getHousehold, createHousehold, joinHousehold
│   ├── inventory.service.ts    ← getItems, searchItems, getCountsByLocation,
│   │                              getCountsByDestination, getResolvedItems, CRUD completo
│   ├── location.service.ts
│   └── user.service.ts         ← getMe, updateMe
└── types/
    ├── api-response.ts
    ├── paged-response.ts       ← PagedResponse<T> { items, total, page, pageSize, hasMore }
    ├── inventory-counts.ts     ← LocationCount, DestinationCount
    ├── household.ts            ← Household + HouseholdUser
    ├── inventory-item.ts       ← InventoryItem com ownerId, ownerName, status, resolvedAt
    ├── location.ts
    └── user.ts
```

## 5. Arquitectura de Inventário (Pertences)

### Tela 1 — `pertences.tsx`
- Boot carrega apenas contadores via `getCountsByLocation` ou `getCountsByDestination`
- Toggle `[👁] [⇄]` na toolbar alterna entre vista Por Local e Por Destino
- `[👁]` oculta locais/destinos com 0 itens
- `[⇄]` ativo (cor primária) quando em vista Por Destino
- Card Histórico fixo no fim da lista com separador visual
- FAB abre `ItemForm` sem localização pré-selecionada
- CRUD de localizações (criar/editar/apagar) permanece nesta tela
- `useFocusEffect` recarrega contadores ao voltar de Tela 2/3
- Loading usa skeleton de 5 cards fantasma (`Colors.border`) em vez de `ActivityIndicator`
- Ícone do card usa `numberOfLines={1}` para prevenir wrap com emojis múltiplos
- Botão ⋮ usa `LocationCard` com `useRef<View>` + `measure()` para posicionamento dinâmico do dropdown (flip acima/abaixo conforme espaço disponível); subtrai `STATUS_BAR_HEIGHT` de `pageY`

### Tela 2a — `location-detail.tsx`
- Recebe `locationId` (UUID ou `"null"`) e `locationName` via query params
- Scroll infinito — 30 itens por página, fetch automático ao scroll
- Chips de destino no topo (Todos / Indefinido / Manter / Vender / Doar / Descartar)
- Chips usam `flexShrink: 0` + `marginRight: 8` (não `gap`) para não quebrarem
- Resolve, delete e edit de itens disponíveis via long-press (menu contextual)
- FAB adiciona item pré-selecionado para esta localização
- `useFocusEffect` cleanup limpa itens e fotos ao sair

### Tela 2b — `destination-detail.tsx`
- Recebe `destination` (valor ou `"null"`) e `label` via query params
- Scroll infinito — 30 itens por página
- Itens agrupados por localização com divisores estáticos (`SectionList`)
- `sectionHeader` tem `marginTop: 16` para separação visual clara entre secções
- Resolve, delete e edit via long-press
- `useFocusEffect` cleanup

### Tela 3 — `search.tsx`
- Input com debounce de 350ms — mínimo 2 caracteres para disparar fetch
- `InventoryService.searchItems` — pesquisa server-side por nome (`ILike`)
- Resultados agrupados por localização com `SectionList` e divisores estáticos
- Scroll infinito por página
- Resolve, delete e edit via long-press
- `useFocusEffect` cleanup limpa query, itens e fotos ao sair

### Histórico — `history.tsx`
- Lista flat cronológica (mais recente primeiro) de itens com `status=resolved`
- Scroll infinito — 30 por página
- Cada item mostra: nome, localização de origem, badge de destino, data PT
- Botão Restaurar chama `restoreItem` e recarrega a lista
- `useFocusEffect` cleanup

### Padrão de memória
- Cada tela tem o seu próprio estado `items[]` e `photoUrls{}`
- `useFocusEffect` com cleanup destrói estes estados ao sair
- Localizações e contadores da Tela 1 ficam em memória (são leves)
- `photoUrls` acumulam durante a sessão da tela — são descartados no cleanup

## 6. API Contract (resumo)

Todos os endpoints requerem `Authorization: Bearer {token}`.

| Endpoint | Descrição |
|----------|-----------|
| `GET /inventory/items` | Itens paginados; params: `householdId`, `locationId`, `destination`, `status`, `page`, `pageSize` |
| `GET /inventory/items/search` | Pesquisa por nome; params: `householdId`, `q` (≥2 chars), `page`, `pageSize` |
| `GET /inventory/items/counts/by-location` | Contadores por localização; param: `householdId` |
| `GET /inventory/items/counts/by-destination` | Contadores por destino; param: `householdId` |
| `GET /inventory/items/{id}` | Item único |
| `POST /inventory/items` | Criar item |
| `PUT /inventory/items/{id}` | Actualizar item (204) |
| `DELETE /inventory/items/{id}` | Apagar item (204) |
| `POST /inventory/items/{id}/resolve` | Dar saída `{ destination }` |
| `POST /inventory/items/{id}/restore` | Restaurar item |

`PagedResponse<T>`: `{ items[], total, page, pageSize, hasMore }`

`locationId="null"` como string → filtra itens sem localização.
`destination="null"` como string → filtra itens sem destino.

## 7. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| EXPO_PUBLIC_API_URL | URL base do backend .NET |
| EXPO_PUBLIC_SUPABASE_URL | URL do projecto Supabase |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Chave anónima Supabase |

## 8. Regras de Desenvolvimento

- Branch principal é `main` — push após cada tarefa
- SEMPRE usar `npx expo install` para pacotes nativos
- `npm install` apenas para JS puro (ex: @supabase/supabase-js)
- `.npmrc` tem `legacy-peer-deps=true` — não remover
- Não alterar `app.json`, `eas.json`, `.npmrc`, `package.json` sem razão explícita
- UI em Português (PT-BR). Código em Inglês.
- Manter este ficheiro actualizado no final de cada tarefa

## 9. Comandos

```bash
npx expo start                                          # dev com QR code
npx expo start --clear                                  # dev limpando cache Metro
npx expo-doctor                                         # validar dependências
eas build --platform android --profile preview          # APK para testar
```

## 10. Gotchas React Native (bugs já encontrados)

| Problema | Causa | Solução aplicada |
|----------|-------|-----------------|
| `crypto.randomUUID()` não existe | API Web não disponível no RN | `Date.now() + Math.random().toString(36).substring(2,10)` |
| Upload Supabase Storage falha | SDK não aceita `Blob` no RN | Usar `response.arrayBuffer()` |
| SecureStore corrompida em background | Escritas não atómicas | Migrado para `AsyncStorage` |
| `supabase.auth.signOut()` bloqueia | `refreshSession()` mantém lock | Não chamar `refreshSession()` no boot |
| lucide-react-native v1.0.1 quebrado | dist era directório | Fixado em 0.475.0 |
| Sessão expirada sem redirect | Estado auth+households misturado | Separado em AuthProvider + HouseholdProvider + AuthGuard |
| Menu contextual desalinhado | `measure` inclui status bar | Subtrair `STATUS_BAR_HEIGHT` ao `pageY`; usar componente com `useRef<View>` para aceder a `measure()` |
| Chips de filtro quebram em FlatList horizontal | `gap` no container comprime chips em RN | Usar `flexShrink: 0` no chip + `marginRight` em vez de `gap`; `flexGrow: 0` no FlatList; sem `alignItems` no `contentContainerStyle` |
| Emojis múltiplos no ícone quebram o card | Text wraps para segunda linha dentro de container fixo | `numberOfLines={1}` no Text do ícone |
| Splash antes do redirect | `hideAsync()` disparava cedo | Movido para AuthGuard com `useRef splashHidden` |
| `CropImageActivity` não registada | `expo-image-picker` ausente dos `plugins` no `app.json` | Adicionado ao array `plugins` — requer novo build EAS |

## 11. Estado Actual

### Feito
- Projecto Expo SDK 54 funcional (validado com expo-doctor)
- EAS configurado; `expo-image-picker` no array `plugins` do `app.json`
- Autenticação completa (login, registo, confirmação email, refresh proativo)
- Household Setup — criar ou entrar via código de convite
- Shell: header com seletor de household, avatar, tab bar Lucide
- Perfil — nome editável, email read-only
- Inventário — Pertences:
  - Tela 1: lista de cards Por Local / Por Destino com toggle, olho, FAB
  - Tela 2a: detalhe por local com chips de destino, scroll infinito, CRUD
  - Tela 2b: detalhe por destino com divisores por local, scroll infinito, CRUD
  - Tela 3: pesquisa global server-side com debounce, divisores por local
  - Histórico: lista flat paginada com restaurar
  - Item form: câmara nativa, upload Supabase Storage, picker de dono, dar saída
  - Menu contextual via long-press (editar / dar saída / eliminar)
  - CRUD de localizações (criar / editar / apagar) na Tela 1
  - UI/UX: skeleton loading (Tela 1 + Tela 2a), menu ⋮ dinâmico, chips corrigidos (`minHeight`/`minWidth`), headers compactos, secções com margem
  - `InventoryItemRow`: `minHeight: 80`, foto 56×56, divider inset (`marginHorizontal: 5`) em vez de border full-width
- Despensa: placeholder "Em breve"
- Dashboard: placeholder

### Backlog (por ordem)
1. **Dashboard** — ecrã ainda placeholder
2. **Despensa** — aba ainda placeholder
3. **Swipe down para fechar item-form** — PanResponder no handleBar
4. **Variáveis de ambiente via `eas secret:create`** — para builds EAS
5. **ownerName nas telas de detalhe** — resolver client-side a partir dos membros

## 12. Diferenças vs Web (Angular)

| Aspecto | Web | Mobile |
|---------|-----|--------|
| Estado | Signals | useState + hooks |
| HTTP | HttpClient + interceptor | fetch() + api.ts |
| Auth storage | localStorage | AsyncStorage |
| Câmara | input[capture] | expo-image-picker nativo |
| Routing | Angular Router | Expo Router file-based |
| Styling | Tailwind v4 | StyleSheet.create() |
| Listas longas | *ngFor | FlatList / SectionList virtualizados |
| Modais | div absoluta | Modal RN |
| Inventário | grupos colapsáveis client-side | navegação por telas + server-side |
