import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, lookup, managed, PlainObject} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {isEmpty, sortBy} from 'lodash';
import {HoistRole} from '../Types';

export class RoleGraphModel extends HoistModel {
    @lookup(RoleModel) readonly roleModel: RoleModel;
    @managed readonly chartModel: ChartModel = this.createChartModel();

    @bindable relationship: 'effective' | 'inherited' = 'inherited';

    get role(): HoistRole {
        return this.roleModel.selectedRole;
    }

    override onLinked() {
        const {chartModel} = this;
        this.addReaction({
            track: () => [this.role, this.relationship],
            run: async ([role]) => {
                chartModel.clear(); //  avoid HC rendering glitches
                await wait();
                if (role) {
                    chartModel.setSeries({
                        type: 'treegraph',
                        data: this.getSeriesData(role)
                    });
                }
            },
            fireImmediately: true,
            debounce: 100
        });
    }

    // -------------------------------
    // Implementation
    // -------------------------------
    private getSeriesData(role: HoistRole): PlainObject[] {
        const {name} = role,
            isEffective = this.relationship === 'effective',
            relatedRoles = isEffective ? role.effectiveRoles : role.inheritedRoles;
        if (isEmpty(relatedRoles)) return [];
        return [
            {
                id: name,
                name,
                dataLabels: {
                    style: {
                        fontWeight: 600
                    }
                },
                marker: {
                    fillColor: 'var(--xh-bg-alt)'
                }
            },
            ...sortBy(relatedRoles, 'name').flatMap(({name, sourceRoles}) =>
                [...sourceRoles].sort().map(source => ({
                    id: name,
                    name,
                    parent: source
                }))
            )
        ];
    }

    private createChartModel(): ChartModel {
        return new ChartModel({
            highchartsConfig: {
                chart: {
                    inverted: true
                },
                plotOptions: {
                    treegraph: {
                        animation: false,
                        collapseButton: {
                            enabled: false
                        },
                        tooltip: {
                            linkFormat: null
                        },
                        dataLabels: {
                            style: {
                                fontFamily: 'var(--xh-font-family)',
                                fontSize: 'var(--xh-font-size-small-px)',
                                fontWeight: 'normal',
                                textOutline: 'none'
                            }
                        },
                        link: {
                            color: 'var(--xh-border-color)'
                        },
                        marker: {
                            fillColor: 'var(--xh-bg-highlight)'
                        }
                    }
                }
            }
        });
    }
}
