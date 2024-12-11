/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {filler, frame, hframe, placeholder} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, uses} from '@xh/hoist/core';
import {ManageDialogModel} from './ManageDialogModel';
import {button, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize} from 'lodash';
import {viewMultiPanel} from './ViewMultiPanel';
import {viewPanel} from './ViewPanel';

/**
 * Default management dialog for ViewManager.
 */
export const manageDialog = hoistCmp.factory({
    displayName: 'ManageDialog',
    className: 'xh-view-manager__manage-dialog',
    model: uses(() => ManageDialogModel),

    render({model, className}) {
        if (!model.isOpen) return null;

        const {typeDisplayName, updateTask, loadTask, selectedViews} = model,
            count = selectedViews.length;

        return dialog({
            title: `Manage ${capitalize(pluralize(typeDisplayName))}`,
            icon: Icon.gear(),
            className,
            isOpen: true,
            style: {width: '1000px', maxWidth: '90vm', minHeight: '550px'},
            canOutsideClickClose: false,
            onClose: () => model.close(),
            item: panel({
                item: hframe(
                    selectorPanel(),
                    panel({
                        item:
                            count == 0
                                ? placeholderPanel()
                                : count > 1
                                  ? viewMultiPanel()
                                  : viewPanel(),
                        bbar: toolbar(
                            filler(),
                            button({text: 'Close', onClick: () => model.close()})
                        )
                    })
                ),
                mask: [updateTask, loadTask]
            })
        });
    }
});

const selectorPanel = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        return panel({
            modelConfig: {defaultSize: 650, side: 'left', collapsible: false},
            item: tabContainer(),
            bbar: [
                storeFilterField({
                    autoApply: false,
                    includeFields: ['name', 'group'],
                    onFilterChange: f => (model.filter = f)
                }),
                filler(),
                refreshButton({onClick: () => model.refreshAsync()})
            ]
        });
    }
});

export const viewsGrid = hoistCmp.factory<GridModel>({
    render({model}) {
        return frame({
            paddingTop: 5,
            item: grid({
                model,
                agOptions: {
                    suppressMakeColumnVisibleAfterUnGroup: true
                }
            })
        });
    }
});

const placeholderPanel = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        return placeholder(Icon.gears(), `Select a ${model.typeDisplayName}`);
    }
});
