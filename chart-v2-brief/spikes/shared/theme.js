/* eslint-disable */
// Hoist chart theme tokens - the single source every adapter reads.
// Surface, border, grid and text values mirror hoist-react cmp/chart/theme/{Light,Dark}.ts
// and styles/vars.scss. The categorical palette is a CVD-validated 8-slot palette
// (validated against the Hoist light #ffffff and dark #13181B surfaces), proposed to
// replace the legacy Highcharts "dark unica" colors Hoist ships today.
window.CS = window.CS || {};

CS.themes = {
    light: {
        name: 'light',
        bg: '#ffffff',
        altBg: '#f5f5f5', // --xh-grid-bg-odd
        border: '#bdbdbd', // --xh-border-color
        grid: '#e6e6e6', // --xh-grid-border-color
        text: '#263238', // --xh-text-color
        textMuted: '#757575', // --xh-text-color-muted
        accent: '#039be5', // --xh-blue-light
        tooltipBg: '#f5f5f5',
        navigatorMask: 'rgba(3,155,229,0.12)',
        fontFamily: 'InterVariable, Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 11,
        series: [
            '#2a78d6',
            '#eb6834',
            '#1baf7a',
            '#eda100',
            '#e87ba4',
            '#008300',
            '#6250d6',
            '#e34948'
        ],
        up: '#2e7d32', // --xh-green (light)
        down: '#c62828', // --xh-red family (light)
        negative: '#c62828',
        diverging: ['#b8352f', '#e88d84', '#f0efec', '#86b6ef', '#1c5cab'], // -1 .. 0 .. +1
        sequential: ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b']
    },
    dark: {
        name: 'dark',
        bg: '#13181B', // --xh-black (dark)
        altBg: '#151e23', // --xh-grid-bg-odd (dark)
        border: '#37474f',
        grid: '#293233',
        text: '#ffffff',
        textMuted: '#9e9e9e',
        accent: '#039be5',
        tooltipBg: '#1c252b',
        navigatorMask: 'rgba(3,155,229,0.18)',
        fontFamily: 'InterVariable, Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 11,
        series: [
            '#3987e5',
            '#d95926',
            '#199e70',
            '#c98500',
            '#d55181',
            '#0ca30c',
            '#9085e9',
            '#e66767'
        ],
        up: '#00cc00', // --xh-green (dark) hsl(120,100%,40%)
        down: '#ff4d55', // --xh-red (dark) hsl(357,100%,65%)
        negative: '#ff4d55',
        diverging: ['#e66767', '#8a3b3b', '#383835', '#2f5f9e', '#5598e7'],
        sequential: ['#104281', '#1c5cab', '#3987e5', '#86b6ef', '#cde2fb']
    }
};

/** Number formatting shared by adapters - mirrors Hoist's fmtNumber / fmtPercent conventions. */
CS.fmt = {
    number(v, {precision = 2, compact = false} = {}) {
        if (v == null || isNaN(v)) return '-';
        if (compact) {
            const a = Math.abs(v);
            if (a >= 1e9) return (v / 1e9).toFixed(1) + 'b';
            if (a >= 1e6) return (v / 1e6).toFixed(1) + 'm';
            if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k';
        }
        return v.toLocaleString('en-US', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });
    },
    /** Value is a fraction (0.05 = 5%). */
    percent(v, {precision = 1, signed = false} = {}) {
        if (v == null || isNaN(v)) return '-';
        const s = (v * 100).toFixed(precision) + '%';
        return signed && v > 0 ? '+' + s : s;
    },
    date(ms, {intraday = false} = {}) {
        const d = new Date(ms),
            m = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec'
            ][d.getUTCMonth()],
            base = `${String(d.getUTCDate()).padStart(2, '0')}-${m}-${d.getUTCFullYear()}`;
        if (!intraday) return base;
        return `${base} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    },
    /** Apply a spec-level format object: {type: 'number'|'percent', precision, compact, signed}. */
    apply(v, f = {}) {
        return f.type === 'percent' ? CS.fmt.percent(v, f) : CS.fmt.number(v, f);
    }
};
