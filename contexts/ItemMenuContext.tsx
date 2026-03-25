import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ItemMenuContextValue {
  openMenu: (
    item: { id: string; name: string },
    layout: { top: number; left: number; width: number; itemHeight: number },
    actions: MenuAction[]
  ) => void;
  closeMenu: () => void;
}

interface ItemMenuState {
  menuItem: { id: string; name: string } | null;
  menuLayout: { top: number; left: number; width: number; itemHeight: number } | null;
  menuActions: MenuAction[];
  isVisible: boolean;
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const ItemMenuContext = createContext<ItemMenuContextValue | null>(null);
const ItemMenuStateContext = createContext<ItemMenuState | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ItemMenuContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ItemMenuState>({
    menuItem: null,
    menuLayout: null,
    menuActions: [],
    isVisible: false,
  });

  function openMenu(
    item: { id: string; name: string },
    layout: { top: number; left: number; width: number; itemHeight: number },
    actions: MenuAction[]
  ) {
    setState({ menuItem: item, menuLayout: layout, menuActions: actions, isVisible: true });
  }

  function closeMenu() {
    setState((prev) => ({ ...prev, isVisible: false }));
  }

  return (
    <ItemMenuContext.Provider value={{ openMenu, closeMenu }}>
      <ItemMenuStateContext.Provider value={state}>
        {children}
      </ItemMenuStateContext.Provider>
    </ItemMenuContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useItemMenu(): ItemMenuContextValue {
  const ctx = useContext(ItemMenuContext);
  if (!ctx) throw new Error('useItemMenu must be used within ItemMenuProvider');
  return ctx;
}

/** Used ONLY by ItemMenuProvider to render the modal. */
export function useItemMenuState(): ItemMenuState {
  const ctx = useContext(ItemMenuStateContext);
  if (!ctx) throw new Error('useItemMenuState must be used within ItemMenuProvider');
  return ctx;
}
