import {roleEditor} from '@xh/hoist/admin/tabs/roles/editor/RoleEditor';
import {roleInspector} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspector';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {grid} from '@xh/hoist/cmp/grid';
import {fragment, hframe, placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {Icon} from '@xh/hoist/icon';

export const roles = hoistCmp.factory({
    className: 'roles',
    displayName: 'Roles',
    model: creates(RolesModel),
    render({className, model}) {
        const {gridModel} = model;
        return fragment(
            panel({
                className,
                mask: 'onLoad',
                tbar: [
                    recordActionBar({
                        actions: model.ACTIONS,
                        gridModel,
                        selModel: gridModel.selModel
                    }),
                    '-',
                    filterChooser({flex: 1})
                ],
                item: hframe(grid(), detailsPanel())
            }),
            roleEditor()
        );
    }
});

const detailsPanel = hoistCmp.factory<RolesModel>(({model}) => {
    const role = model.gridModel.selectedId;
    return panel({
        modelConfig: {
            defaultSize: '50%',
            modalSupport: true,
            persistWith: {...RolesModel.PERSIST_WITH, path: 'detailsPanel'},
            side: 'right'
        },
        icon: Icon.info(),
        item: role ? roleInspector() : placeholder('Select a role on the left to view details.'),
        title: role ?? 'Role Details'
    });
});
