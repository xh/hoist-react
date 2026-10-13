/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dialog} from '@xh/hoist/kit/blueprint';
import {getTestId} from '@xh/hoist/utils/js';
import {startCase} from 'lodash';
import {groupField} from './editpanels/GroupField';
import {SaveAsDialogModel} from './SaveAsDialogModel';
import {getVisibilityOptions, getVisibilityInfo} from './Utils';

/**
 * Default Save As dialog used by ViewManager.
 */
export const saveAsDialog = hoistCmp.factory<SaveAsDialogModel>({
    displayName: 'SaveDialog',
    className: 'xh-view-manager__save-dialog',
    model: uses(SaveAsDialogModel),

    render({model, className, testId}) {
        if (!model.isOpen) return null;

        return dialog({
            title: `Save as...`,
            className,
            isOpen: true,
            style: {width: 550},
            canOutsideClickClose: false,
            onClose: () => model.close(),
            item: formPanel({testId})
        });
    }
});

const formPanel = hoistCmp.factory<SaveAsDialogModel>({
    render({model, testId}) {
        const {parent, formModel} = model,
            {visibility} = formModel.values,
            visOptions = getVisibilityOptions(parent),
            visInfo = getVisibilityInfo(parent, visibility);

        // Blueprint's Dialog does not pass `data-testid` through, so tag the panel within it.
        // The form takes the same testId to derive one for each field.
        return panel({
            testId,
            item: form({
                testId,
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
                        groupField({model: model.groupFieldModel}),
                        formField({
                            field: 'description',
                            item: textArea({
                                selectOnFocus: true,
                                height: 70
                            })
                        }),
                        formField({
                            field: 'visibility',
                            omit: visOptions.length === 1,
                            item: select({options: visOptions, enableFilter: false}),
                            info: visInfo
                        })
                    ]
                })
            }),
            bbar: bbar({testId}),
            mask: model.parent.saveTask
        });
    }
});

const bbar = hoistCmp.factory<SaveAsDialogModel>({
    render({model, testId}) {
        const {typeDisplayName} = model.parent;
        return toolbar(
            filler(),
            button({
                text: 'Cancel',
                testId: getTestId(testId, 'cancel-btn'),
                onClick: () => model.close()
            }),
            button({
                text: `Save as new ${startCase(typeDisplayName)}`,
                outlined: true,
                intent: 'success',
                disabled: !model.formModel.isValid,
                testId: getTestId(testId, 'save-btn'),
                onClick: () => model.saveAsAsync()
            })
        );
    }
});
