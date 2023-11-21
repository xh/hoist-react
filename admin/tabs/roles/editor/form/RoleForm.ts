import {RoleFormModel} from '@xh/hoist/admin/tabs/roles/editor/form/RoleFormModel';
import {form} from '@xh/hoist/cmp/form';
import {hbox, vbox, vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import './RoleForm.scss';

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
                tabContainer()
            ]
        });
    }
});
