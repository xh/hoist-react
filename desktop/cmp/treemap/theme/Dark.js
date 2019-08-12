/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * @private
 */
export const DarkTheme = {
    colors: ['#79c9fb'], // Color to use with colorMode is 'none'
    colorAxis: {
        min: 0,
        max: 1,
        stops: [
            [0, '#8e0711'], // Max negative
            [0.4, '#fee0d2'], // Min negative
            [0.5, '#1F232B'], // Zero
            [0.6, '#e5f5e0'], // Min positive
            [1, '#057009'] // Max positive
        ]
    }
};