/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

export interface ResolvedConfigJson {
    /** Pretty-printed JSON text of the resolved value. */
    text: string;
    /** 1-based line numbers whose key was explicitly set in the DB value (vs. a default). */
    highlightLines: number[];
}

/** Static helpers for the Admin Console config editor. */
export class ConfigUtils {
    /**
     * Dot-paths of every key present in a stored config value - i.e. the keys explicitly set (as
     * opposed to supplied by typedClass defaults). Computed client-side from the raw DB value so no
     * server round-trip is required. Recurses into nested objects; arrays are treated atomically.
     */
    static changedKeysFromStored(stored: any): string[] {
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
     * Render a resolved typed-config value to pretty-printed JSON text, alongside the line numbers
     * of the keys explicitly set in the stored value (`changedKeys`) - for display in a read-only
     * code editor with those lines highlighted. Text + line numbers are produced together so the
     * mapping is exact. Arrays are treated atomically, matching the server's changed-key computation.
     */
    static buildResolvedJson(value: any, changedKeys: string[] = []): ResolvedConfigJson {
        const changedSet = new Set(changedKeys),
            lines: {text: string; changed: boolean}[] = [],
            indent = '  ';

        // Emit the lines for a value. `changed` = whether the key introducing it is changed; this
        // applies to ALL of the value's lines (opening, contents, closing bracket) so multi-line
        // values are styled as a unit. `uniform` forces that status onto the whole subtree (arrays
        // are atomic); otherwise nested object keys are re-evaluated individually against `changedSet`.
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
                // Arrays are atomic - the entire value inherits the key's status.
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
}
