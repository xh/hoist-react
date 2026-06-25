/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, lookup, managed, PlainObject} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {compact, isEmpty, isMatch, sortBy, sumBy} from 'lodash';
import {RoleModel} from '../RoleModel';
import {EffectiveRoleMember, HoistRole} from '../Types';

export class RoleGraphModel extends HoistModel {
    @lookup(RoleModel) readonly roleModel: RoleModel;
    @managed readonly chartModel: ChartModel = this.createChartModel();

    @bindable relationship: 'effective' | 'inherited' = 'inherited';

    @bindable inverted: boolean = true;

    @bindable widthScale: number = 1.0;

    @bindable limitToOneLevel: boolean = true;

    get relatedRoles(): EffectiveRoleMember[] {
        const {role, relationship} = this;
        if (!role) return [];
        const ret = relationship === 'effective' ? role.effectiveRoles : role.inheritedRoles;
        return ret.filter(it => it.name !== role.name);
    }

    get role(): HoistRole {
        return this.roleModel.selectedRole;
    }

    @computed
    get size() {
        const {inverted, leafCount, maxDepth, widthScale} = this;
        if (inverted) {
            const AVG_WIDTH = 150,
                AVG_HEIGHT = 26;
            return {
                width: AVG_WIDTH * leafCount * widthScale,
                height: AVG_HEIGHT * (maxDepth + 1)
            };
        } else {
            const AVG_WIDTH = 100,
                AVG_HEIGHT = 30;
            return {
                width: AVG_WIDTH * maxDepth * widthScale,
                height: AVG_HEIGHT * (leafCount + 1)
            };
        }
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        const {chartModel} = this;
        this.addReaction(
            {
                track: () => [this.role, this.relationship, this.limitToOneLevel],
                run: async ([role]) => {
                    chartModel.clear(); //  avoid HC rendering glitches
                    await wait();
                    if (role) {
                        chartModel.setSeries({
                            type: 'treegraph',
                            data: this.getSeriesData()
                        });
                    }
                },
                // Deep comparison that ignores array order
                equals: (a, b) => isMatch(a, b) && isMatch(b, a),
                fireImmediately: true,
                debounce: 100
            },
            {
                track: () => this.inverted,
                run: inverted => {
                    chartModel.updateHighchartsConfig({chart: {inverted}});
                }
            }
        );
    }

    // -------------------------------
    // Implementation
    // -------------------------------
    private getSeriesData(): PlainObject[] {
        const {role, relatedRoles, limitToOneLevel} = this,
            {name: rootName} = role;
        if (isEmpty(relatedRoles)) return [];
        const alreadyAdded = new Set<string>();
        return [
            {
                id: rootName,
                // Replace spaces with non-breaking spaces to prevent wrapping.
                name: rootName.replaceAll(' ', '&nbsp'),
                dataLabels: {
                    style: {
                        fontWeight: 600
                    },
                    backgroundColor: 'var(--xh-bg-alt)'
                },
                marker: {
                    fillColor: 'var(--xh-bg-alt)'
                }
            },
            ...compact(
                sortBy(relatedRoles, 'name').flatMap(({name, sourceRoles}) =>
                    [...sourceRoles]
                        .sort((a, b) => {
                            if (a === role.name) return -1;
                            if (b === role.name) return 1;
                            return a > b ? 1 : -1;
                        })
                        .map(source => {
                            // Omit all non-root nodes if limitToOneLevel is true
                            if (limitToOneLevel && source !== rootName) return null;
                            // Adds a space to the id to differentiate subsequent nodes from the single expanded one.
                            const id = alreadyAdded.has(name) ? `${name} ` : name;
                            alreadyAdded.add(name);
                            return {
                                id,
                                // Replace spaces with non-breaking spaces to prevent wrapping.
                                name: name.replaceAll(' ', '&nbsp'),
                                parent: source
                            };
                        })
                )
            )
        ];
    }

    private createChartModel(): ChartModel {
        const {inverted} = this;
        return new ChartModel({
            highchartsConfig: {
                chart: {
                    inverted
                },
                plotOptions: {
                    treegraph: {
                        animation: false,
                        collapseButton: {
                            enabled: false
                        },
                        dataLabels: {
                            crop: false,
                            overflow: 'allow',
                            style: {
                                fontFamily: 'var(--xh-font-family)',
                                fontSize: 'var(--xh-font-size-small-px)',
                                fontWeight: 'normal',
                                textOutline: 'none'
                            },
                            padding: 2,
                            borderRadius: 5,
                            backgroundColor: 'var(--xh-bg-highlight)',
                            // Hides the little dot artifacts in the top left of the chart, which are caused by mysterious empty data labels.
                            filter: {
                                property: 'value',
                                operator: '!=',
                                value: null
                            }
                        },
                        link: {
                            color: 'var(--xh-border-color)',
                            type: 'default'
                        },
                        marker: {
                            fillColor: 'var(--xh-bg-highlight)',
                            radius: 8
                        },
                        point: {
                            events: {
                                mouseOver: function () {
                                    if (isEmpty(this.node)) {
                                        return false; // Disable tooltip for links
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    @computed
    private get leafCount(): number {
        const {relatedRoles, limitToOneLevel, role} = this;
        // Limit to one level means that we only show the direct children of the root role.
        if (limitToOneLevel)
            return sumBy(relatedRoles, it => (it.sourceRoles.includes(role.name) ? 1 : 0));

        return sumBy(relatedRoles, it => {
            const hasChildren = relatedRoles.some(other => other.sourceRoles.includes(it.name)),
                parentCount = it.sourceRoles.length;
            // If the role has children, it is not a leaf in one of its occurrences, so we subtract 1.
            return hasChildren ? parentCount - 1 : parentCount;
        });
    }

    @computed
    private get maxDepth(): number {
        const {role: root, relatedRoles, limitToOneLevel} = this;
        // Only the root node.
        if (isEmpty(relatedRoles)) return 1;
        // Limit to one level means that we only show two levels.
        if (limitToOneLevel) return 2;

        const maxDepthRecursive = (roleName: string) => {
            if (roleName === root.name) return 1;
            const role = relatedRoles.find(it => it.name === roleName);
            if (role.sourceRoles.includes(root.name)) return 2;
            const firstSourceName = role.sourceRoles.reduce((acc, it) => (acc < it ? acc : it));
            return maxDepthRecursive(firstSourceName) + 1;
        };

        return relatedRoles.reduce((acc, role) => {
            const depth = role.sourceRoles.reduce(
                (acc, sourceName) => Math.max(acc, maxDepthRecursive(sourceName) + 1),
                0
            );
            return Math.max(acc, depth);
        }, 1);
    }
}
