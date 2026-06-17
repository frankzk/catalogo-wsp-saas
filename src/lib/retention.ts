/**
 * Pure retention-cohort builder (no server imports → unit-testable).
 * Customers are identified by phone (COD orders). Cohorts are monthly: the
 * month of a customer's FIRST order, then the % that order again in each
 * subsequent month offset (M0 = 100% by definition).
 */

export interface CohortRow {
  cohort: string; // label, e.g. "ene 2026"
  size: number; // customers in the cohort
  values: (number | null)[]; // retention % per offset (null = month in the future)
}

export interface RetentionData {
  offsets: number[];
  cohorts: CohortRow[];
  hasData: boolean;
}

function monthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function monthLabel(idx: number): string {
  const year = Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12;
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("es", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildRetentionMatrix(
  rows: { phone: string | null; created_at: string }[],
  now: Date = new Date(),
  opts: { maxOffset?: number; maxCohorts?: number } = {},
): RetentionData {
  const maxOffsetCap = opts.maxOffset ?? 5;
  const maxCohorts = opts.maxCohorts ?? 8;

  // Per-customer: first-order month + the set of months they ordered in.
  const byPhone = new Map<string, { first: number; months: Set<number> }>();
  for (const r of rows) {
    if (!r.phone) continue;
    const idx = monthIndex(new Date(r.created_at));
    const rec = byPhone.get(r.phone);
    if (rec) {
      rec.first = Math.min(rec.first, idx);
      rec.months.add(idx);
    } else {
      byPhone.set(r.phone, { first: idx, months: new Set([idx]) });
    }
  }

  if (byPhone.size === 0) return { offsets: [], cohorts: [], hasData: false };

  const cohortMembers = new Map<number, Set<number>[]>();
  for (const rec of byPhone.values()) {
    const arr = cohortMembers.get(rec.first) ?? [];
    arr.push(rec.months);
    cohortMembers.set(rec.first, arr);
  }

  const cohortIdxAsc = [...cohortMembers.keys()].sort((a, b) => a - b);
  const earliest = cohortIdxAsc[0];
  const current = monthIndex(now);
  const maxOffset = Math.max(0, Math.min(maxOffsetCap, current - earliest));
  const offsets = Array.from({ length: maxOffset + 1 }, (_, k) => k);

  // Show the most recent cohorts, displayed oldest-first.
  const shown = cohortIdxAsc.slice(-maxCohorts);

  const cohorts: CohortRow[] = shown.map((cIdx) => {
    const members = cohortMembers.get(cIdx)!;
    const size = members.length;
    const values = offsets.map((k) => {
      if (cIdx + k > current) return null; // future month — no data yet
      const active = members.filter((m) => m.has(cIdx + k)).length;
      return size ? (active / size) * 100 : 0;
    });
    return { cohort: monthLabel(cIdx), size, values };
  });

  return { offsets, cohorts, hasData: true };
}
