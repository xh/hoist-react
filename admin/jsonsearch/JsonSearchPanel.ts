/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {startCase} from 'lodash';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {errorMessage} from '@xh/hoist/cmp/error';
import {grid, GridConfig, gridCountLabel} from '@xh/hoist/cmp/grid';
import {a, box, filler, h4, hframe, label, li, span, ul, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, SelectOption, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput, jsonInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {JsonSearchPanelImplModel} from './impl/JsonSearchPanelImplModel';

export interface JsonSearchPanelProps extends HoistProps {
    /** Url to endpoint for searching for matching JSON documents */
    docSearchUrl: string;

    /** Url to endpoint for listing matching JSON nodes */
    matchingNodesUrl: string;

    /**
     * Config for GridModel used to display search results.
     */
    gridModelConfig: GridConfig;

    /**
     * Names of fields that can be used to group by.
     */
    groupByOptions: Array<SelectOption | any>;
}

export const [JsonSearchPanel, jsonSearchPanel] = hoistCmp.withFactory<JsonSearchPanelProps>({
    displayName: 'JsonSearchPanel',

    render() {
        const impl = useLocalModel(JsonSearchPanelImplModel),
            {error} = impl;

        return panel({
            title: 'JSON Path Search',
            icon: Icon.json(),
            modelConfig: {
                side: 'right',
                defaultSize: '75%',
                collapsible: true,
                defaultCollapsed: true
            },
            compactHeader: true,
            tbar: searchTbar({model: impl}),
            flex: 1,
            item: panel({
                mask: impl.docLoadTask,
                items: [
                    errorMessage({
                        error,
                        title: error?.name ? startCase(error.name) : undefined
                    }),
                    hframe({
                        omit: impl.error,
                        items: [
                            panel({
                                item: grid({model: impl.gridModel})
                            }),
                            panel({
                                mask: impl.nodeLoadTask,
                                tbar: readerTbar({model: impl}),
                                bbar: nodeBbar({
                                    omit: !impl.asPathList,
                                    model: impl
                                }),
                                item: jsonInput({
                                    model: impl,
                                    bind: 'readerContent',
                                    flex: 1,
                                    width: '100%',
                                    readonly: true,
                                    showCopyButton: true
                                })
                            })
                        ]
                    })
                ]
            })
        });
    }
});

const searchTbar = hoistCmp.factory<JsonSearchPanelImplModel>(({model}) => {
    return toolbar(
        pathField({model}),
        helpButton(),
        toolbarSep(),
        span('Group by:'),
        select({
            bind: 'groupBy',
            options: model.groupByOptions,
            width: 160,
            enableFilter: false
        }),
        toolbarSep(),
        gridCountLabel({
            gridModel: model.gridModel,
            unit: 'document'
        })
    );
});

const pathField = hoistCmp.factory<JsonSearchPanelImplModel>({
    render({model}) {
        return textInput({
            bind: 'path',
            autoFocus: true,
            commitOnChange: true,
            leftIcon: Icon.search(),
            enableClear: true,
            placeholder:
                "JSON Path - e.g. $..[?(@.colId == 'trader')] - type a path and hit ENTER to search",
            width: null,
            flex: 1,
            onKeyDown: e => {
                if (e.key === 'Enter') model.loadJsonDocsAsync();
            }
        });
    }
});

const helpButton = hoistCmp.factory({
    model: false,
    render() {
        return popover({
            item: button({
                icon: Icon.questionCircle(),
                outlined: true
            }),
            content: vbox({
                style: {
                    padding: '0px 20px 10px 20px'
                },
                items: [
                    h4('Sample Queries'),
                    ul({
                        style: {listStyleType: 'none'},
                        items: [
                            {
                                query: "$..[?(@.colId == 'trader')]",
                                explanation:
                                    'Find all nodes with a property "colId" equal to "trader"'
                            }
                        ].map(({query, explanation}) =>
                            li({
                                key: query,
                                items: [
                                    span({
                                        className:
                                            'xh-border xh-pad-half xh-bg-alt xh-font-family-mono',
                                        item: query
                                    }),
                                    ' ',
                                    clipboardButton({
                                        text: null,
                                        icon: Icon.copy(),
                                        getCopyText: () => query,
                                        successMessage: 'Query copied to clipboard.'
                                    }),
                                    ' ',
                                    explanation
                                ]
                            })
                        )
                    }),
                    a({
                        href: 'https://github.com/json-path/JsonPath?tab=readme-ov-file#operators',
                        target: '_blank',
                        item: 'Path Syntax Docs & More Examples'
                    })
                ]
            })
        });
    }
});

const readerTbar = hoistCmp.factory<JsonSearchPanelImplModel>(({model}) => {
    return toolbar({
        items: [
            buttonGroupInput({
                model,
                bind: 'readerContentType',
                minimal: true,
                outlined: true,
                disabled: !model.selectedRecord,
                items: [
                    button({
                        text: 'Document',
                        value: 'document'
                    }),
                    button({
                        text: 'Matching Paths',
                        value: 'paths'
                    }),
                    button({
                        text: 'Matching Values',
                        value: 'values'
                    })
                ]
            }),
            filler(),
            box({
                omit: !model.matchingNodeCount,
                item: `${model.matchingNodeCount} ${model.matchingNodeCount === 1 ? 'match' : 'matches'}`
            })
        ]
    });
});

const nodeBbar = hoistCmp.factory<JsonSearchPanelImplModel>(({model}) => {
    return toolbar(
        label('Path Format:'),
        buttonGroupInput({
            model,
            bind: 'pathFormat',
            minimal: true,
            outlined: true,
            items: [
                button({
                    text: 'XPath',
                    value: 'XPath'
                }),
                button({
                    text: 'JSONPath',
                    value: 'JSONPath'
                })
            ]
        })
    );
});
