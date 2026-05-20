/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isOpen} from '@xh/hoist/admin/columns';
import {activityDetailView} from '@xh/hoist/admin/tabs/activity/tracking/detail/ActivityDetailView';
import {ClientDetailModel} from './ClientDetailModel';
import {h2, hbox, placeholder, vbox} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/cmp/mask';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import './ClientDetail.scss';

export const clientDetailPanel = hoistCmp.factory({
    displayName: 'ClientDetailPanel',
    model: creates(ClientDetailModel),

    render({model}) {
        return panel({
            className: 'xh-admin-client-detail',
            collapsedTitle: model.title,
            collapsedIcon: Icon.analytics(),
            compactHeader: true,
            modelConfig: {side: 'right', defaultSize: '40%'},
            item: model.hasSelection
                ? clientDetail()
                : placeholder(Icon.analytics(), 'Select a client to view activity...')
        });
    }
});

const clientDetail = hoistCmp.factory<ClientDetailModel>(({model}) => {
    const {data} = model.selectedRec;
    return panel({
        items: [
            hbox({
                className: 'xh-admin-client-detail__header',
                items: [
                    h2(isOpen.renderer(data.isOpen, null), data.user),
                    vbox({
                        className: 'xh-admin-client-detail__header__meta',
                        items: [
                            relativeTimestamp({
                                timestamp: data.createdTime,
                                prefix: 'Session established'
                            }),
                            relativeTimestamp({
                                timestamp: data.lastReceivedTime,
                                prefix: 'Last heartbeat',
                                emptyResult: 'No heartbeat yet'
                            })
                        ]
                    })
                ]
            }),
            panel({
                item: activityDetailView(),
                mask: mask({
                    bind: model.loadObserver,
                    spinner: true,
                    message: 'Loading activity...'
                })
            })
        ]
    });
});
