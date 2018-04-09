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
import {Icon} from 'hoist/icon';

@hoistComponent()
class ActivityDetail extends Component {

    render() {
        const model = this.model,
            rec = model.gridModel.selection.singleRecord;

        if (!rec) return null;

        return dialog({
            title: 'Activity Details',
            style: {width: 450},
            isOpen: model.detailOpen,
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
                        tr(th('User:'), td(rec.username)),
                        tr(th('Message:'), td(rec.msg)),
                        tr(th('Category:'), td(rec.category)),
                        tr(th('Agent:'), td(rec.userAgent))
                    )
                ]
            }),
            jsonField({
                value: rec.data,
                disabled: true,
                lineWrapping: true,
                height: 100
            }),
            toolbar({
                cls: 'xh-toolbar',
                items: [
                    filler(),
                    button({
                        icon: Icon.close(),
                        text: 'Close',
                        intent: 'danger',
                        onClick: this.onCloseClick
                    })
                ]
            })
        ];
    }

    onCloseClick = () => {
        this.model.setDetailOpen(false);
    }
}
export const activityDetail = elemFactory(ActivityDetail);