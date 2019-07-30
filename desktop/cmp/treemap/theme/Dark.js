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
    // Default colors
    colorAxis: {
        min: 0,
        max: 1,
        stops: [
            [0, '#D50000'], // Max negative
            [0.5, '#1F232B'], // Zero
            [1, '#009E0A'] // Max positive
        ]
    },

    // Theme
    chart: {
        backgroundColor: '#1F232B',
        plotBorderColor: '#606063'
    },

    legend: {
        itemStyle: {
            color: '#E0E0E3'
        },
        itemHoverStyle: {
            color: '#FFF'
        },
        itemHiddenStyle: {
            color: '#606063'
        }
    },

    labels: {
        style: {
            color: '#707073'
        }
    },

    legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
    background2: '#505053',
    dataLabelsColor: '#B0B0B3',
    textColor: '#C0C0C0',
    contrastTextColor: '#F0F0F3',
    maskColor: 'rgba(255,255,255,0.3)'
};