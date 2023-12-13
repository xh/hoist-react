import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, HoistRole, lookup, managed} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import classNames from 'classnames';
import {compact, isEmpty} from 'lodash';

export class RoleGraphModel extends HoistModel {
    @lookup(RolesModel) readonly rolesModel: RolesModel;
    @managed readonly chartModel: ChartModel = this.createChartModel();

    override onLinked() {
        const {chartModel, rolesModel} = this;
        this.addReaction({
            track: () => [rolesModel.selectedRole, rolesModel.allRoles],
            run: async ([selectedRole, allRoles]: [HoistRole, HoistRole[]]) => {
                // We need to clear the chart first to avoid stuck stale tooltips
                chartModel.clear();
                await wait();
                if (!selectedRole && isEmpty(allRoles)) return;

                const relatedRoles = this.getRelatedRoles(selectedRole);

                chartModel.setSeries({
                    type: 'organization',
                    data: selectedRole
                        ? this.getSeriesData(selectedRole)
                        : allRoles.flatMap(role => this.getSeriesData(role)),
                    nodes: allRoles.map(role => {
                        const {category, name} = role;
                        return {
                            id: name,
                            name,
                            category,
                            color: this.getNodeColor(role, relatedRoles, selectedRole?.name),
                            dataLabels: {
                                className: classNames(
                                    'role-node',
                                    selectedRole &&
                                        selectedRole.name !== name &&
                                        !relatedRoles.has(name) &&
                                        'role-node--muted'
                                )
                            }
                        };
                    })
                });
            },
            fireImmediately: true,
            debounce: 100
        });
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private getRelatedRoles(role?: HoistRole): Set<string> {
        if (!role) return new Set();
        return new Set([...role.inheritedRoles, ...role.effectiveRoles].map(it => it.name));
    }

    private getNodeColor(
        role: HoistRole,
        relatedRoles: Set<string>,
        selectedRole?: string
    ): string {
        if (role.name === selectedRole) return 'var(--xh-selected-role-color)';
        if (relatedRoles.has(role.name)) return 'var(--xh-related-role-color)';
        return 'var(--xh-unrelated-role-color)';
    }

    private getSeriesData(role: HoistRole): Array<{from: string; to: string}> {
        const {name, inheritedRoles, effectiveRoles} = role;

        return isEmpty(inheritedRoles) && isEmpty(effectiveRoles)
            ? [{from: name, to: null}]
            : [
                  ...inheritedRoles.flatMap(({name, sourceRoles}) =>
                      sourceRoles.map(source => ({
                          from: source,
                          to: name
                      }))
                  ),
                  ...effectiveRoles.flatMap(({name, sourceRoles}) =>
                      sourceRoles.map(source => ({
                          from: name,
                          to: source
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
                        animation: false,
                        borderColor: 'var(--xh-border-color)',
                        colorByPoint: false,
                        inactiveOtherPoints: false,
                        link: {
                            color: 'var(--xh-border-color)'
                        },
                        nodeWidth: 30,
                        point: {
                            events: {
                                click: function () {
                                    me.rolesModel.selectRole(this.id);
                                }
                            }
                        }
                    }
                },
                tooltip: {
                    formatter: function () {
                        const {category, isNode, name} = this.point;
                        return !!isNode && compact([`<b>${name}</b>`, category]).join('<br/>');
                    },
                    outside: true
                }
            }
        });
    }
}
