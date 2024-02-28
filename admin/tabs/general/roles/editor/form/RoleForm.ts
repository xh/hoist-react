/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleMemberType} from '@xh/hoist/admin/tabs/general/roles/Types';
import {warningBanner} from '@xh/hoist/admin/tabs/general/roles/warning/WarningBanner';
import {form} from '@xh/hoist/cmp/form';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hbox, hframe, hspacer, strong, vbox, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import './RoleForm.scss';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {capitalizeWords} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {tooltip} from '@xh/hoist/kit/blueprint';
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
                                    field: 'name',
                                    flex: 1,
                                    item: textInput({autoFocus: true}),
                                    readonlyRenderer: v => strong(v)
                                }),
                                formField({
                                    field: 'category',
                                    flex: 1,
                                    item: select({
                                        placeholder: null,
                                        enableClear: true,
                                        enableCreate: true,
                                        options: model.categoryOptions
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
                omit: !model.moduleConfig?.userAssignmentSupported && model.usersGridModel.empty
            }),
            assignmentsPanel({
                entity: 'DIRECTORY_GROUP',
                omit:
                    !model.moduleConfig?.directoryGroupsSupported &&
                    model.directoryGroupsGridModel.empty
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
            headerItems: [infoIcon({entity}), hspacer(2)],
            tbar: toolbar({
                compact: true,
                items: [
                    recordActionBar({
                        actions: [model.ADD_ASSIGNMENT_ACTION],
                        gridModel,
                        selModel: gridModel.selModel
                    })
                ]
            }),
            item: panel({
                item: grid({model: gridModel}),
                bbar: toolbar({
                    compact: true,
                    items: [
                        gridFindField({gridModel, flex: 1, width: null, omit: entity !== 'USER'}),
                        entity === 'USER' ? '-' : filler(),
                        gridCountLabel({gridModel, unit: entity.replace('_', ' ').toLowerCase()})
                    ]
                })
            }),
            bbar: bbar({entity}),
            loadingIndicator: entity === 'DIRECTORY_GROUP' && model.directoryGroupLookupTask
        });
    }
});

const bbar = hoistCmp.factory<AssignmentsPanelProps>(({entity, model}) => {
    switch (entity) {
        case 'USER':
            return warningBanner({
                compact: true,
                message: 'Users assignment disabled. Will ignore.',
                omit: model.moduleConfig?.userAssignmentSupported
            });
        case 'DIRECTORY_GROUP':
            return warningBanner({
                compact: true,
                message: 'Directory Groups disabled. Will ignore.',
                omit: model.moduleConfig?.directoryGroupsSupported
            });
        default:
            return null;
    }
});

const infoIcon = hoistCmp.factory<AssignmentsPanelProps>({
    render({entity, model}) {
        let tooltipText = null;
        switch (entity) {
            case 'USER':
                tooltipText = 'All users listed here will be directly granted this role.';
                break;
            case 'DIRECTORY_GROUP':
                tooltipText =
                    model.moduleConfig?.directoryGroupsDescription ??
                    'All members of these directory groups will be granted this role.';
                break;
            case 'ROLE':
                tooltipText = 'All users holding these roles will also be granted this role.';
                break;
        }
        return tooltip({
            item: Icon.info(),
            content: tooltipText,
            omit: !tooltipText
        });
    }
});
