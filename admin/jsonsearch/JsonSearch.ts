/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {errorMessage} from '@xh/hoist/cmp/error';
import {grid, GridConfig, gridCountLabel} from '@xh/hoist/cmp/grid';
import {a, box, filler, fragment, hframe, label, li, p, span, ul, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, SelectOption, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {buttonGroupInput, jsonInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog, popover} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';
import {JsonSearchImplModel} from './impl/JsonSearchImplModel';

export interface JsonSearchButtonProps extends HoistProps {
    /** Descriptive label for the type of records being searched - will be auto-pluralized. */
    subjectName: string;

    /** Endpoint to search and return matches - Hoist `JsonSearchController` action expected. */
    docSearchUrl: string;

    /** Config for GridModel used to display search results. */
    gridModelConfig: GridConfig;

    /** Field names on returned results to enable for grouping in the search results grid. */
    groupByOptions: Array<SelectOption | any>;
}

/**
 * Main entry point component for the JSON search feature. Supported out-of-the-box for a limited
 * set of Hoist artifacts that hold JSON values: JSONBlob, Configs, and User Preferences.
 */
export const jsonSearchButton = hoistCmp.factory<JsonSearchButtonProps>({
    displayName: 'JsonSearchButton',

    render() {
        const impl = useLocalModel(JsonSearchImplModel);

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

const jsonSearchDialog = hoistCmp.factory<JsonSearchImplModel>({
    displayName: 'JsonSearchDialog',

    render({model}) {
        const {error, subjectName} = model;

        return dialog({
            title: `JSON Search: ${subjectName}`,
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

const searchTbar = hoistCmp.factory<JsonSearchImplModel>({
    render({model}) {
        return toolbar(
            pathField({model}),
            button({
                text: `Search ${model.subjectName}`,
                intent: 'success',
                outlined: true,
                disabled: !model.path,
                onClick: () => model.loadMatchingDocsAsync()
            }),
            '-',
            helpButton({model}),
            '-',
            span('Group by:'),
            select({
                bind: 'groupBy',
                options: model.groupByOptions,
                width: 160,
                enableFilter: false
            }),
            '-',
            gridCountLabel({
                gridModel: model.gridModel,
                unit: 'match'
            })
        );
    }
});

const pathField = hoistCmp.factory<JsonSearchImplModel>({
    render({model}) {
        return textInput({
            bind: 'path',
            autoFocus: true,
            commitOnChange: true,
            leftIcon: Icon.search(),
            enableClear: true,
            placeholder: 'Provide a JSON Path expression to evaluate',
            width: null,
            flex: 1,
            onKeyDown: e => {
                if (e.key === 'Enter') model.loadMatchingDocsAsync();
            }
        });
    }
});

const helpButton = hoistCmp.factory<JsonSearchImplModel>({
    render({model}) {
        return popover({
            item: button({
                icon: Icon.questionCircle(),
                outlined: true
            }),
            content: vbox({
                className: 'xh-pad',
                items: [
                    p(
                        `JSON Path expressions allow you to recursively query JSON documents, matching nodes based on their path, properties, and values.`
                    ),
                    p(
                        `Enter a path and press [Enter] to search for matches within the JSON content of ${model.subjectName}.`
                    ),
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
                        ),
                        style: {marginTop: 0}
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

const readerTbar = hoistCmp.factory<JsonSearchImplModel>(({model}) => {
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
            fragment({
                omit: model.readerContentType !== 'matches' || !model.selectedRecord,
                items: [
                    toolbarSep(),
                    label('View path as'),
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
                ]
            }),
            filler(),
            box({
                omit: !model.matchingNodeCount,
                item: `${pluralize('match', model.matchingNodeCount, true)} within this document`
            })
        ]
    });
});

const queryExamples = [
    {
        query: '$.displayMode',
        explanation: 'Return documents with a top-level property "displayMode"'
    },
    {
        query: "$..[?(@.colId == 'trader')]",
        explanation:
            'Find all nodes (anywhere in the document) with a property "colId" equal to "trader"'
    },
    {
        query: '$..[?(@.colId && @.width)]',
        explanation: 'Find all nodes with a property "colId" and a property "width"'
    },
    {
        query: '$..[?(@.colId && @.hidden != true)]',
        explanation:
            'Find all nodes with a property "colId" and a property "hidden" not equal to true'
    },
    {
        query: '$..grid[?(@.version == 1)]',
        explanation: 'Find all nodes with a key of "grid" and a property "version" equal to 1'
    }
];
