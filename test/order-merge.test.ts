import { describe, it, expect } from "vitest";
import { mergeOrderItems } from "@/lib/order-merge";
import type { OrderItem } from "@/lib/types";

const item = (variant_id: number, title: string, quantity: number, price: number): OrderItem => ({
  variant_id,
  title,
  quantity,
  price,
});

describe("mergeOrderItems", () => {
  it("sums quantities for shared variants and keeps the new price", () => {
    const old = [item(1, "A", 1, 100)];
    const fresh = [item(1, "A", 2, 90), item(2, "B", 1, 50)];
    const { itemsJson, total } = mergeOrderItems(old, fresh);

    const a = itemsJson.find((i) => i.variant_id === 1)!;
    const b = itemsJson.find((i) => i.variant_id === 2)!;
    expect(a.quantity).toBe(3);
    expect(a.price).toBe(90); // new price wins
    expect(b.quantity).toBe(1);
    expect(total).toBe(90 * 3 + 50); // 320
  });

  it("preserves old-only items at their original price", () => {
    const old = [item(9, "Old", 2, 200)];
    const fresh = [item(1, "New", 1, 80)];
    const { itemsJson, total } = mergeOrderItems(old, fresh);
    expect(itemsJson).toHaveLength(2);
    expect(itemsJson.find((i) => i.variant_id === 9)!.price).toBe(200);
    expect(total).toBe(80 + 400);
  });

  it("handles an empty previous order", () => {
    const fresh = [item(1, "A", 1, 10)];
    const { itemsJson, total } = mergeOrderItems([], fresh);
    expect(itemsJson).toHaveLength(1);
    expect(total).toBe(10);
  });
});
