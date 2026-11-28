// Compare two styles.cjs runs. Usage: node stylediff.cjs <beforeDir> <afterDir>
// At rest, elements are compared per context signature as sets of distinct subtree styles, since
// the number and order of elements shift with data. Forced states compare one element per signature.
const fs = require('fs');
const path = require('path');
const [da, db] = process.argv.slice(2);
const load = (d, f) => {
    const p = path.join(d, f);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : null;
};
const byMsg = {};
const add = (where, msg) => (byMsg[msg] ??= []).push(where);
const diffSub = (where, sig, x, y) => {
    for (const el of new Set([...Object.keys(x), ...Object.keys(y)])) {
        const p = x[el], q = y[el];
        if (!p && !q) continue;
        if (!p || !q) {
            add(where, `${sig} :: ${el} ${p ? 'missing after' : 'new after'}`);
            continue;
        }
        for (const prop of Object.keys(p))
            if (p[prop] !== q[prop]) add(where, `${sig} :: ${el} ${prop}: ${p[prop]} -> ${q[prop]}`);
    }
};
let compared = 0;
for (const f of fs.readdirSync(da).filter(f => f.endsWith('.json'))) {
    const id = f.replace(/\.json$/, ''), x = load(da, f), y = load(db, f);
    if (!y || x.error || y.error) continue;
    compared++;
    for (const sig of new Set([...Object.keys(x.rest), ...Object.keys(y.rest)])) {
        const a = [...new Set((x.rest[sig] || []).map(it => JSON.stringify(it)))];
        const b = [...new Set((y.rest[sig] || []).map(it => JSON.stringify(it)))];
        if (!a.length || !b.length) {
            add(id, `${sig} :: ${a.length ? 'missing after' : 'new after'}`);
            continue;
        }
        const bs = new Set(b);
        for (const s of a.filter(it => !bs.has(it))) {
            // Report against the closest after-variant.
            const sa = JSON.parse(s);
            let best = null, bestN = 1e9;
            for (const t of b) {
                const sb = JSON.parse(t);
                let n = 0;
                for (const el of Object.keys(sa)) for (const p in sa[el] || {}) if (sb[el]?.[p] !== sa[el][p]) n++;
                if (n < bestN) (bestN = n), (best = sb);
            }
            diffSub(`${id} rest`, sig, sa, best);
        }
    }
    for (const st of new Set([...Object.keys(x.states), ...Object.keys(y.states)])) {
        if (!x.states[st] || !y.states[st]) continue;
        diffSub(`${id}`, st, x.states[st], y.states[st]);
    }
}
console.log(`${compared} route/themes compared, ${Object.keys(byMsg).length} distinct differences`);
Object.entries(byMsg)
    .sort((p, q) => q[1].length - p[1].length)
    .slice(0, Number(process.env.LIMIT || 60))
    .forEach(([m, ks]) => console.log(`${String(ks.length).padStart(4)}  ${m}\n        e.g. ${ks[0]}`));
