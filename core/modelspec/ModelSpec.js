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
    publishMode;

    constructor(fromContext, publishMode) {
        this.fromContext = fromContext;
        this.publishMode = publishMode;
    }
}

/**
 * Options for how a Model should be published to context.
 *
 * @enum {ModelPublishMode}
 * @see {uses}
 * @see {creates}
 */
export const ModelPublishMode = Object.freeze({

    /**
     * Model may be looked up from context using wildcard ('*') and model's top-level
     * properties will also be searched for an appropriate model during lookup.  This is the
     * default mode and typical mode used by application models.
     */
    DEFAULT: 'default',

    /**
     *  Model may be looked up via context using an explicit selector, but NOT wildcard (*).
     *  Model's internal properties will never be searched for matching models during lookup.
     *  Useful for component or toolkit models that should be available for querying via context,
     *  but are not intended to serve as default models or model providers.
     */
    LIMITED: 'limited',

    /**
     * Do not publish the model to context.
     */
    NONE: 'none'
});