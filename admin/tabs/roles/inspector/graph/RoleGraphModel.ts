import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, HoistRole, lookup, managed} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';

export class RoleGraphModel extends HoistModel {
    @lookup(() => RoleInspectorModel) readonly roleInspectorModel: RoleInspectorModel;
    @managed readonly chartModel: ChartModel = this.createChartModel();

    override onLinked() {
        this.addReaction({
            track: () => this.roleInspectorModel.role,
            run: async (role: HoistRole) => {
                this.chartModel.clear();
                if (!role) return;

                // Need to wait for chart to clear before setting new data.
                // Otherwise HC attempts to match nodes by id, causing incorrect rendering.
                await wait();

                const {name, allInheritedRoles} = role;
                this.chartModel.setSeries({
                    type: 'treegraph',
                    data: [
                        ...allInheritedRoles.map(({role, inheritedBy}) => ({
                            id: role,
                            name: role,
                            parent: inheritedBy
                        })),
                        {id: name, name}
                    ]
                });
            },
            fireImmediately: true,
            debounce: 100
        });
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private createChartModel(): ChartModel {
        const me = this;
        return new ChartModel({
            highchartsConfig: {
                chart: {
                    inverted: true
                },
                plotOptions: {
                    treegraph: {
                        dataLabels: {
                            enabled: true
                        },
                        point: {
                            events: {
                                click: function () {
                                    me.roleInspectorModel.selectRole(this.id);
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}
