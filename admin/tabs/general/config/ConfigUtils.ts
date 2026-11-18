/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
export interface ResolvedConfigJson {
    /** Pretty-printed JSON text of the resolved value. */
    text: string;
    /** 1-based line numbers of the changed keys passed to `buildResolvedJson`. */
    highlightLines: number[];
}

/**
 * Dot-paths of every key present in a stored config value - i.e. the keys explicitly set,
 * vs. supplied by typedClass defaults. Recurses into nested objects; arrays are atomic.
 */
export function changedKeysFromStored(stored: any): string[] {
    const out: string[] = [];
    const walk = (obj: any, prefix: string) => {
        if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return;
        for (const k of Object.keys(obj)) {
            const path = prefix ? `${prefix}.${k}` : k;
            out.push(path);
            walk(obj[k], path);
        }
    };
    walk(stored, '');
    return out;
}

/**
 * Render a config value to pretty-printed JSON text alongside the line numbers of the given
 * `changedKeys`, produced together so the mapping is exact. Output format matches
 * `JSON.stringify(value, null, 2)`.
 */
export function buildResolvedJson(value: any, changedKeys: string[] = []): ResolvedConfigJson {
    const changedSet = new Set(changedKeys),
        lines: {text: string; changed: boolean}[] = [],
        indent = '  ';

    // `changed` styles ALL of a value's lines as a unit. `uniform` forces it onto the whole
    // subtree (arrays are atomic); otherwise nested keys re-evaluate against `changedSet`.
    const emit = (
        prefix: string,
        val: any,
        depth: number,
        path: string,
        changed: boolean,
        comma: boolean,
        uniform: boolean
    ) => {
        const pad = indent.repeat(depth),
            tail = comma ? ',' : '';

        if (val != null && typeof val === 'object' && !Array.isArray(val)) {
            const keys = Object.keys(val);
            if (!keys.length) {
                lines.push({text: `${pad}${prefix}{}${tail}`, changed});
                return;
            }
            lines.push({text: `${pad}${prefix}{`, changed});
            keys.forEach((k, i) => {
                const childPath = path ? `${path}.${k}` : k,
                    childChanged = uniform ? changed : changedSet.has(childPath);
                emit(
                    `${JSON.stringify(k)}: `,
                    val[k],
                    depth + 1,
                    childPath,
                    childChanged,
                    i < keys.length - 1,
                    uniform
                );
            });
            lines.push({text: `${pad}}${tail}`, changed});
        } else if (Array.isArray(val)) {
            if (!val.length) {
                lines.push({text: `${pad}${prefix}[]${tail}`, changed});
                return;
            }
            lines.push({text: `${pad}${prefix}[`, changed});
            val.forEach((item, i) =>
                emit('', item, depth + 1, path, changed, i < val.length - 1, true)
            );
            lines.push({text: `${pad}]${tail}`, changed});
        } else {
            lines.push({text: `${pad}${prefix}${JSON.stringify(val)}${tail}`, changed});
        }
    };

    emit('', value, 0, '', false, false, false);

    return {
        text: lines.map(l => l.text).join('\n'),
        highlightLines: lines.reduce((acc, l, i) => (l.changed ? [...acc, i + 1] : acc), [])
    };
}
