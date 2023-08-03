import {div, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {compactDateRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {makeObservable} from 'mobx';
import {DetailPanelModel} from '../DetailPanel';

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
            track: () => this.lookupModel(DetailPanelModel).roleDetails,
            run: role => {
                this.roleDetails = role;
            }
        });
    }

    reset() {
        window.alert('Reset ✅');
    }

    async submitAsync() {
        window.alert('Submitted ✅');
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
                            button({
                                icon: Icon.edit(),
                                intent: 'warning',
                                style: {height: '2em'}
                            })
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
                            model.roleDetails?.inherits?.length != 0
                                ? model.roleDetails?.inherits.map(roleName =>
                                      // see below as to why this (yet) isn't pulled out..
                                      div({
                                          item: [
                                              div({
                                                  style: {
                                                      position: 'absolute',
                                                      borderRadius: '100%',
                                                      backgroundColor: 'pink',
                                                      width: '1em',
                                                      height: '1em',
                                                      left: '0.5em'
                                                  }
                                              }),
                                              roleName
                                          ],
                                          style: {
                                              position: 'relative',
                                              display: 'flex',
                                              alignItems: 'center',
                                              paddingBlock: '0.1em',
                                              paddingInline: '2em 0.5em',
                                              borderRadius: '0.5em',
                                              color: 'var(--xh-appbar-color)',
                                              backgroundColor: 'var(--xh-appbar-bg)',
                                              width: 'fit-content'
                                              //   boxSizing: 'border-box'
                                          },
                                          key: roleName
                                      })
                                  )
                                : div({
                                      item: 'None',
                                      style: {
                                          color: 'var(--xh-text-color-muted)',
                                          //   to prevent downward shift if no inheritance
                                          marginBottom: '0.2em'
                                      }
                                  })
                        ],
                        style: {
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignContent: 'flex-start',
                            columnGap: '0.5em',
                            minHeight: '1lh',
                            maxHeight: '8lh',
                            rowGap: '0.4em',
                            overflowY: 'scroll',
                            marginBottom: '1lh'
                        }
                    }),
                    div({
                        item:
                            model.roleDetails?.notes ??
                            div({item: 'No notes', style: {color: 'var(--xh-text-color-muted)'}}),
                        style: {maxHeight: '8lh', overflowY: 'scroll', marginBottom: '1lh'}
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

// TODO: would prefer to pull this out (above) as its own component, but the
// key doesn't seem to be getting set properly
// const inheritanceTag = hoistCmp.factory({
//     render({roleName}) {
//         return span({
//             item: roleName,
//             style: {
//                 padding: '2px 10px',
//                 borderRadius: '4px',
//                 color: 'var(--xh-gray-light)'
//             },
//             key
//         });
//     }
// });
