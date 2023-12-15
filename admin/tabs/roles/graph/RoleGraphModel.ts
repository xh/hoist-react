import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {sortBy} from 'lodash';
import {HoistRole} from '../HoistRole';

export class RoleGraphModel extends HoistModel {
    @lookup(RolesModel) readonly rolesModel: RolesModel;
    @managed readonly chartModel: ChartModel = this.createChartModel();

    get selectedRole(): HoistRole {
        return this.rolesModel.selectedRole;
    }

    override onLinked() {
        this.addReaction({
            track: () => this.selectedRole,
            run: async (selectedRole: HoistRole) => {
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

    private getSeriesData(role: HoistRole): Array<{id: string; name: string; parent?: string}> {
        const {effectiveRoles, name} = role;
        return [
            {
                id: name,
                name
            },
            ...sortBy(effectiveRoles, 'name').flatMap(({name, sourceRoles}) =>
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
