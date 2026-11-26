export const ALLOWED_PERIOD_DAYS = [30, 60, 90, 180, 365] as const;
export type PeriodDays = (typeof ALLOWED_PERIOD_DAYS)[number];
export const DEFAULT_PERIOD_DAYS: PeriodDays = 30;
export const MAX_CUSTOM_RANGE_DAYS = 365;

export type PeriodFilter =
  | { mode: 'preset'; days: PeriodDays }
  | { mode: 'custom'; startDate: string; endDate: string };

export const DEFAULT_PERIOD_FILTER: PeriodFilter = {
  mode: 'preset',
  days: DEFAULT_PERIOD_DAYS,
};

export function normalizePeriodDays(raw: unknown): PeriodDays {
  const num = Number(raw);
  if ((ALLOWED_PERIOD_DAYS as readonly number[]).includes(num)) {
    return num as PeriodDays;
  }
  return DEFAULT_PERIOD_DAYS;
}

function parseIsoDateUtc(dateStr: string): number | null {
  if (typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

export function validateCustomDateRange(
  startDate: string,
  endDate: string
): { valid: true; spanDays: number } | { valid: false; error: string } {
  const startMs = parseIsoDateUtc(startDate);
  const endMs = parseIsoDateUtc(endDate);
  if (startMs === null || endMs === null) {
    return { valid: false, error: 'Informe datas válidas no formato DD/MM/AAAA.' };
  }
  if (startMs > endMs) {
    return { valid: false, error: 'A data inicial não pode ser maior que a data final.' };
  }
  const spanDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
  if (spanDays > MAX_CUSTOM_RANGE_DAYS) {
    return {
      valid: false,
      error: `O período personalizado pode ter no máximo ${MAX_CUSTOM_RANGE_DAYS} dias (selecionado: ${spanDays} dias).`,
    };
  }
  return { valid: true, spanDays };
}

export function normalizePeriodFilter(input?: unknown): PeriodFilter {
  if (typeof input === 'number' || typeof input === 'string') {
    return { mode: 'preset', days: normalizePeriodDays(input) };
  }
  if (input && typeof input === 'object') {
    const obj = input as { mode?: unknown; days?: unknown; startDate?: unknown; endDate?: unknown };
    if (
      typeof obj.startDate === 'string' &&
      typeof obj.endDate === 'string' &&
      obj.startDate.trim() !== '' &&
      obj.endDate.trim() !== '' &&
      (obj.mode === 'custom' || obj.mode === undefined)
    ) {
      const startDate = obj.startDate.trim();
      const endDate = obj.endDate.trim();
      const validation = validateCustomDateRange(startDate, endDate);
      if (validation.valid) {
        return { mode: 'custom', startDate, endDate };
      }
    }
    if (obj.days !== undefined && obj.days !== null) {
      return { mode: 'preset', days: normalizePeriodDays(obj.days) };
    }
  }
  return DEFAULT_PERIOD_FILTER;
}

export function getPeriodCacheKey(filter: PeriodFilter): string {
  if (filter.mode === 'custom') {
    return `custom_${filter.startDate}_${filter.endDate}`;
  }
  return `${filter.days}d`;
}

export function getPeriodQueryParams(filter: PeriodFilter): string {
  if (filter.mode === 'custom') {
    return `startDate=${encodeURIComponent(filter.startDate)}&endDate=${encodeURIComponent(filter.endDate)}`;
  }
  return `days=${filter.days}`;
}

function formatBrDate(iso: string, includeYear: boolean): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return includeYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

export function formatPeriodLabel(filter: PeriodFilter): {
  short: string;
  compact: string;
  phrase: string;
} {
  if (filter.mode === 'preset') {
    return {
      short: `${filter.days}d`,
      compact: `${filter.days}d`,
      phrase: `nos últimos ${filter.days} dias`,
    };
  }
  const sameYear = filter.startDate.slice(0, 4) === filter.endDate.slice(0, 4);
  const startFull = formatBrDate(filter.startDate, true);
  const endFull = formatBrDate(filter.endDate, true);
  const compact = sameYear
    ? `${formatBrDate(filter.startDate, false)}–${formatBrDate(filter.endDate, false)}`
    : `${filter.startDate.slice(8, 10)}/${filter.startDate.slice(5, 7)}/${filter.startDate.slice(2, 4)}–${filter.endDate.slice(8, 10)}/${filter.endDate.slice(5, 7)}/${filter.endDate.slice(2, 4)}`;
  return {
    short: `${startFull} – ${endFull}`,
    compact,
    phrase: `de ${startFull} a ${endFull}`,
  };
}

/**
 * Injeta a janela de período dinâmico nas consultas Oracle:
 * - Modo preset (30, 60, 90, 180, 365): substitui `/* DYNAMIC_PERIOD_DAYS *\/` e padrões legados `- 90` / `ADD_MONTHS(..., -3)`
 * - Modo personalizado (data inicial e final, até 365 dias): converte `COL >= TRUNC(SYSDATE) - ...` em janela fechada inclusiva usando `TO_DATE`
 * - Preserva intactos períodos específicos (`SYSDATE - 1`, `TRUNC(SYSDATE) - 7`, `TRUNC(SYSDATE) - 30`)
 */
export function applyPeriodMacro(sql: string, period: number | PeriodFilter): string {
  if (!sql) return sql;
  const filter = normalizePeriodFilter(period);

  if (filter.mode === 'custom') {
    const validation = validateCustomDateRange(filter.startDate, filter.endDate);
    const spanDays = validation.valid ? validation.spanDays : DEFAULT_PERIOD_DAYS;
    const conditionRegex =
      /([A-Z0-9_."$]+)\s*>=\s*(?:TRUNC\s*\(\s*SYSDATE\s*\)\s*-\s*(?:\/\*\s*DYNAMIC_PERIOD_DAYS\s*\*\/|90\b)|ADD_MONTHS\s*\(\s*SYSDATE\s*,\s*-3\s*\))/gi;

    let result = sql.replace(
      conditionRegex,
      (_match, col: string) =>
        `(${col} >= TO_DATE('${filter.startDate}', 'YYYY-MM-DD') AND ${col} < TO_DATE('${filter.endDate}', 'YYYY-MM-DD') + 1)`
    );

    if (/\/\*\s*DYNAMIC_PERIOD_DAYS\s*\*\//i.test(result)) {
      result = result.replace(/\/\*\s*DYNAMIC_PERIOD_DAYS\s*\*\//gi, String(spanDays));
    }
    return result;
  }

  const safeDays = filter.days;
  if (/\/\*\s*DYNAMIC_PERIOD_DAYS\s*\*\//i.test(sql)) {
    return sql.replace(/\/\*\s*DYNAMIC_PERIOD_DAYS\s*\*\//gi, String(safeDays));
  }

  return sql
    .replace(/TRUNC\s*\(\s*SYSDATE\s*\)\s*-\s*90\b/gi, `TRUNC(SYSDATE) - ${safeDays}`)
    .replace(/ADD_MONTHS\s*\(\s*SYSDATE\s*,\s*-3\s*\)/gi, `TRUNC(SYSDATE) - ${safeDays}`);
}
