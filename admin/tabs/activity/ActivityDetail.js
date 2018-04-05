import {Component} from 'react';
import {dialog, button} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler, table, tbody, tr, th, td} from 'hoist/layout';
import {jsonField, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@hoistComponent()
class ActivityDetail extends Component {

    render() {
        const model = this.model;
        return dialog({
            title: 'Activity Details',
            icon: Icon.gauge({size: '2x'}),
            isOpen: model.detailOpen,
            onClose: this.onDetailCloseClick,
            items: this.renderDetail()
        });
    }

    renderDetail() {
        const rec = this.model.gridModel.selection.singleRecord;
        if (!rec) return null;
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
                height: 300
            }),
            toolbar({
                cls: 'xh-toolbar',
                items: [
                    filler(),
                    button({
                        icon: Icon.close(),
                        text: 'Close',
                        intent: 'danger',
                        onClick: this.onDetailCloseClick
                    })
                ]
            })
        ];
    }

    onDetailCloseClick = () => {
        this.model.setDetailOpen(false);
    }
}
export const activityDetail = elemFactory(ActivityDetail);