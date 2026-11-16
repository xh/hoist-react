/* eslint-disable */
// Deterministic synthetic financial data, exposed as named data sources with typed field
// metadata - a stand-in for Hoist Store / Cube sources in the real design. Every adapter
// reads the same rows, so differences between libraries are rendering differences only.
window.CS = window.CS || {};

(function () {
    // ---------- seeded random ----------
    function mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function gaussian(rand) {
        let u = 0,
            v = 0;
        while (u === 0) u = rand();
        while (v === 0) v = rand();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    // ---------- trading calendar (NYSE-like, approximate) ----------
    const DAY = 86400000;
    function nthWeekday(y, m, wd, n) {
        // n >= 1 => nth; n = -1 => last
        if (n > 0) {
            const first = new Date(Date.UTC(y, m, 1)).getUTCDay(),
                d = 1 + ((wd - first + 7) % 7) + (n - 1) * 7;
            return Date.UTC(y, m, d);
        }
        const lastDay = new Date(Date.UTC(y, m + 1, 0)),
            diff = (lastDay.getUTCDay() - wd + 7) % 7;
        return Date.UTC(y, m, lastDay.getUTCDate() - diff);
    }
    function holidays(y) {
        return new Set([
            Date.UTC(y, 0, 1),
            nthWeekday(y, 0, 1, 3), // MLK
            nthWeekday(y, 1, 1, 3), // Presidents
            nthWeekday(y, 4, 1, -1), // Memorial
            Date.UTC(y, 5, 19),
            Date.UTC(y, 6, 4),
            nthWeekday(y, 8, 1, 1), // Labor
            nthWeekday(y, 10, 4, 4), // Thanksgiving
            Date.UTC(y, 11, 25)
        ]);
    }
    function tradingDays(startMs, endMs) {
        const out = [],
            hcache = {};
        for (let t = startMs; t <= endMs; t += DAY) {
            const d = new Date(t),
                wd = d.getUTCDay(),
                y = d.getUTCFullYear();
            if (wd === 0 || wd === 6) continue;
            hcache[y] = hcache[y] || holidays(y);
            if (hcache[y].has(t)) continue;
            out.push(t);
        }
        return out;
    }

    // ---------- NAV panel: fund + 3 benchmarks, ~10y daily ----------
    function buildNavs() {
        const rand = mulberry32(42),
            dates = tradingDays(Date.UTC(2016, 10, 15), Date.UTC(2026, 10, 13)),
            covidStart = Date.UTC(2020, 1, 20),
            covidLow = Date.UTC(2020, 2, 23),
            bear22Start = Date.UTC(2022, 0, 4),
            bear22End = Date.UTC(2022, 9, 12);
        let vol = 0.009,
            lv = {FUND: 100, SPX: 100, MSCIW: 100, B6040: 100};
        const rows = [];
        dates.forEach((date, i) => {
            if (i > 0) {
                // stochastic vol with mean reversion
                vol = Math.max(0.004, vol + 0.06 * (0.0095 - vol) + 0.0009 * gaussian(rand));
                let mDrift = 0.1 / 252,
                    bDrift = 0.035 / 252,
                    v = vol;
                if (date >= covidStart && date <= covidLow) {
                    mDrift = -0.012;
                    v = 0.035;
                } else if (date > covidLow && date <= covidLow + 60 * DAY) {
                    mDrift = 0.0045;
                    v = 0.022;
                }
                if (date >= bear22Start && date <= bear22End) {
                    mDrift = -0.0011;
                    bDrift = -0.0006;
                }
                const m = mDrift + v * gaussian(rand),
                    bond = bDrift + 0.004 * gaussian(rand) - 0.08 * m,
                    fx = 0.004 * gaussian(rand),
                    r = {
                        SPX: m,
                        MSCIW: 0.9 * m + fx - 0.012 / 252,
                        B6040: 0.6 * m + 0.4 * bond,
                        FUND: 0.04 / 252 + 0.42 * m + 0.0045 * gaussian(rand)
                    };
                for (const k in lv) lv[k] *= 1 + r[k];
            }
            rows.push({date, FUND: lv.FUND, SPX: lv.SPX, MSCIW: lv.MSCIW, B6040: lv.B6040});
        });
        return {
            name: 'navs',
            fields: [
                {name: 'date', type: 'date', label: 'Date'},
                {
                    name: 'FUND',
                    type: 'number',
                    label: 'Flagship Fund',
                    format: {type: 'number', precision: 2}
                },
                {
                    name: 'SPX',
                    type: 'number',
                    label: 'S&P 500 TR',
                    format: {type: 'number', precision: 2}
                },
                {
                    name: 'MSCIW',
                    type: 'number',
                    label: 'MSCI World',
                    format: {type: 'number', precision: 2}
                },
                {
                    name: 'B6040',
                    type: 'number',
                    label: '60/40 Blend',
                    format: {type: 'number', precision: 2}
                }
            ],
            rows
        };
    }

    // ---------- OHLCV: one stock, ~2y daily ----------
    function buildOhlc() {
        const rand = mulberry32(7),
            dates = tradingDays(Date.UTC(2024, 10, 13), Date.UTC(2026, 10, 13)),
            rows = [];
        let close = 142.5;
        dates.forEach((date, i) => {
            const drift = Math.sin(i / 60) * 0.0012 + 0.0003,
                ret = drift + 0.019 * gaussian(rand),
                open = close * (1 + 0.004 * gaussian(rand)),
                c = open * (1 + ret),
                hi = Math.max(open, c) * (1 + Math.abs(0.007 * gaussian(rand))),
                lo = Math.min(open, c) * (1 - Math.abs(0.007 * gaussian(rand))),
                volume = Math.round(
                    2.4e6 * (1 + Math.abs(ret) * 35) * Math.exp(0.35 * gaussian(rand))
                );
            rows.push({date, open, high: hi, low: lo, close: c, volume});
            close = c;
        });
        return {
            name: 'ohlc',
            fields: [
                {name: 'date', type: 'date', label: 'Date'},
                {
                    name: 'open',
                    type: 'number',
                    label: 'Open',
                    format: {type: 'number', precision: 2}
                },
                {
                    name: 'high',
                    type: 'number',
                    label: 'High',
                    format: {type: 'number', precision: 2}
                },
                {name: 'low', type: 'number', label: 'Low', format: {type: 'number', precision: 2}},
                {
                    name: 'close',
                    type: 'number',
                    label: 'Close',
                    format: {type: 'number', precision: 2}
                },
                {
                    name: 'volume',
                    type: 'int',
                    label: 'Volume',
                    format: {type: 'number', precision: 0, compact: true}
                }
            ],
            rows
        };
    }

    // ---------- Stress: N series x M one-minute points, columnar ----------
    function buildStress({seriesCount = 4, points = 250000} = {}) {
        const rand = mulberry32(99),
            start = Date.UTC(2026, 0, 1),
            t = new Float64Array(points),
            series = [];
        for (let i = 0; i < points; i++) t[i] = start + i * 60000;
        for (let s = 0; s < seriesCount; s++) {
            const ys = new Float64Array(points);
            let y = 100 + s * 15;
            for (let i = 0; i < points; i++) {
                y *= 1 + 0.0007 * gaussian(rand);
                ys[i] = y;
            }
            series.push(ys);
        }
        return {
            name: 'stress',
            columnar: true,
            fields: [
                {name: 't', type: 'date', label: 'Time'},
                ...series.map((_, i) => ({
                    name: 's' + (i + 1),
                    type: 'number',
                    label: 'Series ' + (i + 1)
                }))
            ],
            t,
            series,
            pointInterval: 60000,
            pointStart: start
        };
    }

    // ---------- Correlation matrix from simulated factor-model returns ----------
    function buildCorr() {
        const rand = mulberry32(2026),
            assets = [
                'US Eq',
                'EU Eq',
                'JP Eq',
                'EM Eq',
                'US IG',
                'US HY',
                'UST 10Y',
                'Bund',
                'Gold',
                'Oil',
                'USD',
                'BTC'
            ],
            // loadings on [equity, rates, commodity, usd, crypto]
            L = [
                [1.0, -0.1, 0.1, -0.1, 0.2],
                [0.85, -0.05, 0.15, -0.35, 0.15],
                [0.6, 0.0, 0.05, 0.3, 0.1],
                [0.8, -0.1, 0.35, -0.5, 0.2],
                [0.15, 0.8, 0.0, 0.0, 0.0],
                [0.55, 0.35, 0.1, -0.1, 0.1],
                [-0.25, 1.0, -0.1, 0.1, -0.05],
                [-0.15, 0.85, -0.05, -0.2, 0.0],
                [0.05, 0.35, 0.5, -0.45, 0.1],
                [0.35, -0.2, 0.9, -0.2, 0.05],
                [-0.2, 0.15, -0.25, 1.0, -0.1],
                [0.4, -0.05, 0.05, -0.15, 1.0]
            ],
            n = 756,
            rets = assets.map(() => new Float64Array(n));
        for (let d = 0; d < n; d++) {
            const f = [0, 0, 0, 0, 0].map(() => gaussian(rand));
            for (let a = 0; a < assets.length; a++) {
                let r = 0.5 * gaussian(rand);
                for (let k = 0; k < 5; k++) r += L[a][k] * f[k];
                rets[a][d] = r;
            }
        }
        const matrix = CS.transforms.correlationMatrix(rets),
            rows = [];
        assets.forEach((x, i) => assets.forEach((y, j) => rows.push({x, y, value: matrix[i][j]})));
        return {
            name: 'corr',
            fields: [
                {name: 'x', type: 'string', label: 'Asset'},
                {name: 'y', type: 'string', label: 'Asset'},
                {
                    name: 'value',
                    type: 'number',
                    label: 'Correlation',
                    format: {type: 'number', precision: 2}
                }
            ],
            categories: assets,
            rows
        };
    }

    // ---------- Capital allocation flows for sankey ----------
    function buildFlows() {
        const rows = [
            ['Flagship Fund', 'Equity L/S', 350],
            ['Flagship Fund', 'Global Macro', 250],
            ['Flagship Fund', 'Credit', 200],
            ['Flagship Fund', 'Quant', 150],
            ['Flagship Fund', 'Cash', 50],
            ['Equity L/S', 'North America', 190],
            ['Equity L/S', 'Europe', 90],
            ['Equity L/S', 'APAC', 70],
            ['Global Macro', 'North America', 80],
            ['Global Macro', 'Europe', 60],
            ['Global Macro', 'APAC', 50],
            ['Global Macro', 'EM', 60],
            ['Credit', 'North America', 120],
            ['Credit', 'Europe', 60],
            ['Credit', 'EM', 20],
            ['Quant', 'North America', 70],
            ['Quant', 'Europe', 40],
            ['Quant', 'APAC', 40],
            ['Cash', 'North America', 50]
        ].map(([from, to, value]) => ({from, to, value}));
        return {
            name: 'flows',
            fields: [
                {name: 'from', type: 'string', label: 'From'},
                {name: 'to', type: 'string', label: 'To'},
                {
                    name: 'value',
                    type: 'number',
                    label: 'Allocation ($mm)',
                    format: {type: 'number', precision: 0}
                }
            ],
            rows
        };
    }

    const builders = {
            navs: buildNavs,
            ohlc: buildOhlc,
            stress: buildStress,
            corr: buildCorr,
            flows: buildFlows
        },
        cache = {};

    CS.data = {
        DAY,
        /** Get a named source. Options only apply to 'stress'. */
        get(name, opts) {
            const key = name + (opts ? JSON.stringify(opts) : '');
            if (!cache[key]) cache[key] = builders[name](opts);
            return cache[key];
        },
        field(source, name) {
            return source.fields.find(f => f.name === name);
        }
    };
})();
