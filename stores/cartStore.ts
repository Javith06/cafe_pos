import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

/* ================= TYPES ================= */

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

type DiscountInfo = {
  applied: boolean;
  type: "percentage" | "fixed";
  value: number;
};

type CartState = {
  carts: Record<string, CartItem[]>;
  discounts: Record<string, DiscountInfo>;

  currentContextId: string | null;

  setCurrentContext: (contextId: string | null) => void;

  getCart: () => CartItem[];

  addToCartGlobal: (item: Omit<CartItem, "qty" | "lineItemId">) => void;
  removeFromCartGlobal: (lineItemId: string) => void;
  clearCart: () => void;
  clearAllCarts: () => void;

  applyDiscount: (discount: DiscountInfo) => void;
  clearDiscount: () => void;

  setCartItems: (contextId: string, items: CartItem[]) => void;
};

/* ================= STORE ================= */

export const useCartStore = create<CartState>((set, get) => ({
  carts: {},
  discounts: {},

  currentContextId: null,

  setCurrentContext: (contextId) => set({ currentContextId: contextId }),

  getCart: () => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return [];
    return carts[currentContextId] || [];
  },

  /* ================= DISCOUNT ================= */

  applyDiscount: (discount) => {
    const { currentContextId, discounts } = get();
    if (!currentContextId) return;

    set({
      discounts: {
        ...discounts,
        [currentContextId]: discount,
      },
    });
  },

  clearDiscount: () => {
    const { currentContextId, discounts } = get();
    if (!currentContextId) return;

    const updated = { ...discounts };
    delete updated[currentContextId];

    set({ discounts: updated });
  },

  /* ================= ADD ================= */

  addToCartGlobal: (item) => {
    const { carts, currentContextId, discounts } = get();
    if (!currentContextId) return;

    const currentCart = carts[currentContextId] || [];

    const areModifiersEqual = (mods1?: Modifier[], mods2?: Modifier[]) => {
      const ids1 = (mods1 || [])
        .map((m) => m.ModifierId)
        .sort()
        .join("|");
      const ids2 = (mods2 || [])
        .map((m) => m.ModifierId)
        .sort()
        .join("|");
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
        areModifiersEqual(p.modifiers, item.modifiers),
    );

    let updatedCart;

    if (existing) {
      updatedCart = currentCart.map((p) =>
        p.lineItemId === existing.lineItemId ? { ...p, qty: p.qty + 1 } : p,
      );
    } else {
      updatedCart = [...currentCart, { ...item, qty: 1, lineItemId: uuidv4() }];
    }

    const newDiscounts = { ...discounts };
    delete newDiscounts[currentContextId]; // 🔥 reset discount

    set({
      carts: {
        ...carts,
        [currentContextId]: updatedCart,
      },
      discounts: newDiscounts,
    });
  },

  /* ================= REMOVE ================= */

  removeFromCartGlobal: (lineItemId) => {
    const { carts, currentContextId, discounts } = get();
    if (!currentContextId) return;

    const currentCart = carts[currentContextId] || [];
    const item = currentCart.find((p) => p.lineItemId === lineItemId);
    if (!item) return;

    let updatedCart;

    if (item.qty > 1) {
      updatedCart = currentCart.map((p) =>
        p.lineItemId === lineItemId ? { ...p, qty: p.qty - 1 } : p,
      );
    } else {
      updatedCart = currentCart.filter((p) => p.lineItemId !== lineItemId);
    }

    const newDiscounts = { ...discounts };
    delete newDiscounts[currentContextId];

    set({
      carts: {
        ...carts,
        [currentContextId]: updatedCart,
      },
      discounts: newDiscounts,
    });
  },

  /* ================= CLEAR ================= */

  clearCart: () => {
    const { carts, currentContextId, discounts } = get();
    if (!currentContextId) return;

    const newDiscounts = { ...discounts };
    delete newDiscounts[currentContextId];

    set({
      carts: {
        ...carts,
        [currentContextId]: [],
      },
      discounts: newDiscounts,
    });
  },

  clearAllCarts: () =>
    set({ carts: {}, discounts: {}, currentContextId: null }),

  /* ================= SET ================= */

  setCartItems: (contextId, items) => {
    set((state) => ({
      carts: {
        ...state.carts,
        [contextId]: items,
      },
    }));
  },
}));

/* ================= HELPERS ================= */

export const getContextId = (
  context?: {
    orderType: string;
    section?: string;
    tableNo?: string;
    takeawayNo?: string;
  } | null,
) => {
  if (!context) return null;

  if (context.orderType === "DINE_IN") {
    return `DINE_IN_${context.section}_${context.tableNo}`;
  }

  if (context.orderType === "TAKEAWAY") {
    return `TAKEAWAY_${context.takeawayNo}`;
  }

  return null;
};

export const getCart = () => useCartStore.getState().getCart();

export const addToCartGlobal = (item: Omit<CartItem, "qty" | "lineItemId">) =>
  useCartStore.getState().addToCartGlobal(item);

export const removeFromCartGlobal = (lineItemId: string) =>
  useCartStore.getState().removeFromCartGlobal(lineItemId);

export const clearCart = () => useCartStore.getState().clearCart();

export const setCurrentContext = (contextId: string | null) =>
  useCartStore.getState().setCurrentContext(contextId);

export const setCartItemsGlobal = (contextId: string, items: CartItem[]) =>
  useCartStore.getState().setCartItems(contextId, items);

export const subscribeCart = (listener: () => void) =>
  useCartStore.subscribe(listener);
