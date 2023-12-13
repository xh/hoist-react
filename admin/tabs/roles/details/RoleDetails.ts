import {RoleDetailsModel} from '@xh/hoist/admin/tabs/roles/details/RoleDetailsModel';
import {form} from '@xh/hoist/cmp/form';
import {div, placeholder, span, vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {dateTimeSecRenderer} from '@xh/hoist/format';
import './RoleDetails.scss';

export const roleDetails = hoistCmp.factory({
    className: 'xh-admin-role-details',
    displayName: 'RoleDetails',
    model: creates(RoleDetailsModel),
    render({className, model}) {
        if (!model.selectedRole) return placeholder('No role selected.');
        return vframe({
            className,
            items: [
                form({
                    fieldDefaults: {inline: true, readonlyRenderer: valOrNa},
                    item: div({
                        className: `${className}__form`,
                        items: [
                            formField({field: 'category'}),
                            formField({field: 'notes'}),
                            formField({
                                field: 'lastUpdated',
                                readonlyRenderer: dateTimeSecRenderer({})
                            }),
                            formField({field: 'lastUpdatedBy'})
                        ]
                    })
                }),
                tabContainer()
            ]
        });
    }
});

const valOrNa = v => (v != null ? v : naSpan());
const naSpan = () => span({item: 'N/A', className: 'xh-text-color-muted'});
