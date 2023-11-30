import {roleEditor} from '@xh/hoist/admin/tabs/roles/editor/RoleEditor';
import {roleInspector} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspector';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, fragment, hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';

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
                    filler(),
                    gridCountLabel({unit: 'role'}),
                    '-',
                    filterChooser({flex: 2}),
                    exportButton()
                ],
                item: hframe(grid(), detailsPanel())
            }),
            roleEditor()
        );
    }
});

const detailsPanel = hoistCmp.factory<RolesModel>(() =>
    panel({
        modelConfig: {
            collapsible: false,
            defaultSize: '50%',
            persistWith: {...RolesModel.PERSIST_WITH, path: 'detailsPanel'},
            side: 'right'
        },
        item: roleInspector()
    })
);
