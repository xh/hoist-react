import {RoleMemberType} from '@xh/hoist/admin/tabs/general/roles/Types';
import {warningBanner} from '@xh/hoist/admin/tabs/general/roles/warning/WarningBanner';
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
import {capitalizeWords} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {RoleFormModel} from './RoleFormModel';

export const roleForm = hoistCmp.factory({
    className: 'xh-admin-role-form',
    displayName: 'RoleForm',
    model: uses(RoleFormModel),
    render({className, model}) {
        return vframe({
            className,
            items: [
                vbox({
                    className: `${className}__fields`,
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
                                    item: textInput({autoFocus: true})
                                }),
                                formField({
                                    field: 'category',
                                    flex: 1,
                                    item: select({
                                        enableClear: true,
                                        enableCreate: true,
                                        options: model.groupOptions
                                    })
                                })
                            ),
                            formField({
                                field: 'notes',
                                item: textArea({height: 100})
                            })
                        ]
                    })
                }),
                assignments()
            ]
        });
    }
});

const assignments = hoistCmp.factory<RoleFormModel>(({model}) =>
    hframe({
        className: `xh-admin-role-form__assignments`,
        items: [
            assignmentsPanel({
                entity: 'USER',
                omit: !model.softConfig?.enableUsers && model.usersGridModel.empty
            }),
            assignmentsPanel({
                entity: 'DIRECTORY_GROUP',
                omit:
                    !model.softConfig?.enableDirectoryGroups && model.directoryGroupsGridModel.empty
            }),
            assignmentsPanel({entity: 'ROLE'})
        ]
    })
);

interface AssignmentsPanelProps extends HoistProps<RoleFormModel> {
    entity: RoleMemberType;
}

const assignmentsPanel = hoistCmp.factory<AssignmentsPanelProps>({
    className: 'xh-admin-role-form__assignments__panel',
    displayName: 'AssignmentsPanel',
    model: uses(() => RoleFormModel),
    render({className, entity, model}) {
        const gridModel =
            entity === 'USER'
                ? model.usersGridModel
                : entity === 'DIRECTORY_GROUP'
                ? model.directoryGroupsGridModel
                : model.rolesGridModel;

        return panel({
            className,
            compactHeader: true,
            icon:
                entity === 'USER'
                    ? Icon.user()
                    : entity === 'DIRECTORY_GROUP'
                    ? Icon.users()
                    : Icon.idBadge(),
            title: `${capitalizeWords(entity.replace('_', ' '))}s`,
            tbar: toolbar({
                compact: true,
                items: [
                    recordActionBar({
                        actions: [model.ADD_ASSIGNMENT_ACTION],
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
            item: grid({model: gridModel}),
            bbar: bbar({entity})
        });
    }
});

const bbar = hoistCmp.factory<AssignmentsPanelProps>(({entity, model}) => {
    switch (entity) {
        case 'USER':
            return warningBanner({
                compact: true,
                message: 'Direct User assignments are not enabled.',
                omit: model.softConfig?.enableUsers
            });
        case 'DIRECTORY_GROUP':
            return warningBanner({
                compact: true,
                message: 'Directory Groups are not enabled.',
                omit: model.softConfig?.enableDirectoryGroups
            });
        default:
            return null;
    }
});
