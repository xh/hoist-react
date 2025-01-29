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
import {
    a,
    box,
    filler,
    fragment,
    h4,
    hframe,
    label,
    li,
    span,
    ul,
    vbox
} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, SelectOption, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput, jsonInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog, popover} from '@xh/hoist/kit/blueprint';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {JsonSearchPanelImplModel} from './impl/JsonSearchPanelImplModel';

export interface JsonSearchButtonProps extends HoistProps {
    /** Name of the type of Json Documents being searched.  This appears in the dialog title. */
    subjectName: string;

    /** Url to endpoint for searching for matching JSON documents */
    docSearchUrl: string;

    /**
     * Config for GridModel used to display search results.
     */
    gridModelConfig: GridConfig;

    /**
     * Names of fields that can be used to group by.
     */
    groupByOptions: Array<SelectOption | any>;
}

export const [JsonSearchButton, jsonSearchButton] = hoistCmp.withFactory<JsonSearchButtonProps>({
    displayName: 'JsonSearchPanel',

    render() {
        const impl = useLocalModel(JsonSearchPanelImplModel);

        return fragment(
            button({
                icon: Icon.json(),
                text: 'JSON Search',
                onClick: () => impl.toggleSearchIsOpen()
            }),
            jsonSearchDialog({
                omit: !impl.isOpen,
                model: impl
            })
        );
    }
});

const jsonSearchDialog = hoistCmp.factory<JsonSearchPanelImplModel>({
    displayName: 'JsonSearchPanel',

    render({model}) {
        const {error, subjectName} = model;

        return dialog({
            title: `${subjectName} Json Search`,
            style: {
                width: '90vw',
                height: '90vh'
            },
            icon: Icon.json(),
            isOpen: true,
            className: 'xh-admin-diff-detail',
            onClose: () => model.toggleSearchIsOpen(),
            item: panel({
                tbar: searchTbar(),
                item: panel({
                    mask: model.docLoadTask,
                    items: [
                        errorMessage({
                            error,
                            title: error?.name ? startCase(error.name) : undefined
                        }),
                        hframe({
                            omit: error,
                            items: [
                                panel({
                                    item: grid({model: model.gridModel}),
                                    modelConfig: {
                                        side: 'left',
                                        defaultSize: '30%',
                                        collapsible: true,
                                        defaultCollapsed: false,
                                        resizable: true
                                    }
                                }),
                                panel({
                                    mask: model.nodeLoadTask,
                                    tbar: readerTbar(),
                                    bbar: nodeBbar({
                                        omit: model.readerContentType !== 'matches',
                                        model
                                    }),
                                    item: jsonInput({
                                        model,
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
                        items: queryExamples.map(({query, explanation}) =>
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
                        text: 'Matches',
                        value: 'matches'
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
            disabled: !model.selectedRecord,
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

const queryExamples = [
    {
        query: '$',
        explanation: 'Return the root object'
    },
    {
        query: '$..*',
        explanation: 'Return all nodes, recursively'
    },
    {
        query: '$..[?(@.colId && @.width && @.hidden != true)]',
        explanation:
            'Find all nodes with a property "colId" and a property "width" and a property "hidden" not equal to true'
    },
    {
        query: '$..[?(@.colId && @.width)]',
        explanation: 'Find all nodes with a property "colId" and a property "width"'
    },
    {
        query: "$..[?(@.colId == 'trader')]",
        explanation: 'Find all nodes with a property "colId" equal to "trader"'
    },
    {
        query: '$..grid[?(@.version == 1)]',
        explanation: 'Find all grid nodes with a property "version" equal to 1'
    }
];
