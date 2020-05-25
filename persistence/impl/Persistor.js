/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {ReactiveSupport} from '@xh/hoist/core';
import {action} from '@xh/hoist/mobx';
import {cloneDeep, upperFirst, isUndefined} from 'lodash';


/**
 * Hydrate an observable property on an object from a persistence provider and observe
 * and write back any changes.
 * @private
 */
@ReactiveSupport
export class Persistor {

    pvd;
    pvdPath;
    obj;
    objPath;

    constructor({pvd, pvdPath, obj, objPath}) {
        this.pvd = pvd;
        this.pvdPath = pvdPath;
        this.obj = obj;
        this.objPath = objPath;

        this.hydrate();

        this.addReaction({
            track: () => obj[objPath],
            run: (data) => pvd.write(pvdPath, data)
        });
    }


    //----------------
    // Implementation
    //----------------
    hydrate() {
        const {pvd, pvdPath, obj, objPath} = this;

        let pvdData = pvd.read(pvdPath);
        if (!isUndefined(pvdData)) {
            pvdData = cloneDeep(pvdData);
            const camelPath = upperFirst(objPath);
            const setter =
                obj[`hydrate${camelPath}`] ??
                obj[`set${camelPath}`] ??
                action(it => obj[objPath] = it);


            setter.call(obj, pvdData);
        }
    }
}

