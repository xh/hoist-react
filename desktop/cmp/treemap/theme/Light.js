/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * @private
 */
export const LightTheme = {
    // Default colors
    colorAxis: {
        min: 0,
        max: 1,
        stops: [
            [0, '#B71C1C'], // Max negative
            [0.5, '#FFFFFF'], // Zero
            [1, '#388E3C'] // Max positive
        ]
    }
};