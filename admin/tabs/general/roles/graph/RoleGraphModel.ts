import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, lookup, managed, PlainObject} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {sortBy} from 'lodash';
import {HoistRole} from '../Types';

export class RoleGraphModel extends HoistModel {
    @lookup(RoleModel) readonly roleModel: RoleModel;
    @managed readonly chartModel: ChartModel = this.createChartModel();

    @bindable relationship: 'effective' | 'inherited' = 'inherited';

    get selectedRole(): HoistRole {
        return this.roleModel.selectedRole;
    }

    override onLinked() {
        this.addReaction({
            track: () => [this.selectedRole, this.relationship],
            run: async ([selectedRole]: [HoistRole]) => {
                // We need to clear the chart first to avoid HC rendering glitches
                this.chartModel.clear();
                await wait();
                if (!selectedRole) return;
                this.chartModel.setSeries({
                    type: 'treegraph',
                    data: this.getSeriesData(selectedRole)
                });
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
            relatedRoles =
                this.relationship === 'effective' ? role.effectiveRoles : role.inheritedRoles;
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
