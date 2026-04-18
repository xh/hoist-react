/**
 * Benchmark: impact of expanding MEMBER_INDEXED_CLASSES on index and search.
 *
 * Runs several treatments against the same ts-morph project, measuring:
 *   - index build time
 *   - member entry count + approximate bytes
 *   - search latency across a fixed query corpus
 *   - result-count distribution (noise indicator)
 *   - per-query top-5 results and any interesting before/after diffs
 *
 * Mirrors the search semantics in mcp/data/ts-registry.ts at HEAD (post
 * commit 6c8213f70), i.e. symbol search = key + jsDoc + memberNames,
 * member search = owner + name + jsDoc.
 */

import {Project, Node, Scope} from 'ts-morph';
import type {
    ClassDeclaration,
    InterfaceDeclaration,
    PropertyDeclaration,
    MethodDeclaration,
    GetAccessorDeclaration
} from 'ts-morph';
import {performance} from 'node:perf_hooks';
import {resolve as pathResolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// --------------------------------------------------------------
// Config
// --------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(__dirname, '../..'); // mcp/planning -> mcp -> repo root

interface IndexedMember {
    name: string;
    owner: string;
    kind: 'property' | 'method' | 'accessor';
    jsDoc: string;
}

interface IndexedSymbol {
    name: string;
    kind: 'class' | 'interface';
    jsDoc: string;
    filePath: string;
    isExported: boolean;
    /** Space-separated own member names, populated for classes whose members are indexed. */
    memberNames: string;
}

interface Treatment {
    id: string;
    label: string;
    classes: Set<string>;
}

// --------------------------------------------------------------
// Treatment definitions
// --------------------------------------------------------------

const T0_CURRENT = new Set([
    'HoistBase',
    'HoistModel',
    'HoistService',
    'XHApi',
    'GridModel',
    'Column',
    'Store',
    'StoreRecord',
    'StoreSelectionModel',
    'Field',
    'RecordAction',
    'Cube',
    'CubeField',
    'View',
    'FormModel',
    'BaseFieldModel',
    'FieldModel',
    'TabContainerModel'
]);

// --------------------------------------------------------------
// Load project once
// --------------------------------------------------------------

function skipFile(filePath: string): boolean {
    const rel = filePath.slice(REPO_ROOT.length);
    return (
        !filePath.startsWith(REPO_ROOT + '/') ||
        rel.startsWith('/node_modules/') ||
        rel.includes('/build/') ||
        rel.includes('/mcp/')
    );
}

function extractJsDoc(node: {getJsDocs?: () => Array<{getDescription: () => string}>}): string {
    try {
        const docs = node.getJsDocs?.();
        if (!docs || docs.length === 0) return '';
        return docs
            .map(d => d.getDescription().trim())
            .filter(Boolean)
            .join('\n');
    } catch {
        return '';
    }
}

interface ClassRef {
    name: string;
    filePath: string;
    isExported: boolean;
    jsDoc: string;
    decl: ClassDeclaration;
}
interface InterfaceRef {
    name: string;
    filePath: string;
    isExported: boolean;
    jsDoc: string;
    decl: InterfaceDeclaration;
}

function loadProject(): {
    project: Project;
    classes: ClassRef[];
    interfaces: InterfaceRef[];
    parseMs: number;
} {
    const t0 = performance.now();
    const project = new Project({
        tsConfigFilePath: pathResolve(REPO_ROOT, 'tsconfig.json'),
        skipAddingFilesFromTsConfig: false
    });
    const parseMs = performance.now() - t0;

    const classes: ClassRef[] = [];
    const interfaces: InterfaceRef[] = [];
    for (const sf of project.getSourceFiles()) {
        if (skipFile(sf.getFilePath())) continue;
        for (const cls of sf.getClasses()) {
            const name = cls.getName();
            if (!name) continue;
            classes.push({
                name,
                filePath: sf.getFilePath(),
                isExported: cls.isExported(),
                jsDoc: extractJsDoc(cls),
                decl: cls
            });
        }
        for (const iface of sf.getInterfaces()) {
            const name = iface.getName();
            if (!name) continue;
            interfaces.push({
                name,
                filePath: sf.getFilePath(),
                isExported: iface.isExported(),
                jsDoc: extractJsDoc(iface),
                decl: iface
            });
        }
    }
    return {project, classes, interfaces, parseMs};
}

// --------------------------------------------------------------
// Build treatments derived from the loaded project
// --------------------------------------------------------------

function buildT3(classes: ClassRef[]): Set<string> {
    const s = new Set<string>(T0_CURRENT);
    for (const c of classes) if (c.isExported) s.add(c.name);
    return s;
}

function buildT4(classes: ClassRef[], interfaces: InterfaceRef[]): Set<string> {
    const s = buildT3(classes);
    for (const i of interfaces) if (i.isExported) s.add(i.name);
    return s;
}

/** T3 + exported `*Config` interfaces only. */
function buildT3_Config(classes: ClassRef[], interfaces: InterfaceRef[]): Set<string> {
    const s = buildT3(classes);
    for (const i of interfaces) {
        if (i.isExported && i.name.endsWith('Config')) s.add(i.name);
    }
    return s;
}

/** T3 + exported `*Config` and `*Spec` interfaces. */
function buildT3_ConfigSpec(classes: ClassRef[], interfaces: InterfaceRef[]): Set<string> {
    const s = buildT3(classes);
    for (const i of interfaces) {
        if (!i.isExported) continue;
        if (i.name.endsWith('Config') || i.name.endsWith('Spec')) s.add(i.name);
    }
    return s;
}

// --------------------------------------------------------------
// Member extraction (simplified vs. production: we don't need types)
// --------------------------------------------------------------

function isPrivate(
    member: PropertyDeclaration | MethodDeclaration | GetAccessorDeclaration,
    _cls: ClassDeclaration
): boolean {
    const name = member.getName?.();
    if (name && name.startsWith('_')) return true;
    try {
        const scope = (member as unknown as {getScope?: () => string}).getScope?.();
        if (scope === Scope.Private) return true;
    } catch {
        // ignore
    }
    return false;
}

function extractClassMembers(cls: ClassDeclaration, name: string): IndexedMember[] {
    const out: IndexedMember[] = [];
    try {
        for (const prop of cls.getInstanceProperties()) {
            const pname = prop.getName?.();
            if (!pname) continue;
            if (isPrivate(prop as unknown as PropertyDeclaration, cls)) continue;
            out.push({
                name: pname,
                owner: name,
                kind: Node.isGetAccessorDeclaration(prop) ? 'accessor' : 'property',
                jsDoc: extractJsDoc(
                    prop as unknown as {getJsDocs?: () => Array<{getDescription: () => string}>}
                )
            });
        }
        for (const m of cls.getInstanceMethods()) {
            const pname = m.getName();
            if (!pname) continue;
            if (isPrivate(m, cls)) continue;
            out.push({
                name: pname,
                owner: name,
                kind: 'method',
                jsDoc: extractJsDoc(m)
            });
        }
    } catch {
        // skip
    }
    return out;
}

function extractInterfaceMembers(iface: InterfaceDeclaration, name: string): IndexedMember[] {
    const out: IndexedMember[] = [];
    try {
        for (const prop of iface.getProperties()) {
            out.push({
                name: prop.getName(),
                owner: name,
                kind: 'property',
                jsDoc: extractJsDoc(prop)
            });
        }
        for (const m of iface.getMethods()) {
            out.push({
                name: m.getName(),
                owner: name,
                kind: 'method',
                jsDoc: extractJsDoc(m)
            });
        }
    } catch {
        // skip
    }
    return out;
}

// --------------------------------------------------------------
// Index + search for one treatment
// --------------------------------------------------------------

interface BuiltIndex {
    symbolIndex: Map<string, IndexedSymbol[]>;
    memberIndex: Map<string, IndexedMember[]>;
    buildMs: number;
    classCount: number;
    memberCount: number;
    bytes: number;
}

function buildIndex(
    treatmentClasses: Set<string>,
    classes: ClassRef[],
    interfaces: InterfaceRef[]
): BuiltIndex {
    const t0 = performance.now();

    const symbolIndex = new Map<string, IndexedSymbol[]>();
    const memberIndex = new Map<string, IndexedMember[]>();
    const memberNamesByClass = new Map<string, string[]>();

    // Symbol-level entries for all classes and interfaces
    for (const c of classes) {
        const entry: IndexedSymbol = {
            name: c.name,
            kind: 'class',
            jsDoc: c.jsDoc,
            filePath: c.filePath,
            isExported: c.isExported,
            memberNames: ''
        };
        const k = c.name.toLowerCase();
        const ex = symbolIndex.get(k);
        if (ex) ex.push(entry);
        else symbolIndex.set(k, [entry]);
    }
    for (const i of interfaces) {
        const entry: IndexedSymbol = {
            name: i.name,
            kind: 'interface',
            jsDoc: i.jsDoc,
            filePath: i.filePath,
            isExported: i.isExported,
            memberNames: ''
        };
        const k = i.name.toLowerCase();
        const ex = symbolIndex.get(k);
        if (ex) ex.push(entry);
        else symbolIndex.set(k, [entry]);
    }

    // Member entries for classes + interfaces in the treatment set
    let memberCount = 0;
    for (const c of classes) {
        if (!treatmentClasses.has(c.name)) continue;
        const mems = extractClassMembers(c.decl, c.name);
        const ownNames: string[] = [];
        for (const m of mems) {
            ownNames.push(m.name);
            const k = m.name.toLowerCase();
            const ex = memberIndex.get(k);
            if (ex) ex.push(m);
            else memberIndex.set(k, [m]);
            memberCount++;
        }
        const prev = memberNamesByClass.get(c.name) ?? [];
        memberNamesByClass.set(c.name, prev.concat(ownNames));
    }
    for (const i of interfaces) {
        if (!treatmentClasses.has(i.name)) continue;
        const mems = extractInterfaceMembers(i.decl, i.name);
        const ownNames: string[] = [];
        for (const m of mems) {
            ownNames.push(m.name);
            const k = m.name.toLowerCase();
            const ex = memberIndex.get(k);
            if (ex) ex.push(m);
            else memberIndex.set(k, [m]);
            memberCount++;
        }
        const prev = memberNamesByClass.get(i.name) ?? [];
        memberNamesByClass.set(i.name, prev.concat(ownNames));
    }

    // Populate memberNames on symbol entries (minus inherited HoistBase/HoistModel noise)
    const baseMembers = new Set(
        [
            ...(memberNamesByClass.get('HoistBase') ?? []),
            ...(memberNamesByClass.get('HoistModel') ?? [])
        ].map(n => n.toLowerCase())
    );
    for (const [owner, all] of memberNamesByClass) {
        if (owner === 'HoistBase' || owner === 'HoistModel') continue;
        const filtered = all.filter(n => !baseMembers.has(n.toLowerCase()));
        if (filtered.length === 0) continue;
        const k = owner.toLowerCase();
        const entries = symbolIndex.get(k);
        if (!entries) continue;
        for (const e of entries) {
            if (e.name === owner) e.memberNames = filtered.join(' ');
        }
    }

    const buildMs = performance.now() - t0;

    // Approximate memory footprint: serialize a slimmed view.
    const slim: Array<[string, number, string]> = [];
    for (const [k, v] of memberIndex) {
        for (const m of v) slim.push([k, m.owner.length, m.jsDoc]);
    }
    const bytes = Buffer.byteLength(JSON.stringify(slim), 'utf8');

    return {
        symbolIndex,
        memberIndex,
        buildMs,
        classCount: treatmentClasses.size,
        memberCount,
        bytes
    };
}

// --------------------------------------------------------------
// Search (HEAD semantics: post 6c8213f70)
// --------------------------------------------------------------

interface SymbolHit {
    name: string;
    kind: string;
    via: 'name' | 'jsDoc' | 'memberNames';
}
interface MemberHit {
    name: string;
    owner: string;
    via: 'name' | 'owner' | 'jsDoc';
}

function searchSymbols(idx: Map<string, IndexedSymbol[]>, q: string): SymbolHit[] {
    const lc = q.toLowerCase().trim();
    if (!lc) return [];
    const tokens = lc.split(/\s+/);
    const out: SymbolHit[] = [];
    for (const [key, entries] of idx) {
        for (const e of entries) {
            const jsDocLower = e.jsDoc.toLowerCase();
            const memberNamesLower = e.memberNames.toLowerCase();
            const searchable = key + ' ' + jsDocLower + ' ' + memberNamesLower;
            if (!tokens.every(t => searchable.includes(t))) continue;
            const inName = tokens.every(t => key.includes(t));
            const inMembers = tokens.every(t => memberNamesLower.includes(t));
            out.push({
                name: e.name,
                kind: e.kind,
                via: inName ? 'name' : inMembers ? 'memberNames' : 'jsDoc'
            });
        }
    }
    return out;
}

function searchMembers(idx: Map<string, IndexedMember[]>, q: string): MemberHit[] {
    const lc = q.toLowerCase().trim();
    if (!lc) return [];
    const tokens = lc.split(/\s+/);
    const out: MemberHit[] = [];
    for (const [key, entries] of idx) {
        for (const m of entries) {
            const owner = m.owner.toLowerCase();
            const jsDoc = m.jsDoc.toLowerCase();
            const searchable = owner + ' ' + key + ' ' + jsDoc;
            if (!tokens.every(t => searchable.includes(t))) continue;
            const inName = tokens.every(t => key.includes(t));
            const inOwner = !inName && tokens.every(t => owner.includes(t));
            out.push({
                name: m.name,
                owner: m.owner,
                via: inName ? 'name' : inOwner ? 'owner' : 'jsDoc'
            });
        }
    }
    return out;
}

// --------------------------------------------------------------
// Query corpus
// --------------------------------------------------------------

const QUERIES: Array<{q: string; tag: string; expected?: string}> = [
    // Targeted - property/method names agents will reasonably search
    {q: 'cubeLabel', tag: 'targeted', expected: 'ViewRowData.cubeLabel'},
    {q: 'cubeDimension', tag: 'targeted', expected: 'ViewRowData.cubeDimension'},
    {q: 'executeQuery', tag: 'targeted', expected: 'Cube.executeQuery'},
    {q: 'renderMode', tag: 'targeted', expected: 'multiple models'},
    {q: 'viewSpecs', tag: 'targeted', expected: 'DashModel.viewSpecs'},
    {q: 'layoutLocked', tag: 'targeted', expected: 'DashModel.layoutLocked'},
    {q: 'omitFn', tag: 'targeted', expected: 'Cube / CubeConfig'},

    // Generic - dilution / noise indicators
    {q: 'label', tag: 'generic'},
    {q: 'id', tag: 'generic'},
    {q: 'title', tag: 'generic'},
    {q: 'disabled', tag: 'generic'},
    {q: 'value', tag: 'generic'},
    {q: 'model', tag: 'generic'},
    {q: 'config', tag: 'generic'},

    // Multi-word
    {q: 'StoreRecord raw', tag: 'multiword', expected: 'StoreRecord.raw'},
    {q: 'panel modal', tag: 'multiword'},
    {q: 'cube view', tag: 'multiword'},
    {q: 'grid sorting', tag: 'multiword'},

    // Exact symbol names
    {q: 'GridModel', tag: 'name'},
    {q: 'DashContainerModel', tag: 'name'}
];

// --------------------------------------------------------------
// Run
// --------------------------------------------------------------

function runTreatment(t: Treatment, classes: ClassRef[], interfaces: InterfaceRef[]) {
    const idx = buildIndex(t.classes, classes, interfaces);

    // Warm pass
    for (const q of QUERIES) {
        searchSymbols(idx.symbolIndex, q.q);
        searchMembers(idx.memberIndex, q.q);
    }

    const latencies: number[] = [];
    const perQuery: Array<{
        q: string;
        tag: string;
        symbolCount: number;
        memberCount: number;
        symbolTop: string[];
        memberTop: string[];
        memberVia: Record<string, number>;
    }> = [];

    for (const q of QUERIES) {
        let iters = 0;
        const tStart = performance.now();
        let syms: SymbolHit[] = [];
        let mems: MemberHit[] = [];
        while (performance.now() - tStart < 30) {
            syms = searchSymbols(idx.symbolIndex, q.q);
            mems = searchMembers(idx.memberIndex, q.q);
            iters++;
        }
        const totalMs = performance.now() - tStart;
        const perCallMs = totalMs / iters;
        latencies.push(perCallMs);

        const via: Record<string, number> = {name: 0, owner: 0, jsDoc: 0};
        for (const m of mems) via[m.via] = (via[m.via] ?? 0) + 1;

        perQuery.push({
            q: q.q,
            tag: q.tag,
            symbolCount: syms.length,
            memberCount: mems.length,
            symbolTop: syms.slice(0, 5).map(s => `${s.name}/${s.kind}(${s.via})`),
            memberTop: mems.slice(0, 5).map(m => `${m.owner}.${m.name}(${m.via})`),
            memberVia: via
        });
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const max = sorted[sorted.length - 1];

    return {
        treatment: t,
        idx,
        perQuery,
        latencyMs: {median, max, all: latencies}
    };
}

async function main() {
    console.log('Loading project (this parses the whole repo)...');
    const {classes, interfaces, parseMs} = loadProject();
    console.log(`Parse time: ${parseMs.toFixed(0)} ms`);
    console.log(`Classes: ${classes.length}, Interfaces: ${interfaces.length}`);
    const exportedClassCount = classes.filter(c => c.isExported).length;
    const exportedInterfaceCount = interfaces.filter(i => i.isExported).length;
    console.log(
        `Exported classes: ${exportedClassCount}, exported interfaces: ${exportedInterfaceCount}`
    );

    const treatments: Treatment[] = [
        {id: 'T0', label: 'Current (18 classes)', classes: T0_CURRENT},
        {id: 'T3', label: 'All exported classes', classes: buildT3(classes)},
        {
            id: 'T3c',
            label: 'T3 + exported *Config interfaces',
            classes: buildT3_Config(classes, interfaces)
        },
        {
            id: 'T3cs',
            label: 'T3 + exported *Config and *Spec',
            classes: buildT3_ConfigSpec(classes, interfaces)
        },
        {id: 'T4', label: 'T3 + all exported interfaces', classes: buildT4(classes, interfaces)}
    ];

    const results = treatments.map(t => {
        const r = runTreatment(t, classes, interfaces);
        console.log(`\n[${t.id}] ${t.label}`);
        console.log(`  classes indexed: ${r.idx.classCount}`);
        console.log(`  member entries:  ${r.idx.memberCount}`);
        console.log(`  build time:      ${r.idx.buildMs.toFixed(0)} ms`);
        console.log(`  approx bytes:    ${(r.idx.bytes / 1024).toFixed(0)} KB`);
        console.log(`  search median:   ${r.latencyMs.median.toFixed(3)} ms/query`);
        console.log(`  search p100:     ${r.latencyMs.max.toFixed(3)} ms/query`);
        return r;
    });

    // Comparative query table
    console.log(
        '\n\n=== Per-query results (symbol count / member count / median member names) ==='
    );
    const header = [
        'query'.padEnd(24),
        'tag'.padEnd(10),
        ...treatments.map(t => t.id.padEnd(18))
    ].join(' | ');
    console.log(header);
    console.log('-'.repeat(header.length));
    for (let qi = 0; qi < QUERIES.length; qi++) {
        const row = [QUERIES[qi].q.padEnd(24), QUERIES[qi].tag.padEnd(10)];
        for (const r of results) {
            const pq = r.perQuery[qi];
            row.push(
                `s=${String(pq.symbolCount).padStart(3)} m=${String(pq.memberCount).padStart(4)}`.padEnd(
                    18
                )
            );
        }
        console.log(row.join(' | '));
    }

    // Focused diffs: how the big queries look across treatments
    console.log('\n\n=== Spotlight: targeted queries – top 5 member hits ===');
    for (let qi = 0; qi < QUERIES.length; qi++) {
        const Q = QUERIES[qi];
        if (Q.tag !== 'targeted' && Q.tag !== 'multiword') continue;
        console.log(`\n  "${Q.q}"  expected: ${Q.expected ?? 'n/a'}`);
        for (const r of results) {
            const pq = r.perQuery[qi];
            const hits = pq.memberTop.length ? pq.memberTop.join(', ') : '(none)';
            console.log(
                `    ${r.treatment.id}: member=${pq.memberCount}  via=${JSON.stringify(pq.memberVia)}  → ${hits}`
            );
        }
    }

    // Noise snapshot
    console.log('\n\n=== Noise profile: generic queries – total member result counts ===');
    const noiseRows: string[] = [];
    noiseRows.push(
        ['generic query'.padEnd(18), ...treatments.map(t => t.id.padEnd(8))].join(' | ')
    );
    for (let qi = 0; qi < QUERIES.length; qi++) {
        if (QUERIES[qi].tag !== 'generic') continue;
        const row = [QUERIES[qi].q.padEnd(18)];
        for (const r of results) row.push(String(r.perQuery[qi].memberCount).padEnd(8));
        noiseRows.push(row.join(' | '));
    }
    console.log(noiseRows.join('\n'));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
