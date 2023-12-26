import {RoleDetailsModel} from '@xh/hoist/admin/tabs/general/roles/details/RoleDetailsModel';
import {form} from '@xh/hoist/cmp/form';
import {div, frame, placeholder, span, vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import './RoleDetails.scss';

export const roleDetails = hoistCmp.factory({
    className: 'xh-admin-role-details',
    displayName: 'RoleDetails',
    model: creates(RoleDetailsModel),
    render({className, model}) {
        if (!model.role) return placeholder('No role selected.');
        return vframe({
            className,
            items: [
                form({
                    fieldDefaults: {inline: true},
                    item: div({
                        className: `${className}__form`,
                        items: [
                            formField({field: 'name'}),
                            formField({field: 'category'}),
                            formField({
                                field: 'notes',
                                readonlyRenderer: v => {
                                    return frame({
                                        style: {overflowY: 'auto'},
                                        height: 50,
                                        item:
                                            v ??
                                            span({item: 'N/A', className: 'xh-text-color-muted'})
                                    });
                                }
                            }),
                            formField({field: 'lastUpdated'})
                        ]
                    })
                }),
                tabContainer()
            ]
        });
    }
});
