/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, button} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler, table, tbody, tr, th, td} from 'hoist/layout';
import {jsonField, toolbar} from 'hoist/cmp';
import {fmtDateTime} from 'hoist/format';
import {Icon} from 'hoist/icon';

@hoistComponent()
class ActivityDetail extends Component {

    render() {
        const model = this.model,
            rec = model.detailRecord;

        if (!rec) return null;

        return dialog({
            title: 'Activity Details',
            style: {width: 600},
            isOpen: model.detailRecord,
            onClose: this.onCloseClick,
            items: this.renderDetail(rec)
        });
    }

    renderDetail(rec) {
        return [
            table({
                cls: 'xh-admin-activity-detail',
                items: [
                    tbody(
                        tr({
                            omit: !rec.username,
                            items: [th('User:'), td(rec.username)]
                        }),
                        tr({
                            omit: !rec.impersonating,
                            items: [th('Impersonating:'), td(rec.impersonating)]}),

                        tr({
                            omit: !rec.msg,
                            items: [th('Message:'), td(rec.msg)]
                        }),
                        tr({
                            omit: !rec.category,
                            items: [th('Category:'), td(rec.category)]
                        }),
                        tr({
                            omit: !rec.device && !rec.browser,
                            items: [th('Device/Browser:'), td(`${rec.device}/${rec.browser}`)]}),

                        tr({ omit: !rec.userAgent,
                            items: [th('Agent:'), td(rec.userAgent)]
                        }),
                        tr({
                            omit: !rec.elapsed,
                            items: [th('Elapsed (ms):'), td(`${rec.elapsed}`)]
                        }),
                        tr({
                            omit: !rec.dateCreated,
                            items: [th('Date:'), td(fmtDateTime(rec.dateCreated))]
                        })
                    )
                ]
            }),
            jsonField({
                value: rec.data,
                disabled: true,
                lineWrapping: true,
                height: 100
            }),
            toolbar(
                filler(),
                button({
                    icon: Icon.close(),
                    text: 'Close',
                    intent: 'primary',
                    onClick: this.onCloseClick
                })
            )
        ];
    }

    onCloseClick = () => {
        this.model.setDetailRecord(null);
    }
}
export const activityDetail = elemFactory(ActivityDetail);