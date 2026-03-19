import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

export type Modifier = {
  ModifierId: string;
  ModifierName: string;
  Price?: number;
};

export type CartItem = {
  lineItemId: string;
  id: string;
  name: string;
  price?: number;
  qty: number;

  spicy?: string;
  oil?: string;
  salt?: string;
  sugar?: string;
  note?: string;

  modifiers?: Modifier[];
};

type CartState = {
  carts: Record<string, CartItem[]>;
  currentContextId: string | null;
  setCurrentContext: (contextId: string | null) => void;
  getCart: () => CartItem[];
  addToCartGlobal: (item: Omit<CartItem, "qty" | "lineItemId">) => void;
  removeFromCartGlobal: (lineItemId: string) => void;
  clearCart: () => void;
  clearAllCarts: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  carts: {},
  currentContextId: null,

  setCurrentContext: (contextId) => set({ currentContextId: contextId }),

  getCart: () => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return [];
    return carts[currentContextId] || [];
  },

  addToCartGlobal: (item) => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return;

    const currentCart = carts[currentContextId] || [];

    // Helper to compare modifiers by ID
    const areModifiersEqual = (mods1?: Modifier[], mods2?: Modifier[]) => {
      const ids1 = (mods1 || []).map(m => m.ModifierId).sort().join('|');
      const ids2 = (mods2 || []).map(m => m.ModifierId).sort().join('|');
      return ids1 === ids2;
    };

    const existing = currentCart.find(
      (p) =>
        p.id === item.id &&
        p.spicy === item.spicy &&
        p.oil === item.oil &&
        p.salt === item.salt &&
        p.sugar === item.sugar &&
        p.note === item.note &&
        areModifiersEqual(p.modifiers, item.modifiers)
    );

    if (existing) {
      console.log("✅ Item exists, incrementing qty");
      set({
        carts: {
          ...carts,
          [currentContextId]: currentCart.map((p) =>
            p.lineItemId === existing.lineItemId
              ? { ...p, qty: p.qty + 1 }
              : p
          ),
        },
      });
    } else {
          console.log("🆕 New item, adding to cart");  // Add this debug line

      set({
        carts: {
          ...carts,
          [currentContextId]: [...currentCart, { ...item, qty: 1, lineItemId: uuidv4() }],
        },
      });
    }
  },

  removeFromCartGlobal: (lineItemId) => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return;

    const currentCart = carts[currentContextId] || [];
    const item = currentCart.find((p) => p.lineItemId === lineItemId);
    if (!item) return;

    if (item.qty > 1) {
      set({
        carts: {
          ...carts,
          [currentContextId]: currentCart.map((p) =>
            p.lineItemId === lineItemId ? { ...p, qty: p.qty - 1 } : p
          ),
        },
      });
    } else {
      set({
        carts: {
          ...carts,
          [currentContextId]: currentCart.filter((p) => p.lineItemId !== lineItemId),
        },
      });
    }
  },

  clearCart: () => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return;
    set({
      carts: {
        ...carts,
        [currentContextId]: [],
      },
    });
  },

  clearAllCarts: () => set({ carts: {}, currentContextId: null }),
}));

// Helper for context ID
export const getContextId = (context?: { orderType: string; section?: string; tableNo?: string; takeawayNo?: string } | null) => {
  if (!context) return null;
  if (context.orderType === "DINE_IN") return `DINE_IN_${context.section}_${context.tableNo}`;
  if (context.orderType === "TAKEAWAY") return `TAKEAWAY_${context.takeawayNo}`;
  return null;
};

// Direct functions for non-hook usage
export const getCart = () => useCartStore.getState().getCart();
export const addToCartGlobal = (item: Omit<CartItem, "qty" | "lineItemId">) => useCartStore.getState().addToCartGlobal(item);
export const removeFromCartGlobal = (lineItemId: string) => useCartStore.getState().removeFromCartGlobal(lineItemId);
export const clearCart = () => useCartStore.getState().clearCart();
export const setCurrentContext = (contextId: string | null) => useCartStore.getState().setCurrentContext(contextId);

export const subscribeCart = (listener: () => void) => useCartStore.subscribe(listener);

