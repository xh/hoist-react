/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {div, filler, hframe, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, useContextModel, uses} from '@xh/hoist/core';
import {button, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize} from 'lodash';
import {ManageDialogModel} from './ManageDialogModel';
import {groupPanel} from './editpanels/GroupPanel';
import {viewMultiPanel} from './editpanels/ViewMultiPanel';
import {viewPanel} from './editpanels/ViewPanel';

/**
 * Default management dialog for ViewManager.
 */
export const manageDialog = hoistCmp.factory({
    displayName: 'ManageDialog',
    className: 'xh-view-manager__manage-dialog',
    model: uses(() => ManageDialogModel),

    render({model, className}) {
        if (!model.isOpen) return null;

        const {updateTask, loadTask, selectedViews, viewManagerModel} = model,
            count = selectedViews.length;

        return dialog({
            title: `Manage ${capitalize(pluralize(viewManagerModel.typeDisplayName))}`,
            icon: Icon.gear(),
            className,
            isOpen: true,
            style: {width: '1000px', maxWidth: '90vw', minHeight: '600px'},
            canOutsideClickClose: false,
            onClose: () => model.close(),
            item: panel({
                item: hframe(
                    selectorPanel(),
                    panel({
                        item: model.selectedGroupRecord
                            ? groupPanel()
                            : count == 0 || model.hasGroupRowsSelected
                              ? placeholderPanel()
                              : count > 1
                                ? viewMultiPanel()
                                : viewPanel(),
                        bbar: bbar()
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
            modelConfig: {defaultSize: 600, side: 'left', collapsible: false},
            item: tabContainer(),
            bbar: [
                storeFilterField({
                    autoApply: false,
                    includeFields: ['name', 'group'],
                    onFilterChange: f => (model.filter = f)
                }),
                filler(),
                refreshButton({target: model})
            ]
        });
    }
});

export const viewsGrid = hoistCmp.factory<GridModel>({
    render({model, helpText}) {
        const dialogModel = useContextModel(ManageDialogModel);
        return vframe({
            paddingTop: 5,
            // Green indicator when a drag is pending a drop onto the top level - outside all
            // groups, there is no target row to highlight, so decorate the grid body itself.
            className: dialogModel?.isTopLevelDropTarget(model)
                ? 'xh-view-manager__manage-dialog__grid--drop-target'
                : null,
            items: [
                grid({
                    model,
                    agOptions: {
                        // Groups render as open/closed folders rather than the default carets.
                        // Icon size is controlled via --xh-grid-tree-icon-px in ViewManager.scss.
                        icons: {
                            groupExpanded: Icon.folderOpen({
                                asHtml: true,
                                className: 'ag-group-expanded'
                            }),
                            groupContracted: Icon.folder({
                                asHtml: true,
                                className: 'ag-group-contracted'
                            })
                        },
                        // Drag-and-drop of views/groups, where supported by the grid + user.
                        ...dialogModel?.getRowDragAgOptions(model)
                    }
                }),
                div({
                    item: helpText,
                    omit: !helpText,
                    className: 'xh-view-manager__manage-dialog__help-text'
                })
            ]
        });
    }
});

const placeholderPanel = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        return placeholder(
            Icon.gears(),
            `Select a ${model.viewManagerModel.typeDisplayName} or group`
        );
    }
});

const bbar = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        const {selectedView} = model;
        return toolbar(
            filler(),
            button({
                text: selectedView?.isCurrentView ? 'Currently Active' : 'Activate + Close',
                onClick: () => model.activateSelectedViewAndClose(),
                disabled: selectedView?.isCurrentView,
                omit: !selectedView
            }),
            toolbarSep({omit: !selectedView}),
            button({text: 'Close', onClick: () => model.close()})
        );
    }
});
