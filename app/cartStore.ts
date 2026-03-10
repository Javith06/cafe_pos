import { create } from "zustand";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

export type CartItem = {
  lineItemId: string; // Unique ID for this specific cart instance
  id: string; // Product ID
  name: string;
  price?: number;
  qty: number;

  spicy?: string;
  oil?: string;
  salt?: string;
  sugar?: string;
  note?: string;
};

type CartState = {
  cart: CartItem[];
  addToCartGlobal: (item: Omit<CartItem, "qty" | "lineItemId">) => void;
  removeFromCartGlobal: (lineItemId: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],

  addToCartGlobal: (item) => {
    const { cart } = get();

    const existing = cart.find(
      (p) =>
        p.id === item.id &&
        p.spicy === item.spicy &&
        p.oil === item.oil &&
        p.salt === item.salt &&
        p.sugar === item.sugar &&
        p.note === item.note
    );

    if (existing) {
      set({
        cart: cart.map((p) =>
          p.lineItemId === existing.lineItemId
            ? { ...p, qty: p.qty + 1 }
            : p
        ),
      });
    } else {
      set({
        cart: [...cart, { ...item, qty: 1, lineItemId: uuidv4() }],
      });
    }
  },

  removeFromCartGlobal: (lineItemId) => {
    const { cart } = get();
    const item = cart.find((p) => p.lineItemId === lineItemId);

    if (!item) return;

    if (item.qty > 1) {
      set({
        cart: cart.map((p) =>
          p.lineItemId === lineItemId ? { ...p, qty: p.qty - 1 } : p
        ),
      });
    } else {
      set({
        cart: cart.filter((p) => p.lineItemId !== lineItemId),
      });
    }
  },

  clearCart: () => set({ cart: [] }),
}));

// Backwards compatibility functions, though it's recommended to use hooks directly in React components.
export const getCart = () => useCartStore.getState().cart;
export const addToCartGlobal = (item: Omit<CartItem, "qty" | "lineItemId">) => useCartStore.getState().addToCartGlobal(item);
export const removeFromCartGlobal = (lineItemId: string) => useCartStore.getState().removeFromCartGlobal(lineItemId);
export const clearCart = () => useCartStore.getState().clearCart();

// Note: subscribeCart is no longer needed with Zustand, but we export a dummy version if it's imported elsewhere
export const subscribeCart = (listener: () => void) => {
  return useCartStore.subscribe(listener);
};
