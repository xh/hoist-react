import {div, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {compactDateRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {makeObservable} from 'mobx';
import {InspectorTabModel} from '../InspectorTab';
import {rolesTags} from './RolesTags';

class RoleDetailsModel extends HoistModel {
    @bindable.ref roleDetails = null;

    constructor() {
        super();
        makeObservable(this);
    }

    get lastModifiedStr() {
        if (!this.roleDetails?.lastUpdated || !this.roleDetails?.lastUpdatedBy) {
            return 'Last modified: unknown';
        }
        const date = compactDateRenderer()(this.roleDetails?.lastUpdated);
        return `Last modified: ${this.roleDetails?.lastUpdatedBy} (${date})`;
    }

    override onLinked() {
        this.addReaction({
            track: () => this.lookupModel(InspectorTabModel).selectedRoleDetails,
            run: role => {
                this.roleDetails = role;
            },
            fireImmediately: true
        });
    }
}

export const roleDetails = hoistCmp.factory({
    model: creates(RoleDetailsModel),

    render({model}) {
        return div({
            items: [
                vbox(
                    div({
                        items: [
                            div({
                                items: [
                                    div({
                                        item: model.roleDetails?.name ?? 'Role Name',
                                        style: {fontSize: '1.3em'}
                                    }),
                                    div({
                                        item: model.roleDetails?.groupName ?? 'Role Group',
                                        style: {
                                            fontSize: '0.9em',
                                            color: 'var(--xh-text-color-muted)',
                                            marginBottom: '1.5lh'
                                        }
                                    })
                                ],
                                style: {
                                    boxSizing: 'content-box'
                                }
                            }),
                            div(
                                button({
                                    icon: Icon.edit(),
                                    intent: 'warning',
                                    onClick: () => {
                                        model.lookupModel(InspectorTabModel)?.editRole();
                                    },
                                    style: {height: '2em'},
                                    omit: !XH.getConf('xhRoleManagerConfig').canWrite
                                }),
                                button({
                                    icon: Icon.delete(),
                                    intent: 'danger',
                                    style: {height: '2em'},
                                    omit: !XH.getConf('xhRoleManagerConfig').canWrite,
                                    onClick: () => {
                                        model
                                            .lookupModel(InspectorTabModel)
                                            .getImpactDelete(
                                                model.lookupModel(InspectorTabModel)
                                                    .selectedRoleName
                                            );
                                    }
                                })
                            )
                        ],
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignContent: 'flex-start'
                        }
                    }),
                    div({
                        // 'Inherits',
                        items: [
                            div('Inherits: '),
                            rolesTags({roles: model.roleDetails?.inheritedRoles ?? []})
                        ],
                        style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignContent: 'flex-start',
                            columnGap: '0.2em',
                            minHeight: '1lh',
                            rowGap: '0.4em',
                            marginBottom: '1lh'
                        }
                    }),
                    div({
                        item:
                            model.roleDetails?.notes ??
                            div({item: 'No notes', style: {color: 'var(--xh-text-color-muted)'}}),
                        style: {maxHeight: '6.5lh', overflowY: 'scroll', marginBottom: '1lh'}
                    }),
                    div({
                        item: model.lastModifiedStr,
                        style: {
                            color: 'var(--xh-text-color-muted)',
                            fontSize: '0.9em',
                            fontStyle: 'italic'
                        }
                    })
                )
            ],
            style: {
                padding: '1em'
            }
        });
    }
});
