/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {errorBoundary} from '@xh/hoist/cmp/error';
import {div, filler, placeholder, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput, slider, switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {logError, pluralize} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {RoleModel} from '../RoleModel';
import {RoleGraphModel} from './RoleGraphModel';
import './RoleGraph.scss';

export const roleGraph = hoistCmp.factory({
    displayName: 'RoleGraph',
    model: creates(RoleGraphModel),

    render({model}) {
        const {role} = model;
        return panel({
            compactHeader: true,
            icon: Icon.treeGraph(),
            title: role ? `${role.name} Relationships` : 'Relationships',
            item: div({
                item: div({
                    style: {margin: 'auto'},
                    item: errorBoundary(content())
                }),
                style: {
                    display: 'flex',
                    flex: '1 0',
                    overflow: 'auto'
                }
            }),
            bbar: toolbar({
                items: [
                    buttonGroupInput({
                        bind: 'relationship',
                        items: [
                            button({
                                value: 'effective',
                                text: `Granted to ${pluralize('role', role?.effectiveRoles.length, true)}`
                            }),
                            button({
                                value: 'inherited',
                                text: `Inheriting from ${pluralize('role', role?.inheritedRoles.length, true)}`
                            })
                        ]
                    }),
                    filler(),
                    span('Limit to one level'),
                    switchInput({
                        bind: 'limitToOneLevel'
                    }),
                    '-',
                    span('Zoom'),
                    slider({
                        paddingLeft: 2,
                        overflow: 'visible',
                        bind: 'widthScale',
                        min: 0,
                        max: 2,
                        stepSize: 0.005,
                        labelRenderer: false
                    }),
                    '-',
                    buttonGroupInput({
                        bind: 'inverted',
                        items: [
                            button({
                                value: true,
                                icon: Icon.treeGraph()
                            }),
                            button({
                                value: false,
                                icon: Icon.treeGraph({rotation: 270})
                            })
                        ]
                    })
                ],
                omit: !role
            }),
            modelConfig: {
                defaultSize: '25%',
                minSize: 150,
                modalSupport: true,
                persistWith: {...RoleModel.PERSIST_WITH, path: 'graphPanel'},
                side: 'bottom'
            }
        });
    }
});

const content = hoistCmp.factory<RoleGraphModel>(({model}) => {
    const {relationship, relatedRoles, role, size} = model;
    if (!Highcharts?.seriesTypes.treegraph) {
        logError(
            [
                'Highcharts TreeGraph module not imported by this app. ',
                'Import and register module in Bootstrap.ts. See the XH Toolbox app for an example.'
            ],
            'RoleGraph'
        );
        return placeholder('Missing Highcharts TreeGraph module.');
    }
    if (isEmpty(relatedRoles))
        return placeholder(
            Icon.treeGraph(),
            !role
                ? 'Select a role to view relationships...'
                : relationship === 'inherited'
                  ? `${role.name} does not inherit from any other roles.`
                  : `${role.name} has not been granted to any other roles.`
        );

    return chart({
        className: 'xh-role-graph',
        ...size,
        flex: '1 0'
    });
});
