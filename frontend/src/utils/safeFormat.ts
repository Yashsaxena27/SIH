/**
 * Safe formatting utilities to prevent NaN, undefined, or Infinity errors in the UI.
 */

export const safeNumber = (val: any, fallback: number = 0): number => {
    if (val === null || val === undefined || isNaN(Number(val)) || !isFinite(Number(val))) {
        return fallback;
    }
    return Number(val);
};

export const formatPercent = (val: any): string => {
    return `${safeNumber(val, 0).toFixed(1)}%`;
};

export const formatMetric = (val: any): string => {
    return safeNumber(val, 0).toLocaleString();
};

export const formatDate = (dateStr: any): string => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    } catch {
        return 'Invalid Date';
    }
};
