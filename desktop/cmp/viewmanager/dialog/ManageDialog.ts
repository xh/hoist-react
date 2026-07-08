/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {div, filler, fragment, hframe, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize} from 'lodash';
import {editGroupDialog} from './EditGroupDialog';
import {ManageDialogModel} from './ManageDialogModel';
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
            item: fragment(
                panel({
                    item: hframe(
                        selectorPanel(),
                        panel({
                            item:
                                count == 0
                                    ? placeholderPanel()
                                    : count > 1
                                      ? viewMultiPanel()
                                      : viewPanel(),
                            bbar: bbar()
                        })
                    ),
                    mask: [updateTask, loadTask]
                }),
                editGroupDialog()
            )
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
                refreshButton({target: model})
            ]
        });
    }
});

export const viewsGrid = hoistCmp.factory<GridModel>({
    render({model, helpText}) {
        return vframe({
            paddingTop: 5,
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
                        }
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
        return placeholder(Icon.gears(), `Select a ${model.viewManagerModel.typeDisplayName}`);
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
