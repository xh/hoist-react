/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {grid, gridCountLabel, GridModel} from '@xh/hoist/cmp/grid';
import {filler, hbox, hframe, hspacer, span, strong, vbox, vframe} from '@xh/hoist/cmp/layout';
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
import {RoleMemberType} from '../../Types';
import {warningBanner} from '../../warning/WarningBanner';
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
            assignmentsPanel({
                entity: 'ROLE',
                helpText: 'Users with any roles below will also get this role.'
            })
        ]
    })
);

interface AssignmentsPanelProps extends HoistProps<RoleFormModel> {
    entity: RoleMemberType;
    helpText?: string;
}

const assignmentsPanel = hoistCmp.factory<AssignmentsPanelProps>({
    className: 'xh-admin-role-form__assignments__panel',
    displayName: 'AssignmentsPanel',
    model: uses(() => RoleFormModel),
    render({className, entity, model, helpText}) {
        const forUser = entity === 'USER',
            forDirGroup = entity === 'DIRECTORY_GROUP',
            forRole = entity === 'ROLE',
            gridModel = forUser
                ? model.usersGridModel
                : forDirGroup
                  ? model.directoryGroupsGridModel
                  : model.rolesGridModel;

        return panel({
            className,
            compactHeader: true,
            icon: forUser ? Icon.user() : forDirGroup ? Icon.users() : Icon.idBadge(),
            title: forRole ? 'Granted To' : `${capitalizeWords(entity.replace('_', ' '))}s`,
            headerItems: [infoIcon({entity}), hspacer(2)],
            tbar: toolbar({
                compact: true,
                items: [
                    recordActionBar({
                        actions: [model.ADD_ASSIGNMENT_ACTION],
                        gridModel,
                        selModel: gridModel.selModel
                    }),
                    filler(),
                    helpText ? span(helpText) : null
                ]
            }),
            item: grid({model: gridModel}),
            bbar: bbar({entity, gridModel}),
            loadingIndicator: forDirGroup && model.directoryGroupLookupTask
        });
    }
});

const bbar = hoistCmp.factory<AssignmentsPanelProps & {gridModel: GridModel}>(
    ({entity, gridModel, model}) => {
        if (entity === 'USER' && !model.moduleConfig?.userAssignmentSupported) {
            return warningBanner({
                compact: true,
                message: 'Users assignment disabled. Will ignore.'
            });
        } else if (entity === 'DIRECTORY_GROUP' && !model.moduleConfig?.directoryGroupsSupported) {
            return warningBanner({
                compact: true,
                message: 'Directory Groups disabled. Will ignore.'
            });
        } else {
            return toolbar({
                compact: true,
                items: [
                    gridFindField({gridModel, flex: 1, width: null, omit: entity !== 'USER'}),
                    entity === 'USER' ? '-' : filler(),
                    gridCountLabel({gridModel, unit: entity.replace('_', ' ').toLowerCase()})
                ]
            });
        }
    }
);

const infoIcon = hoistCmp.factory<AssignmentsPanelProps>({
    render({entity, model}) {
        const {roleName} = model;

        let tooltipText = null;
        switch (entity) {
            case 'USER':
                tooltipText = `All users listed here will be directly granted ${roleName}.`;
                break;
            case 'DIRECTORY_GROUP':
                tooltipText =
                    model.moduleConfig?.directoryGroupsDescription ??
                    `All members of these directory groups will be granted ${roleName}.`;
                break;
            case 'ROLE':
                tooltipText = `All users holding these roles will also be granted ${roleName}.`;
                break;
        }
        return tooltip({
            item: Icon.info(),
            content: tooltipText,
            omit: !tooltipText
        });
    }
});
