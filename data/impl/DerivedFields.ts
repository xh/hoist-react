/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Field} from '../Field';
import {isEmpty} from 'lodash';

/**
 * The given field names plus, transitively, every derived field reading any of them - a change
 * to an input is a change to the fields derived from it. Returns the input set itself when
 * nothing is added.
 * @internal
 */
export function withDerivedDependents(names: Set<string>, derivedFields: Field[]): Set<string> {
    if (isEmpty(derivedFields) || !names.size) return names;

    let ret = names;
    for (let added = true; added;) {
        added = false;
        derivedFields.forEach(({name, dependsOn}) => {
            if (!ret.has(name) && dependsOn.some(it => ret.has(it))) {
                if (ret === names) ret = new Set(names);
                ret.add(name);
                added = true;
            }
        });
    }
    return ret;
}
