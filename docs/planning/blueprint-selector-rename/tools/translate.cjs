// Translate BlueprintBase.css rules for one component onto Hoist's xh-* classes.
//
// Usage: node translate.cjs <spec.cjs> <BlueprintBase.css> <outDir>
//
// The spec names "anchor" classes (e.g. bp6-button) and, per anchor, a map from each bp6 class that
// can sit on that same element to its xh-* replacement. Every compound selector holding an anchor
// class is rewritten through its map; any other compound is "context" and goes through
// spec.contextMap (unmapped context classes are left as-is). A map value may be a function of the
// compound's class names, for a class that Blueprint puts on more than one element. A selector is dropped, and reported,
// when it holds a class on an anchored element that the component never renders.
//
// Rules are split three ways:
//   own      - every selector is about the component alone: written translated to own.css,
//              and (unless spec.keepOriginals) removed from the base file.
//   context  - a selector also names another component's class (spec.foreignContext): the
//              translated selectors are added to the same rule in place, so the rule keeps its
//              cascade position until that component moves.
//   skipped  - selectors whose context marks markup that never holds this component
//              (spec.skipContext): left untouched.
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const sp = require('postcss-selector-parser');

const [specPath, basePath, outDir] = process.argv.slice(2);
const spec = require(path.resolve(specPath));
const css = fs.readFileSync(basePath, 'utf8');
const root = postcss.parse(css);
fs.mkdirSync(outDir, {recursive: true});

const anchors = Object.keys(spec.anchors);
const report = {dropped: [], own: 0, context: 0, skipped: 0};

// Classes in compounds that hold no anchor class - the selector's context.
const contextClasses = sel => {
    const out = [];
    const compounds = [[]];
    sel.each(n => (n.type === 'combinator' ? compounds.push([]) : compounds[compounds.length - 1].push(n)));
    for (const c of compounds) {
        const cls = [];
        c.forEach(n => (n.type === 'class' ? cls.push(n.value) : null));
        if (!cls.some(x => anchors.includes(x))) out.push(...cls);
    }
    return out;
};
const hasContext = (sel, re) => re && contextClasses(sel).some(c => re.test(c));

const hasClass = (sel, re) => {
    let hit = false;
    sel.walkClasses(c => {
        if (re.test(c.value)) hit = true;
    });
    return hit;
};

// Translate one selector (a postcss-selector-parser Selector node). Returns string or null.
function translate(selector) {
    const sel = selector.clone();
    // Split into compounds: sequences of nodes between combinators.
    const compounds = [[]];
    sel.each(n => {
        if (n.type === 'combinator') compounds.push([]);
        else compounds[compounds.length - 1].push(n);
    });
    let ok = true;
    for (const compound of compounds) {
        const classes = [];
        compound.forEach(n => n.walk ? n.walk(x => x.type === 'class' && classes.push(x)) : null);
        compound.forEach(n => n.type === 'class' && classes.push(n));
        const anchor = anchors.find(a => classes.some(c => c.value === a));
        const map = anchor ? spec.anchors[anchor] : spec.contextMap;
        for (const n of compound) {
            const rewrite = node => {
                if (node.type === 'class') {
                    let to = map[node.value];
                    // A function maps a class by the other classes in its compound.
                    if (typeof to === 'function') to = to(classes.map(c => c.value));
                    if (to === undefined) {
                        if (anchor && node.value.startsWith('bp6-')) ok = false;
                        return;
                    }
                    if (to === null) ok = false;
                    else node.replaceWith(sp().astSync(to, {lossless: false}).first.first);
                } else if (node.type === 'attribute') {
                    const key = node.toString().replace(/[\s"']/g, '');
                    const to = (anchor ? map : spec.contextMap)[key];
                    if (to === null) ok = false;
                    else if (to !== undefined) node.replaceWith(sp().astSync(to).first.first);
                    else if (/bp/.test(key)) ok = false;
                }
            };
            if (n.type === 'pseudo' && n.nodes?.length) {
                // :not(...) and friends - rewrite the inner selector's nodes
                const inner = n.toString().replace(/[\s"']/g, '');
                if (anchor && spec.pseudoMap?.[inner] !== undefined) {
                    const to = spec.pseudoMap[inner];
                    if (to === null) ok = false;
                    else if (to === '') n.remove();
                    else n.replaceWith(sp().astSync(to).first.first);
                    continue;
                }
                n.walk(rewrite);
            } else rewrite(n);
        }
    }
    return ok ? sel.toString().trim() : null;
}

const own = [];
root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const sels = sp().astSync(rule.selector).nodes;
    const relevant = sels.filter(s => anchors.some(a => hasClass(s, new RegExp(`^${a}$`))));
    if (!relevant.length) return;

    const translated = [];
    let foreign = false;
    for (const s of relevant) {
        const str = s.toString().trim();
        if (hasContext(s, spec.skipContext)) {
            report.skipped++;
            continue;
        }
        if (hasContext(s, spec.foreignContext)) foreign = true;
        const t = translate(s);
        // spec.dropSelectors leaves out translated selectors that match it.
        if (t == null || spec.dropSelectors?.test(t)) report.dropped.push(str);
        else translated.push(t);
    }
    if (!translated.length) return;

    const others = sels.filter(s => !relevant.includes(s));
    const allOwn =
        !foreign && !others.length && relevant.every(s => !hasContext(s, spec.skipContext));

    const keep = spec.keepOriginals && relevant.some(s => spec.keepOriginals(s.toString()));
    if (allOwn && !keep) {
        report.own++;
        own.push({rule, translated});
    } else if (foreign) {
        report.context++;
        rule.selector = [...sels.map(s => s.toString().trim()), ...translated].join(',\n');
    } else {
        report.own++;
        own.push({rule, translated, keep: true});
    }
});

// Emit own rules, keeping any wrapping at-rules, in source order.
const out = postcss.root();
for (const {rule, translated, keep} of own) {
    const clone = rule.clone({selector: translated.join(',\n')});
    // spec.dropDecls leaves out named properties of a rule, keyed by its translated selector.
    const drop = spec.dropDecls?.[clone.selector];
    if (drop) clone.nodes.filter(d => d.type === 'decl' && drop.includes(d.prop)).forEach(d => d.remove());
    if (!clone.nodes.length) continue;
    let node = clone;
    for (let p = rule.parent; p && p.type === 'atrule'; p = p.parent) {
        const at = p.clone({nodes: []});
        at.append(node);
        node = at;
    }
    out.append(node);
    if (!keep) {
        const parent = rule.parent;
        rule.remove();
        if (parent.type === 'atrule' && !parent.nodes.length) parent.remove();
    }
}
fs.writeFileSync(path.join(outDir, 'own.css'), out.toString());
fs.writeFileSync(path.join(outDir, 'base.css'), root.toString());
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`own ${report.own}, context ${report.context}, skipped ${report.skipped}, dropped ${report.dropped.length}`);
