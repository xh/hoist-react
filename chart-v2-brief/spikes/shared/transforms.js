/* eslint-disable */
// Library-neutral series transforms. In the proposed design these live in Hoist (not in any
// charting library), so every backend shows identical numbers and the logic is unit-testable.
window.CS = window.CS || {};

CS.transforms = {
    /** Percent change from values[baseIdx]. */
    rebase(values, baseIdx = 0) {
        const base = values[baseIdx];
        return values.map(v => (v == null || !base ? null : v / base - 1));
    },
    /** Simple period returns; first point null. */
    returns(values) {
        return values.map((v, i) =>
            i === 0 || values[i - 1] == null ? null : v / values[i - 1] - 1
        );
    },
    /** Cumulative return from the first point. */
    cumReturn(values) {
        return CS.transforms.rebase(values, 0);
    },
    /** Drawdown from running peak (0 at new highs, negative otherwise). */
    drawdown(values) {
        let peak = -Infinity;
        return values.map(v => {
            if (v == null) return null;
            peak = Math.max(peak, v);
            return v / peak - 1;
        });
    },
    /** Simple moving average; null until the window fills. */
    sma(values, period) {
        const out = new Array(values.length).fill(null);
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
            sum += values[i];
            if (i >= period) sum -= values[i - period];
            if (i >= period - 1) out[i] = sum / period;
        }
        return out;
    },
    /** Rolling annualized volatility of returns. */
    rollingVol(values, period, annualize = 252) {
        const r = CS.transforms.returns(values),
            out = new Array(values.length).fill(null);
        for (let i = period; i < r.length; i++) {
            const w = r.slice(i - period + 1, i + 1),
                m = w.reduce((a, b) => a + b, 0) / period,
                v = w.reduce((a, b) => a + (b - m) ** 2, 0) / (period - 1);
            out[i] = Math.sqrt(v * annualize);
        }
        return out;
    },
    /** Equal-width histogram. Returns [{x0, x1, mid, count}]. */
    histogram(values, {count = 50} = {}) {
        const vs = values.filter(v => v != null),
            min = Math.min(...vs),
            max = Math.max(...vs),
            w = (max - min) / count,
            bins = Array.from({length: count}, (_, i) => ({
                x0: min + i * w,
                x1: min + (i + 1) * w,
                count: 0
            }));
        vs.forEach(v => bins[Math.min(count - 1, Math.floor((v - min) / w))].count++);
        bins.forEach(b => (b.mid = (b.x0 + b.x1) / 2));
        return bins;
    },
    stats(values) {
        const vs = values.filter(v => v != null),
            n = vs.length,
            mean = vs.reduce((a, b) => a + b, 0) / n,
            sd = Math.sqrt(vs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
        return {n, mean, sd};
    },
    /** Normal curve scaled to histogram counts. */
    normalCurve(values, bins, points = 120) {
        const {n, mean, sd} = CS.transforms.stats(values),
            w = bins[0].x1 - bins[0].x0,
            lo = bins[0].x0,
            hi = bins[bins.length - 1].x1,
            out = [];
        for (let i = 0; i <= points; i++) {
            const x = lo + ((hi - lo) * i) / points,
                pdf = Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
            out.push([x, pdf * n * w]);
        }
        return out;
    },
    quantile(values, q) {
        const vs = values.filter(v => v != null).sort((a, b) => a - b),
            pos = (vs.length - 1) * q,
            lo = Math.floor(pos);
        return vs[lo] + (vs[Math.min(lo + 1, vs.length - 1)] - vs[lo]) * (pos - lo);
    },
    correlationMatrix(series) {
        const n = series.length,
            stats = series.map(s => {
                const m = s.reduce((a, b) => a + b, 0) / s.length;
                return {m, sd: Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0))};
            });
        return Array.from({length: n}, (_, i) =>
            Array.from({length: n}, (_, j) => {
                let c = 0;
                for (let k = 0; k < series[i].length; k++)
                    c += (series[i][k] - stats[i].m) * (series[j][k] - stats[j].m);
                return c / (stats[i].sd * stats[j].sd);
            })
        );
    },

    /**
     * Resolve one time-series series def against its source: returns {x, y} arrays.
     * Handles `field`, `transform` ('cumReturn' | 'drawdown' | 'returns' | 'rollingVol')
     * and `derive` ({fn: 'sma', field, period}). Rebasing (`compare`) is NOT applied here -
     * it depends on the visible range, so adapters apply it (natively or via `rebase`).
     */
    seriesXY(spec, s) {
        const src = CS.data.get(spec.source),
            x = src.rows.map(r => r[spec.timeField]);
        let y;
        if (s.derive) {
            const base = src.rows.map(r => r[s.derive.field]);
            y = CS.transforms[s.derive.fn](base, s.derive.period);
        } else {
            y = src.rows.map(r => r[s.field]);
            if (s.transform) {
                const t = typeof s.transform === 'string' ? {fn: s.transform} : s.transform;
                y = CS.transforms[t.fn](y, t.period);
            }
        }
        return {x, y};
    }
};
