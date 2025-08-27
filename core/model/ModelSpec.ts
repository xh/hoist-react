/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {CreatesSpec, UsesSpec, HoistModel} from './';

/**
 * Specification for model to be rendered by a HoistComponent.
 * See {@link uses} and {@link creates} for standard factories that produce instances of this type.
 * @internal
 */
export type ModelSpec<T extends HoistModel = HoistModel> = CreatesSpec<T> | UsesSpec<T>;

/**
 * Options for how a Model should be published to context.
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

// eslint-disable-next-line
export type ModelPublishMode = (typeof ModelPublishMode)[keyof typeof ModelPublishMode];
