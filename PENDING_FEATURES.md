# Funcionalidades Pendentes — Regressão para origin/main

> Gerado em 2026-03-23 antes de reset para origin/main.
> Documenta todas as alterações locais **não relacionadas com autenticação/login**,
> com instruções para reimplementar do zero.

---

## Dependências novas (instalar antes de reimplementar)

```bash
npx expo install lucide-react-native react-native-svg
```

Pacotes adicionados ao `package.json`:
- `lucide-react-native` ^0.577.0
- `react-native-svg` 15.12.1

---

## 1. Ícones na Tab Bar (Lucide)

**Ficheiro afectado:** `app/(app)/_layout.tsx`

**Objectivo:** Substituir os emojis (🏠 e 📦) na tab bar inferior por ícones vectoriais
da biblioteca Lucide React Native. O ícone activo deve ter traço mais espesso que o inactivo.

**Prompt de reimplementação:**
> "No layout da app `(app)/_layout.tsx`, substitui os ícones emoji da tab bar pelos
> ícones `Home` e `Package` da biblioteca `lucide-react-native`. O ícone activo deve
> ter `strokeWidth` de 2 e o inactivo de 1.5. O tamanho deve ser 22."

---

## 2. Novo tipo `HouseholdUser`

**Ficheiro afectado:** `types/household.ts`

**Objectivo:** Adicionar uma interface `HouseholdUser` com os campos `userId` e `userName`,
e adicionar um campo opcional `householdUsers: HouseholdUser[]` à interface `Household` existente.
Este tipo representa os membros de uma casa para o picker de dono de item.

**Prompt de reimplementação:**
> "Em `types/household.ts`, adiciona uma interface `HouseholdUser` com campos `userId: string`
> e `userName: string`. Adiciona também o campo opcional `householdUsers?: HouseholdUser[]`
> à interface `Household` existente."

---

## 3. Novos campos em `InventoryItem`

**Ficheiros afectados:** `types/inventory-item.ts`

**Objectivo:** Remover os campos `categoryId` e `categoryName` (funcionalidade de categorias
foi abandonada). Adicionar os campos:
- `ownerId?: string` — ID do utilizador dono do item
- `ownerName?: string` — Nome resolvido client-side (não vem da API, é preenchido localmente)
- `status?: 'active' | 'resolved'` — Estado do item no inventário
- `resolvedAt?: string` — Data em que o item foi dado como saído (ISO string)

Os mesmos campos `ownerId` e `destination` devem ser adicionados às interfaces
`CreateItemRequest` e `UpdateItemRequest`.

**Prompt de reimplementação:**
> "Em `types/inventory-item.ts`, remove os campos `categoryId` e `categoryName` de todas
> as interfaces. Adiciona `ownerId`, `ownerName`, `status` ('active' | 'resolved') e
> `resolvedAt` ao tipo `InventoryItem`. Adiciona `ownerId` a `CreateItemRequest` e
> `UpdateItemRequest`."

---

## 4. Remover serviço e tipo de categorias

**Ficheiros a eliminar:** `services/category.service.ts`, `types/category.ts`

**Objectivo:** Estes ficheiros deixaram de ser necessários pois a funcionalidade de
categorias foi removida do inventário. Eliminar os dois ficheiros.

**Prompt de reimplementação:**
> "Elimina os ficheiros `services/category.service.ts` e `types/category.ts` — a
> funcionalidade de categorias foi abandonada."

---

## 5. Novo método `getHousehold` no `HouseholdService`

**Ficheiro afectado:** `services/household.service.ts`

**Objectivo:** Adicionar o método `getHousehold(id: string)` que faz GET a
`/household/{id}` e devolve um único `Household` (incluindo o campo `householdUsers`).
É usado para carregar os membros da casa no formulário de item e na listagem de pertences.

**Prompt de reimplementação:**
> "Em `services/household.service.ts`, adiciona o método `getHousehold(id: string)`
> que faz GET a `/household/{id}` e devolve um `Household`. Deve seguir o mesmo
> padrão dos outros métodos do serviço (usando o wrapper `api`)."

---

## 6. Novos métodos no `InventoryService`

**Ficheiro afectado:** `services/inventory.service.ts`

**Objectivo:** Adicionar três novos métodos:

1. `getResolvedItems(householdId)` — GET `/inventory/items?householdId=X&status=resolved`
   — devolve itens que já foram dados como saídos
2. `resolveItem(id, destination)` — POST `/inventory/items/{id}/resolve` com body
   `{ destination }` — marca um item como resolvido com o destino escolhido
3. `restoreItem(id)` — POST `/inventory/items/{id}/restore` com body vazio — restaura
   um item resolvido para o estado activo

**Prompt de reimplementação:**
> "Em `services/inventory.service.ts`, adiciona os métodos `getResolvedItems`,
> `resolveItem` e `restoreItem` que chamam respectivamente GET
> `/inventory/items?status=resolved`, POST `/inventory/items/{id}/resolve` com
> `{ destination }`, e POST `/inventory/items/{id}/restore`."

---

## 7. Estado `historyItems` e função `loadHistory` no `useInventory`

**Ficheiro afectado:** `hooks/useInventory.ts`

**Objectivo:** Adicionar ao hook `useInventory`:
- Estado `historyItems: InventoryItem[]` (começa vazio, carregado sob demanda)
- Função `loadHistory()` que chama `InventoryService.getResolvedItems()` e popula
  o estado. Não é chamada automaticamente com o `loadData` — é invocada apenas quando
  o utilizador abre o modal de histórico.
- Exportar ambos no retorno do hook.

**Prompt de reimplementação:**
> "Em `hooks/useInventory.ts`, adiciona um estado `historyItems` e uma função
> assíncrona `loadHistory()` que usa `InventoryService.getResolvedItems()` para
> carregar itens resolvidos. A função não deve ser chamada automaticamente,
> apenas quando explicitamente invocada. Exporta ambos no retorno do hook."

---

## 8. Dono do item no formulário (`item-form.tsx`)

**Ficheiro afectado:** `app/(app)/inventory/item-form.tsx`

**Objectivo:** No formulário de criação/edição de item, adicionar:

1. **Carregamento de membros** — ao abrir o modal, chamar `HouseholdService.getHousehold()`
   para obter a lista de membros (`householdUsers`)
2. **Picker de dono** — campo visível apenas quando a casa tem mais de 1 membro;
   ao pressionar, abre um picker/modal com a lista de membros para seleccionar o dono
3. **Enviar `ownerId`** no payload ao criar/editar o item
4. **Pré-preencher `ownerId`** quando o formulário abre em modo de edição

**Prompt de reimplementação:**
> "Em `item-form.tsx`, adiciona suporte ao dono do item: carrega os membros da casa via
> `HouseholdService.getHousehold()` ao abrir o modal. Mostra um campo picker de dono
> apenas se a casa tiver mais de 1 membro. O `ownerId` seleccionado deve ser enviado
> no create/update. Em edição, pré-preencher com o `ownerId` do item existente."

---

## 9. Botão "Dar saída do item" no formulário (`item-form.tsx`)

**Ficheiro afectado:** `app/(app)/inventory/item-form.tsx`

**Objectivo:** No modo de edição (item existente), adicionar um botão "Dar saída do item"
com cor âmbar. Ao pressionar, abre um picker com as opções: Vender, Doar, Descartar.
Ao escolher uma opção, chama `InventoryService.resolveItem(id, destination)` e depois
invoca `onSaved()` para fechar o modal e recarregar a lista.

**Prompt de reimplementação:**
> "Em `item-form.tsx`, no modo de edição, adiciona um botão 'Dar saída do item' em
> cor âmbar. Ao pressionar, mostra um picker com Vender/Doar/Descartar. Ao confirmar,
> chama `InventoryService.resolveItem()` e fecha o modal com `onSaved()`."

---

## 10. Swipe down para fechar o modal (`item-form.tsx`)

**Ficheiro afectado:** `app/(app)/inventory/item-form.tsx`

**Objectivo:** Adicionar um `PanResponder` nativo ao handle bar e ao cabeçalho do modal
para que um gesto de arrastar para baixo (> 80px) feche o modal. O componente usa
`transparent={true}` + backdrop `rgba(0,0,0,0.5)` em vez de `presentationStyle="pageSheet"`
(que corta o header em iOS com Dynamic Island).

**Prompt de reimplementação:**
> "Em `item-form.tsx`, adiciona um `PanResponder` ao handleBar do modal para detectar
> swipe para baixo (dy > 80px) e fechar o modal. O modal deve usar `transparent={true}`
> com um backdrop semi-transparente, e não `presentationStyle='pageSheet'`."

---

## 11. Exibir dono na linha do item (`InventoryItemRow`)

**Ficheiro afectado:** `components/inventory/InventoryItemRow.tsx`

**Objectivo:** Na linha de cada item no inventário, exibir o nome do dono abaixo do nome
do item caso o campo `ownerName` esteja preenchido. Formato: "👤 Nome", fonte 12px, cor
secundária (`Colors.textSecondary`).

**Prompt de reimplementação:**
> "Em `InventoryItemRow.tsx`, abaixo do nome do item, adiciona a exibição condicional
> do dono: se `item.ownerName` existir, mostrar '👤 {ownerName}' com fonte 12px e cor
> `Colors.textSecondary`."

---

## 12. Resolver `ownerName` em `pertences.tsx`

**Ficheiro afectado:** `app/(app)/inventory/pertences.tsx`

**Objectivo:** Ao carregar a listagem de pertences, chamar `HouseholdService.getHousehold()`
para obter o mapa `userId → userName` dos membros. Ao construir os grupos de itens,
enriquecer cada item com o campo `ownerName` resolvido a partir desse mapa.
O mapa deve ser actualizado sempre que o `selectedHousehold` mudar.

**Prompt de reimplementação:**
> "Em `pertences.tsx`, carrega os membros da casa via `HouseholdService.getHousehold()`
> e cria um mapa `userId → userName`. Antes de passar os itens para `buildGroups()`,
> enriquece cada item com `ownerName` resolvido a partir do mapa."

---

## 13. Histórico de pertences em `pertences.tsx`

**Ficheiro afectado:** `app/(app)/inventory/pertences.tsx`

**Objectivo:** Adicionar um modal/sheet de histórico que mostra os itens resolvidos.
Composto por:
- **Botão "Histórico (N)"** — texto subtil na toolbar, mostra o número de itens históricos;
  ao pressionar, chama `loadHistory()` e abre o modal
- **Modal de histórico** — lista de itens resolvidos com:
  - Nome do item
  - Badge colorido com o destino (Vender = azul, Doar = roxo, Descartar = vermelho)
  - Data de saída formatada em Português (ex: "15 mar. 2026")
  - Botão "Restaurar" por item que chama `InventoryService.restoreItem()`, fecha o modal
    e recarrega a lista

**Formato da data:** função auxiliar `formatDatePT(iso)` que devolve "D mês. AAAA" usando
nomes de meses abreviados em PT (jan., fev., mar., ...).

**Badges de destino:**
- Sell → "Vender", fundo azul claro, texto azul escuro
- Donate → "Doar", fundo lilás, texto roxo escuro
- Discard → "Descartar", fundo vermelho claro, texto vermelho escuro

**Prompt de reimplementação:**
> "Em `pertences.tsx`, adiciona um botão 'Histórico (N)' que abre um modal com a lista
> de itens resolvidos (de `historyItems` do useInventory). Cada item deve mostrar o nome,
> um badge colorido com o destino (Sell/Donate/Discard), a data em PT abreviado e um
> botão Restaurar que chama `InventoryService.restoreItem()` e recarrega a lista.
> A contagem do botão deve reflectir o número actual de itens em histórico."

---

## 14. Ocultar grupos vazios + colapsar/expandir tudo em `pertences.tsx`

**Ficheiro afectado:** `app/(app)/inventory/pertences.tsx`

**Objectivo:** Adicionar uma toolbar discreta entre os filtros de destino e a lista de
grupos, com dois controlos:

1. **Ocultar grupos vazios** — ícone `Eye`/`EyeOff` (Lucide, 20px); toggle que filtra
   da lista os grupos sem itens; durante pesquisa activa, grupos vazios são ocultados
   automaticamente e o botão fica escondido
2. **Colapsar/Expandir tudo** — ícones `ChevronsUpDown`/`ChevronsDownUp` (Lucide, 20px);
   "colapsar tudo" adiciona os IDs de todos os grupos actuais ao Set de colapsados;
   "expandir tudo" limpa o Set completamente

**Prompt de reimplementação:**
> "Em `pertences.tsx`, adiciona uma toolbar entre os filtros e a lista com dois botões
> de ícone Lucide: (1) Eye/EyeOff para ocultar/mostrar grupos sem itens (durante pesquisa
> activa fica escondido e grupos vazios são sempre ocultados); (2) ChevronsUpDown/
> ChevronsDownUp para colapsar todos os grupos actuais ou expandir todos."

---

## Ordem de reimplementação sugerida

1. Instalar dependências (`lucide-react-native`, `react-native-svg`)
2. Tipos (`HouseholdUser`, campos `InventoryItem`) — features 2, 3
3. Remover categorias — feature 4
4. Serviços (`getHousehold`, `resolveItem`, etc.) — features 5, 6
5. Hook (`historyItems`, `loadHistory`) — feature 7
6. Tab bar icons — feature 1
7. Componente `InventoryItemRow` (ownerName) — feature 11
8. Formulário de item (dono + dar saída + swipe) — features 8, 9, 10
9. Listagem de pertences (ownerName + histórico + toolbar) — features 12, 13, 14
