/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {range} from 'lodash';

// Theme colors, read from the Hoist CSS vars so charts follow app-level theme overrides.
const bg = 'var(--xh-bg)',
    altBg = 'var(--xh-grid-odd-row-bg)',
    borderColor = 'var(--xh-border-color)',
    altBorderColor = 'var(--xh-grid-border-color)',
    textColor = 'var(--xh-text-color)',
    textColorMuted = 'var(--xh-text-color-muted)',
    accentColor = 'var(--xh-blue-light)',
    seriesColors = range(1, 11).map(i => `var(--xh-chart-color-${i})`);

// Font-related vars.
const fontFamily =
        '-apple-system, "BlinkMacSystemFont", "Segoe UI", "Open Sans", "Helvetica Neue", sans-serif',
    titleFontPx = '19px',
    labelFontPx = '10px';

/**
 * @internal
 */
export const LightTheme = {
    colors: seriesColors,

    chart: {
        backgroundColor: bg,
        style: {fontFamily},
        plotBorderColor: borderColor,
        resetZoomButton: {
            theme: {
                fill: altBg,
                stroke: borderColor,
                style: {color: textColor},
                r: 4
            }
        }
    },

    title: {
        style: {color: textColor, fontSize: titleFontPx}
    },

    subtitle: {
        style: {color: textColor}
    },

    xAxis: {
        gridLineColor: altBorderColor,
        gridLineWidth: 1,
        labels: {
            style: {
                color: textColor,
                fontSize: labelFontPx
            }
        },
        lineColor: borderColor,
        // minorGridLineColor: '#505053',
        tickColor: borderColor,
        tickLength: 5,
        title: {style: {color: textColor}}
    },

    yAxis: {
        alternateGridColor: altBg,
        gridLineColor: altBorderColor,
        labels: {
            style: {
                color: textColor,
                fontSize: labelFontPx
            }
        },
        lineColor: borderColor,
        lineWidth: 1,
        // minorGridLineColor: '#505053',
        tickColor: borderColor,
        tickLength: 5,
        tickWidth: 1,
        title: {style: {color: textColor}}
    },

    tooltip: {
        backgroundColor: altBg,
        borderColor: borderColor,
        style: {color: textColor}
    },

    // TODO - plotOptions?

    legend: {
        itemStyle: {
            color: textColor
        },
        itemHoverStyle: {
            color: accentColor
        },
        itemHiddenStyle: {
            color: textColorMuted
        }
    },

    labels: {
        style: {
            color: textColorMuted
        }
    },

    navigation: {
        buttonOptions: {
            symbolStroke: textColorMuted,
            symbolStrokeWidth: 2,
            symbolSize: 12,
            theme: {
                fill: 'transparent',
                'stroke-width': 1,
                stroke: borderColor, // border color of button
                r: 0, // corner radius
                states: {
                    hover: {
                        fill: 'transparent',
                        stroke: borderColor
                    },
                    select: {
                        fill: 'transparent',
                        stroke: borderColor
                    }
                }
            }
        },
        menuStyle: {
            background: altBg,
            border: `1px solid ${borderColor}`,
            padding: '5px 0',
            boxShadow: 'none'
        },
        menuItemStyle: {
            fontWeight: 'normal',
            background: altBg,
            color: textColor
        },
        menuItemHoverStyle: {
            fontWeight: 'normal',
            background: altBg,
            color: accentColor
        }
    },

    rangeSelector: {
        buttonTheme: {
            fill: 'transparent',
            stroke: borderColor,
            'stroke-width': 1,
            style: {color: textColor},
            states: {
                hover: {
                    fill: 'transparent',
                    stroke: borderColor,
                    style: {color: accentColor}
                },
                select: {
                    fill: 'transparent',
                    stroke: accentColor,
                    style: {color: accentColor}
                }
            }
        },
        inputBoxBorderColor: borderColor,
        inputStyle: {
            backgroundColor: altBg,
            color: textColor
        },
        labelStyle: {
            color: textColor
        }
    },

    navigator: {
        handles: {
            backgroundColor: '#666',
            borderColor: borderColor
        },
        outlineColor: borderColor,
        outlineWidth: 1,
        maskFill: 'rgba(255,255,255,0.1)',
        series: {
            color: '#7798BF',
            lineColor: '#A6C7ED'
        },
        xAxis: {
            gridLineColor: altBorderColor
        }
    },

    scrollbar: {
        barBackgroundColor: '#90a4ae', // --xh-scrollbar-thumb-color
        barBorderColor: '#cfd8dc',
        buttonArrowColor: 'white',
        buttonBackgroundColor: '#90a4ae',
        buttonBorderColor: '#cfd8dc',
        rifleColor: 'white',
        trackBackgroundColor: '#cfd8dc', // xh-scrollbar-bg
        trackBorderColor: borderColor
    }
};
