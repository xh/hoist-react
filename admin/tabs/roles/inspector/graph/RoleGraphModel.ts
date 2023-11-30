import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, HoistRole, lookup, managed} from '@xh/hoist/core';
import {isEmpty, uniqBy} from 'lodash';

export class RoleGraphModel extends HoistModel {
    @lookup(() => RoleInspectorModel) readonly roleInspectorModel: RoleInspectorModel;
    @managed readonly chartModel: ChartModel = this.createChartModel();

    override onLinked() {
        const {roleInspectorModel} = this;
        this.addReaction({
            track: () => [roleInspectorModel.selectedRole, roleInspectorModel.allRoles],
            run: ([role, allRoles]: [HoistRole, HoistRole[]]) => {
                if (!role && isEmpty(allRoles)) {
                    this.chartModel.clear();
                    return;
                }

                this.chartModel.setSeries({
                    type: 'organization',
                    data: role
                        ? this.getSeriesData(role)
                        : uniqBy(
                              allRoles.flatMap(it => this.getSeriesData(it)),
                              it => `${it.from}-${it.to}`
                          ),
                    nodes: role && [
                        {
                            id: role.name,
                            name: role.name,
                            title: '(This Role)',
                            color: 'var(--xh-intent-neutral'
                        }
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

    private getSeriesData(role: HoistRole): Array<{from: string; to: string}> {
        return [
            ...role.inheritedRoles.map(({role, inheritedBy}) => ({
                from: inheritedBy,
                to: role
            })),
            ...role.effectiveRoles.flatMap(({name, roles}) =>
                roles.map(role => ({
                    from: name,
                    to: role
                }))
            )
        ];
    }

    private createChartModel(): ChartModel {
        const me = this;
        return new ChartModel({
            highchartsConfig: {
                chart: {
                    inverted: true
                },
                plotOptions: {
                    organization: {
                        colorByPoint: false,
                        point: {
                            events: {
                                click: function () {
                                    me.roleInspectorModel.selectRole(this.id);
                                }
                            }
                        }
                    }
                },
                tooltip: {
                    enabled: false
                }
            }
        });
    }
}
