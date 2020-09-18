/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp, ModelPublishMode} from '@xh/hoist/core';
import {useContext} from 'react';
import {ModelLookupContext} from '@xh/hoist/core/impl/ModelLookup';

/**
 * @private
 *
 * Insert into the graphical hierarchy to put helpful info about
 * Hoist's model context into the console.
 */
export const modelContextHelper = hoistCmp.factory({
    render({name = 'Anon'}) {
        let lookup = useContext(ModelLookupContext);
        const lookups = [];
        for (let l = lookup; l ; l = l.parent) {
            lookups.push(l);
        }
        const msg = lookups.map(m => {
            const {name} = m.model.constructor,
                mode = m.publishMode === ModelPublishMode.LIMITED ? '(L)' : '';
            return name + mode;
        }).join(' -> ');
        console.debug('Lookup from ' + name);
        console.debug(msg);
        console.dir(lookup);

        return null;
    }
});
