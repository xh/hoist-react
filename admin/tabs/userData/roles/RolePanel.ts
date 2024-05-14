/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {fragment, hframe, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {Icon} from '@xh/hoist/icon';
import {roleDetails} from './details/RoleDetails';
import {roleEditor} from './editor/RoleEditor';
import {roleGraph} from './graph/RoleGraph';
import {RoleModel} from './RoleModel';

export const rolePanel = hoistCmp.factory({
    displayName: 'RolePanel',
    model: creates(RoleModel),

    render({className, model}) {
        const {moduleConfig} = model;
        if (!moduleConfig) return null;
        if (!moduleConfig.enabled) {
            return errorMessage({error: 'Default Role Module not enabled.'});
        }

        const {gridModel, readonly} = model;
        return fragment(
            panel({
                className,
                mask: 'onLoad',
                tbar: [
                    recordActionBar({
                        actions: [model.addAction(), model.editAction()],
                        gridModel,
                        omit: readonly,
                        selModel: gridModel.selModel
                    }),
                    '-',
                    filterChooser({flex: 1})
                ],
                item: hframe(vframe(grid(), roleGraph()), detailsPanel())
            }),
            roleEditor()
        );
    }
});

const detailsPanel = hoistCmp.factory<RoleModel>(({model}) => {
    const {selectedRole} = model;
    return panel({
        compactHeader: true,
        icon: Icon.idBadge(),
        title: selectedRole?.name ? `Details - ${selectedRole?.name}` : 'Details',
        item: roleDetails(),
        headerItems: [
            button({
                icon: Icon.edit(),
                minimal: true,
                onClick: () => model.editAsync(selectedRole),
                omit: !selectedRole
            })
        ],
        modelConfig: {
            defaultSize: '30%',
            minSize: 550,
            modalSupport: true,
            persistWith: {...RoleModel.PERSIST_WITH, path: 'detailsPanel'},
            side: 'right'
        }
    });
});
