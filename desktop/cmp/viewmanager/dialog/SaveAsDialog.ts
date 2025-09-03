/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, checkbox, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dialog} from '@xh/hoist/kit/blueprint';
import {startCase} from 'lodash';
import {SaveAsDialogModel} from './SaveAsDialogModel';
import {getGroupOptions, getVisibilityOptions, getVisibilityInfo} from './Utils';

/**
 * Default Save As dialog used by ViewManager.
 */
export const saveAsDialog = hoistCmp.factory<SaveAsDialogModel>({
    displayName: 'SaveDialog',
    className: 'xh-view-manager__save-dialog',
    model: uses(SaveAsDialogModel),

    render({model, className}) {
        if (!model.isOpen) return null;

        return dialog({
            title: `Save as...`,
            className,
            isOpen: true,
            style: {width: 500},
            canOutsideClickClose: false,
            onClose: () => model.close(),
            item: formPanel()
        });
    }
});

const formPanel = hoistCmp.factory<SaveAsDialogModel>({
    render({model}) {
        const {parent, formModel} = model,
            {visibility} = formModel.values,
            isGlobal = visibility === 'global',
            groupOptions = getGroupOptions(parent, isGlobal),
            visOptions = getVisibilityOptions(parent),
            visInfo = getVisibilityInfo(parent, visibility);

        return panel({
            item: form({
                fieldDefaults: {
                    commitOnChange: true,
                    inline: true,
                    minimal: true
                },
                item: vframe({
                    className: 'xh-view-manager__save-dialog__form',
                    items: [
                        formField({
                            field: 'name',
                            item: textInput({
                                autoFocus: true,
                                selectOnFocus: true,
                                onKeyDown: e => {
                                    if (e.key === 'Enter') model.saveAsAsync();
                                }
                            })
                        }),
                        formField({
                            field: 'group',
                            item: select({
                                enableCreate: true,
                                enableClear: true,
                                placeholder: 'Select optional group....',
                                options: groupOptions
                            })
                        }),
                        formField({
                            field: 'description',
                            item: textArea({
                                selectOnFocus: true,
                                height: 70
                            })
                        }),
                        formField({
                            field: 'visibility',
                            label: 'Visibility',
                            labelTextAlign: 'left',
                            omit: visOptions.length === 1,
                            item: select({options: visOptions}),
                            info: visInfo
                        }),
                        formField({
                            field: 'isPinned',
                            label: 'Pinned?',
                            labelTextAlign: 'left',
                            info: 'Show in your menu?',
                            item: checkbox()
                        })
                    ]
                })
            }),
            bbar: bbar(),
            mask: model.parent.saveTask
        });
    }
});

const bbar = hoistCmp.factory<SaveAsDialogModel>({
    render({model}) {
        const {typeDisplayName} = model.parent;
        return toolbar(
            filler(),
            button({
                text: 'Cancel',
                onClick: () => model.close()
            }),
            button({
                text: `Save as new ${startCase(typeDisplayName)}`,
                outlined: true,
                intent: 'success',
                disabled: !model.formModel.isValid,
                onClick: () => model.saveAsAsync()
            })
        );
    }
});
