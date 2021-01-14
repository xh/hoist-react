/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

// Dark theme color vars - see and sync with vars.scss.
const bg = '#13181B',               // --xh-black
    altBg = '#151e23',              // --xh-grid-bg-odd
    borderColor = '#37474f',        // --xh-border-color
    altBorderColor = '#293233',     // --xh-grid-border-color
    textColor = '#ffffff',          // --xh-text-color
    textColorMuted = '#757575',     // --xh-text-color-muted
    accentColor = '#039be5';        // --xh-blue-light

// Font-related vars.
const fontFamily = '-apple-system, "BlinkMacSystemFont", "Segoe UI", "Open Sans", "Helvetica Neue", sans-serif',
    titleFontPx = '19px',
    labelFontPx = '10px';

/**
 * @private
 */
export const DarkTheme = {
    colors: [
        '#2b908f', '#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066',
        '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'
    ],

    chart: {
        backgroundColor: bg,
        style: {fontFamily},
        plotBorderColor: borderColor,
        resetZoomButton: {
            theme: {
                fill: altBg,
                stroke: borderColor,
                style: {color: textColor},
                r: 4,
                states: {
                    hover: {
                        fill: altBg,
                        stroke: accentColor,
                        style: {color: accentColor}
                    }
                }
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
        minorGridLineColor: '#505053',
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
        minorGridLineColor: '#505053',
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

    // TODO - review / determine if we want these
    plotOptions: {
        series: {
            dataLabels: {
                color: textColor
            },
            marker: {
                lineColor: '#333'
            }
        },
        boxplot: {
            fillColor: '#505053'
        },
        candlestick: {
            lineColor: textColor
        },
        errorbar: {
            color: textColor
        }
    },

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
            symbolStroke: textColor,
            symbolStrokeWidth: 2,
            symbolSize: 12,
            theme: {
                fill: 'transparent',
                'stroke-width': 1,
                stroke: borderColor,  // border color of button
                r: 0,   // corner radius
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
            lineColor: '#A6C7ED',
            fillOpacity: 0.2
        },
        xAxis: {
            gridLineColor: altBorderColor
        }
    },

    scrollbar: {
        barBackgroundColor: '#263238',  // --xh-scrollbar-thumb
        barBorderColor: '#263238',
        buttonArrowColor: accentColor,
        buttonBackgroundColor: '#263238',
        buttonBorderColor: borderColor,
        rifleColor: accentColor,
        trackBackgroundColor: bg,
        trackBorderColor: borderColor
    }
};
