/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * A small function composer
 *
 */

export const compose = (...fns) =>
    arg =>
        fns.reduce(
            (composed, f) => f(composed),
            arg
        );