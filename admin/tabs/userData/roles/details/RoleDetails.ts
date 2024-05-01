/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {div, frame, placeholder, span, vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {RoleDetailsModel} from './RoleDetailsModel';
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
