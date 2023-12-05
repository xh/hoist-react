import {roleEditor} from '@xh/hoist/admin/tabs/roles/editor/RoleEditor';
import {roleGraph} from '@xh/hoist/admin/tabs/roles/graph/RoleGraph';
import {roleMembers} from '@xh/hoist/admin/tabs/roles/members/RoleMembers';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, fragment, hframe, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
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
                    filler(),
                    gridCountLabel({unit: 'role'}),
                    '-',
                    filterChooser({flex: 2}),
                    '-',
                    switchInput({
                        bind: 'groupByCategory',
                        label: 'Group By Category',
                        labelSide: 'left'
                    })
                ],
                item: hframe(vframe(grid(), graphPanel()), detailsPanel())
            }),
            roleEditor()
        );
    }
});

const detailsPanel = hoistCmp.factory<RolesModel>(({model}) =>
    panel({
        icon: Icon.idBadge(),
        title: model.selectedRole?.name ?? 'Role Details',
        item: roleMembers(),
        compactHeader: true,
        modelConfig: {
            defaultSize: '50%',
            persistWith: {...RolesModel.PERSIST_WITH, path: 'detailsPanel'},
            side: 'right'
        }
    })
);

const graphPanel = hoistCmp.factory<RolesModel>(() =>
    panel({
        item: roleGraph(),
        modelConfig: {
            defaultSize: '25%',
            persistWith: {...RolesModel.PERSIST_WITH, path: 'graphPanel'},
            side: 'bottom'
        }
    })
);
