/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {tabContainer} from '@xh/hoist/cmp/tab';
import {filler, hframe, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {editForm} from './EditForm';
import {ManageDialogModel} from './ManageDialogModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize} from 'lodash';

/**
 * Default management dialog for ViewManager
 */
export const manageDialog = hoistCmp.factory({
    displayName: 'ManageDialog',
    className: 'xh-view-manager__manage-dialog',
    model: creates(ManageDialogModel),

    render({model, className}) {
        const {typeDisplayName, updateTask, loadTask, selectedViews} = model;
        const count = selectedViews.length;
        return dialog({
            title: `Manage ${capitalize(pluralize(typeDisplayName))}`,
            icon: Icon.gear(),
            className,
            isOpen: true,
            style: {width: '800px', maxWidth: '90vm', minHeight: '430px'},
            canOutsideClickClose: false,
            onClose: () => model.close(),
            item: panel({
                item: hframe(
                    viewPanel(),
                    count == 0 ? placeholderPanel() : count > 1 ? multiSelectionPanel() : editForm()
                ),
                mask: [updateTask, loadTask]
            })
        });
    }
});

const viewPanel = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        return panel({
            modelConfig: {defaultSize: 350, side: 'left', collapsible: false},
            item: tabContainer(),
            bbar: [
                storeFilterField({
                    autoApply: false,
                    includeFields: ['name'],
                    onFilterChange: f => (model.filter = f)
                })
            ]
        });
    }
});

const placeholderPanel = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        return panel({
            item: placeholder(Icon.gears(), `Select a ${model.typeDisplayName}`),
            bbar: bbar()
        });
    }
});

const multiSelectionPanel = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        const {selectedViews} = model;
        return panel({
            item: vframe({
                alignItems: 'center',
                justifyContent: 'center',
                item: button({
                    text: `Delete ${selectedViews.length} ${pluralize(model.typeDisplayName)}`,
                    icon: Icon.delete(),
                    intent: 'danger',
                    outlined: true,
                    disabled: !model.canDelete,
                    onClick: () => model.deleteAsync(selectedViews)
                })
            }),
            bbar: bbar()
        });
    }
});

const bbar = hoistCmp.factory<ManageDialogModel>(({model}) => {
    return toolbar(filler(), button({text: 'Close', onClick: () => model.close()}));
});
