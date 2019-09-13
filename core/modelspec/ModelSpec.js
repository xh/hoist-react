/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * Specification for model to be rendered by a functional HoistComponent.
 *
 * Applications should not instantiate this class directly. Instead, {@see uses()} and
 * {@see creates()} for standard factories that produce instances of this class.
 *
 * @private
 */
export class ModelSpec {
    fromContext;
    toContext;


    constructor(fromContext, toContext) {
        this.fromContext = fromContext;
        this.toContext = toContext;
    }
}