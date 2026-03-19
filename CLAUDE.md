# HomeManager Mobile — CLAUDE.md

> Documento de referência para o Claude Code.
> Actualizar no final de cada tarefa relevante.

## 1. Visão Geral

App mobile de gestão doméstica — versão nativa do HomeManager Web.
Consome a mesma API .NET 10. Autenticação via Supabase (JWT partilhado com o web).

## 2. Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React Native via Expo SDK 54 |
| Linguagem | TypeScript |
| Navegação | Expo Router 6 (file-based) |
| Auth | Supabase JS + expo-secure-store |
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
| expo-secure-store | ~15.0.8 |
| expo-image-picker | ~17.0.10 |
| expo-camera | ~17.0.10 |
| expo-image | ~2.0.0 |

## 4. Estrutura de Pastas
HomeManager.Mobile/
├── app/
│   ├── _layout.tsx              ← Layout raiz — auth redirect + household check
│   ├── (auth)/
│   │   ├── _layout.tsx          ← Stack sem header
│   │   └── login.tsx            ← Login + Registo + confirmação email
│   └── (app)/
│       ├── _layout.tsx          ← HouseholdContext + header + tab navigator
│       ├── dashboard.tsx        ← Dashboard (placeholder)
│       ├── household-setup.tsx  ← Criar / entrar em household
│       └── inventory/
│           ├── index.tsx        ← Container com abas Pertences / Despensa
│           ├── pertences.tsx    ← Lista real agrupada por local
│           ├── despensa.tsx     ← Placeholder "Em breve"
│           └── item-form.tsx    ← Modal criar/editar item (câmara + upload)
├── components/
│   └── inventory/
│       ├── SearchBar.tsx
│       ├── DestinationFilter.tsx
│       ├── LocationGroupCard.tsx
│       ├── InventoryItemRow.tsx
│       └── modals/
│           ├── AddLocationModal.tsx
│           ├── EditLocationModal.tsx
│           └── DeleteLocationConfirmModal.tsx
├── constants/
│   ├── colors.ts
│   └── config.ts
├── hooks/
│   └── useInventory.ts
├── services/
│   ├── api.ts                   ← fetch wrapper com auth token
│   ├── auth.service.ts          ← Supabase auth + SecureStore chunked
│   ├── storage.service.ts       ← URLs assinadas + upload Supabase Storage
│   ├── household.service.ts
│   ├── inventory.service.ts
│   ├── location.service.ts
│   └── category.service.ts
└── types/
    ├── api-response.ts
    ├── household.ts
    ├── inventory-item.ts
    ├── location.ts
    └── category.ts

## 5. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| EXPO_PUBLIC_API_URL | URL base do backend .NET |
| EXPO_PUBLIC_SUPABASE_URL | URL do projecto Supabase |
| EXPO_PUBLIC_SUPABASE_ANON_KEY | Chave anónima Supabase |

## 6. Regras de Desenvolvimento

- Branch principal é `main` — fazer merge de `master` → `main` e push após cada tarefa
- SEMPRE usar `npx expo install` para pacotes nativos
- `npm install` apenas para JS puro (ex: @supabase/supabase-js)
- `.npmrc` tem `legacy-peer-deps=true` — não remover
- Não alterar app.json, eas.json, .npmrc, package.json sem razão explícita
- UI em Português (PT). Código em Inglês.
- Manter este ficheiro actualizado no final de cada tarefa

## 7. Comandos
```bash
npx expo start          # dev com QR code
npx expo-doctor         # validar dependências
eas build --platform android --profile preview  # APK para testar
```

## 8. Gotchas React Native (bugs já encontrados)

| Problema | Causa | Solução aplicada |
|----------|-------|-----------------|
| `crypto.randomUUID()` não existe | API Web não disponível no RN | `Date.now() + Math.random().toString(36).substring(2,10)` |
| Upload Supabase Storage falha com "Network request failed" | SDK não aceita `Blob` no RN | Usar `response.arrayBuffer()` em vez de `response.blob()` |
| SecureStore falha silenciosamente em tokens grandes | Limite de 2048 bytes por chave | `chunkStorage` em `auth.service.ts` — divide em chunks de 1800 bytes |
| Token expirado — app fica travado | `getSession()` devolve cache sem validar | Usar `refreshSession()` no boot e tratar 401 no `api.ts` com `signOut` forçado. `onAuthStateChange` deve tratar `SIGNED_OUT` e `TOKEN_REFRESHED` com `newSession null` explicitamente |

## 9. Diferenças vs Web (Angular)

| Aspecto | Web | Mobile |
|---------|-----|--------|
| Estado | Signals | useState + hooks |
| HTTP | HttpClient + interceptor | fetch() + api.ts |
| Auth storage | localStorage | expo-secure-store |
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
- Estrutura de pastas e ficheiros base
- Serviços: api.ts, auth.service.ts, inventory.service.ts,
  location.service.ts, category.service.ts, household.service.ts,
  storage.service.ts (URLs assinadas + upload para Supabase Storage)
- Tipos TypeScript completos (Household, Location, Category, InventoryItem, ApiResponse)
- Navegação base com Expo Router (root layout com auth + household redirect)
- Design system alinhado com o web (Colors + StyleSheet)
- .env configurado localmente, .env.example no repo
- SecureStore com chunking (valores > 2048 bytes divididos em chunks de 1800)
- Ecrã de Login/Registo com confirmação de email (Bloco 1 concluído)
- Household Setup — criar ou entrar via código de convite (Bloco 2 concluído)
- Shell da app: header com seletor de household (+ adicionar casa),
  avatar com logout, tab bar inferior com ícones emoji (Bloco 3 concluído)
- Inventário com abas Pertences/Despensa; lista de pertences agrupada
  por local com pesquisa, filtros por destino (Manter/Vender/Doar/Descartar)
  e fotos com URLs assinadas (bucket privado); redesign visual alinhado com
  web: linha colorida por destino, header de local com ícone e contador,
  botão adicionar por local, grupos minimizáveis, botão criar local;
  gestão de locais inline (editar/excluir via menu ⋮), todos os locais
  visíveis mesmo vazios, barra lateral cinza para itens sem destino;
  fix dropdown menu via Modal (zIndex cross-component) (Bloco 4a+4c concluídos)
- Formulário de item: criar/editar com câmara nativa e upload
  para Supabase Storage; fix reload após delete (Bloco 4b concluído)

### Backlog (por ordem)
1. Dashboard
