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
    colors: [
        '#2b908f', '#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066',
        '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'
    ],
    chart: {
        backgroundColor: '#1F232B',
        plotBorderColor: '#606063',
        resetZoomButton: {
            position: {
                x: -30,
                y: 0
            },
            theme: {
                fill: '#232D38',
                stroke: '#A0A0A3',
                style: {
                    color: '#b3b3b3'
                },
                r: 0,
                states: {
                    hover: {
                        fill: '#3B4C5F',
                        style: {
                            color: '#D0D0D0'
                        }
                    }
                }
            }
        }
    },
    title: {
        style: {
            color: '#E0E0E3',
            textTransform: 'uppercase',
            fontSize: '20px'
        }
    },
    subtitle: {
        style: {
            color: '#E0E0E3',
            textTransform: 'uppercase'
        }
    },
    xAxis: {
        gridLineColor: '#2d323b',
        gridLineWidth: 1,
        labels: {
            style: {
                fontSize: '9px',
                color: '#E0E0E3'
            }
        },
        lineColor: '#707073',
        minorGridLineColor: '#505053',
        tickColor: '#707073',
        tickLength: 5,
        title: {
            style: {
                color: '#A0A0A3'

            }
        }
    },
    yAxis: {
        alternateGridColor: '#232D38',
        gridLineColor: '#2d323b',
        labels: {
            style: {
                fontSize: '9px',
                color: '#E0E0E3'
            }
        },
        lineColor: '#707073',
        minorGridLineColor: '#505053',
        tickColor: '#707073',
        tickLength: 5,
        tickWidth: 1,
        lineWidth: 1,
        title: {
            style: {
                color: '#A0A0A3'
            }
        }
    },
    tooltip: {
        backgroundColor: '#1F232B',
        borderColor: '#606063',
        style: {
            color: '#F0F0F0'
        }
    },
    plotOptions: {
        series: {
            dataLabels: {
                color: '#B0B0B3'
            },
            marker: {
                lineColor: '#333'
            }
        },
        boxplot: {
            fillColor: '#505053'
        },
        candlestick: {
            lineColor: 'white'
        },
        errorbar: {
            color: 'white'
        }
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

    drilldown: {
        activeAxisLabelStyle: {
            color: '#F0F0F3'
        },
        activeDataLabelStyle: {
            color: '#F0F0F3'
        }
    },

    navigation: {
        buttonOptions: {
            symbolStroke: '#b3b3b3',
            theme: {
                fill: '#232D38',
                'stroke-width': 1,
                stroke: '#A0A0A3',  // border color of button
                r: 0,   // corner radius
                states: {
                    hover: {
                        stroke: '#D0D0D0',
                        fill: '#3B4C5F'
                    },
                    select: {
                        stroke: '#D0D0D0',
                        fill: '#3B4C5F'
                    }
                }
            }
        },
        menuStyle: {
            background: '#2d323b',
            border: '1px solid #707073',
            padding: '5px 0',
            boxShadow: 'none'
        },
        menuItemStyle: {
            fontWeight: 'normal',
            background: '#232D38',
            color: '#b9b9b9'
        },
        menuItemHoverStyle: {
            fontWeight: 'normal',
            background: '#232D38',
            color: '#DDDDDD'

        }
    },

    // scroll charts
    rangeSelector: {
        buttonTheme: {
            fill: '#505053',
            stroke: '#000000',
            style: {
                color: '#CCC'
            },
            states: {
                hover: {
                    fill: '#707073',
                    stroke: '#000000',
                    style: {
                        color: 'white'
                    }
                },
                select: {
                    fill: '#000003',
                    stroke: '#000000',
                    style: {
                        color: 'white'
                    }
                }
            }
        },
        inputBoxBorderColor: '#505053',
        inputStyle: {
            backgroundColor: '#333',
            color: 'silver'
        },
        labelStyle: {
            color: 'silver'
        }
    },

    navigator: {
        handles: {
            backgroundColor: '#666',
            borderColor: '#AAA'
        },
        outlineColor: '#CCC',
        maskFill: 'rgba(255,255,255,0.1)',
        series: {
            color: '#7798BF',
            lineColor: '#A6C7ED'
        },
        xAxis: {
            gridLineColor: '#505053'
        }
    },

    scrollbar: {
        barBackgroundColor: '#808083',
        barBorderColor: '#808083',
        buttonArrowColor: '#CCC',
        buttonBackgroundColor: '#606063',
        buttonBorderColor: '#606063',
        rifleColor: '#FFF',
        trackBackgroundColor: '#404043',
        trackBorderColor: '#404043'
    },

    legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
    background2: '#505053',
    dataLabelsColor: '#B0B0B3',
    textColor: '#C0C0C0',
    contrastTextColor: '#F0F0F3',
    maskColor: 'rgba(255,255,255,0.3)'

};