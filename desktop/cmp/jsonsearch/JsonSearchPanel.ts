/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {JsonBlobModel} from '@xh/hoist/admin/tabs/userData/jsonblob/JsonBlobModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {a, box, filler, hframe, label} from '@xh/hoist/cmp/layout';
import {hoistCmp, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput, jsonInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';

import {JsonSearchPanelImplModel} from './impl/JsonSearchPanelImplModel';

export const [JsonSearchPanel, jsonSearchPanel] = hoistCmp.withFactory<JsonBlobModel>({
    render() {
        const impl = useLocalModel(JsonSearchPanelImplModel);
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
                item: hframe({
                    items: [
                        panel({
                            item: grid({model: impl.gridModel})
                        }),
                        panel({
                            tbar: nodeTbar({model: impl}),
                            bbar: nodeBbar({
                                omit: !impl.asPathList,
                                model: impl
                            }),
                            item: jsonInput({
                                model: impl,
                                bind: 'matchingNodes',
                                flex: 1,
                                width: '100%',
                                readonly: true,
                                showCopyButton: true
                            })
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
        gridCountLabel({
            gridModel: model.gridModel,
            unit: 'document'
        })
    );
});

const pathField = hoistCmp.factory<JsonSearchPanelImplModel>({
    render() {
        return textInput({
            bind: 'path',
            commitOnChange: true,
            leftIcon: Icon.search(),
            enableClear: true,
            placeholder: 'JSON Path',
            width: null,
            flex: 1
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
            content: box({
                style: {padding: 5},
                item: a({
                    href: 'https://github.com/json-path/JsonPath?tab=readme-ov-file#operators',
                    target: '_blank',
                    item: 'Path Syntax Docs'
                })
            })
        });
    }
});

const nodeTbar = hoistCmp.factory<JsonSearchPanelImplModel>(({model}) => {
    return toolbar(
        buttonGroupInput({
            model,
            bind: 'pathOrValue',
            minimal: true,
            outlined: true,
            items: [
                button({
                    text: 'Path',
                    value: 'path'
                }),
                button({
                    text: 'Value',
                    value: 'value'
                })
            ]
        }),
        filler(),
        box({
            omit: !model.matchingNodeCount,
            item: `${model.matchingNodeCount} ${model.matchingNodeCount === 1 ? 'match' : 'matches'}`
        })
    );
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
