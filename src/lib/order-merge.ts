import type { OrderItem } from "@/lib/types";

/**
 * Merge a previous order's items into a new order. Same variants get their
 * quantities summed; for shared variants the NEW price wins (current pricing).
 * Pure module → unit-testable.
 */
export function mergeOrderItems(
  oldItems: OrderItem[],
  newItems: OrderItem[],
): { itemsJson: OrderItem[]; total: number } {
  const map = new Map<string, OrderItem>();

  const add = (it: OrderItem, isNew: boolean) => {
    const key = String(it.variant_id ?? it.title ?? Math.random());
    const existing = map.get(key);
    if (existing) {
      existing.quantity += it.quantity;
      if (isNew) existing.price = it.price; // current price wins
    } else {
      map.set(key, { ...it });
    }
  };

  // Add new items first (establish current prices), then pull in old items.
  newItems.forEach((it) => add(it, true));
  oldItems.forEach((it) => add(it, false));

  const itemsJson = [...map.values()];
  const total = itemsJson.reduce((s, it) => s + it.price * it.quantity, 0);
  return { itemsJson, total };
}
