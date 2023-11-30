import {RoleFormModel} from '@xh/hoist/admin/tabs/roles/editor/form/RoleFormModel';
import {form} from '@xh/hoist/cmp/form';
import {grid} from '@xh/hoist/cmp/grid';
import {hbox, hframe, vbox, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import './RoleForm.scss';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';

export const roleForm = hoistCmp.factory({
    className: 'role-form',
    displayName: 'RoleForm',
    model: uses(RoleFormModel),
    render({className, model}) {
        return vframe({
            className,
            items: [
                vbox({
                    item: form({
                        fieldDefaults: {
                            commitOnChange: true,
                            minimal: true
                        },
                        items: [
                            hbox(
                                formField({
                                    disabled: model.isEditingExistingRole,
                                    field: 'name',
                                    flex: 1,
                                    item: textInput()
                                }),
                                formField({
                                    field: 'groupName',
                                    flex: 1,
                                    item: select({
                                        enableCreate: true,
                                        options: model.groupOptions
                                    })
                                })
                            ),
                            formField({
                                field: 'notes',
                                item: textArea()
                            })
                        ]
                    })
                }),
                assignments()
            ]
        });
    }
});

const assignments = hoistCmp.factory(() =>
    hframe({
        className: `role-form__assignments`,
        items: [
            assignmentsPanel({entity: 'Users'}),
            assignmentsPanel({entity: 'Directory Groups'}),
            assignmentsPanel({entity: 'Roles'})
        ]
    })
);

interface AssignmentsPanelProps extends HoistProps<RoleFormModel> {
    entity: 'Users' | 'Directory Groups' | 'Roles';
}

const assignmentsPanel = hoistCmp.factory<AssignmentsPanelProps>({
    className: 'role-form__assignments__panel',
    displayName: 'AssignmentsPanel',
    model: uses(() => RoleFormModel),
    render({className, entity, model}) {
        const gridModel =
            entity === 'Users'
                ? model.usersGridModel
                : entity === 'Directory Groups'
                ? model.directoryGroupsGridModel
                : model.rolesGridModel;

        return panel({
            className,
            compactHeader: true,
            icon:
                entity === 'Users'
                    ? Icon.user()
                    : entity === 'Directory Groups'
                    ? Icon.users()
                    : Icon.idBadge(),
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
