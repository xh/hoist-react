import {RoleFormModel} from '@xh/hoist/admin/tabs/roles/editor/form/RoleFormModel';
import {grid} from '@xh/hoist/cmp/grid';
import {hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';

export const assignmentsTab = hoistCmp.factory(() =>
    hframe({
        className: `role-form__assignments`,
        items: [assignmentsPanel({entity: 'Users'}), assignmentsPanel({entity: 'Directory Groups'})]
    })
);

interface AssignmentsPanelProps extends HoistProps<RoleFormModel> {
    entity: 'Users' | 'Directory Groups' | 'Roles';
}

export const assignmentsPanel = hoistCmp.factory<AssignmentsPanelProps>({
    className: 'role-form__assignments__panel',
    displayName: 'AssignmentsPanel',
    model: uses(() => RoleFormModel),
    render({className, entity, model}) {
        const gridModel =
            entity === 'Users'
                ? model.usersGridModel
                : entity === 'Directory Groups'
                ? model.directoryGroupsGridModel
                : model.inheritsGridModel;

        return panel({
            className,
            compactHeader: true,
            icon:
                entity === 'Users'
                    ? Icon.user()
                    : entity === 'Directory Groups'
                    ? Icon.users()
                    : Icon.roles(),
            title: entity,
            tbar: toolbar({
                compact: true,
                items: [
                    recordActionBar({
                        actions: model.ACTIONS,
                        gridModel,
                        selModel: gridModel.selModel
                    }),
                    '-',
                    storeFilterField({
                        className: `${className}__filter`,
                        gridModel,
                        flex: 1,
                        width: null
                    })
                ]
            }),
            item: grid({model: gridModel})
        });
    }
});
