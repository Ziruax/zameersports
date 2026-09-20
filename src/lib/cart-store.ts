"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface CartItem {
  productId: string
  slug: string
  name: string
  price: number
  image: string
  qty: number
  stock: number
}

interface CartState {
  items: CartItem[]
  drawerOpen: boolean
  add: (item: Omit<CartItem, "qty">, qty?: number) => void
  remove: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clear: () => void
  openDrawer: () => void
  closeDrawer: () => void
}

const MAX_PER_LINE = 10

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      add: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          const items = existing
            ? state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, qty: Math.min(MAX_PER_LINE, i.qty + qty), stock: item.stock }
                  : i,
              )
            : [...state.items, { ...item, qty: Math.min(MAX_PER_LINE, Math.max(1, qty)) }]
          return { items, drawerOpen: true }
        }),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      setQty: (productId, qty) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, qty: Math.max(1, Math.min(MAX_PER_LINE, qty)) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "zameer-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ items: state.items }) as CartState,
    },
  ),
)

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0)
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}
