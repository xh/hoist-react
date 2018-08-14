/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import moment from 'moment';
import {forOwn} from 'lodash';
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {ChartModel} from '@xh/hoist/desktop/cmp/chart';
import {fmtDate} from '@xh/hoist/format';
import {PanelSizingModel} from '@xh/hoist/desktop/cmp/panel';

@HoistModel()
export class VisitsChartModel {

    @observable startDate = moment().subtract(3, 'months').toDate();
    @observable endDate = new Date();
    @observable username = '';

    sizingModel = new PanelSizingModel({
        defaultSize: 500,
        side: 'bottom',
        prefName: 'xhAdminActivityChartSize'
    });

    chartModel = new ChartModel({
        config: {
            chart: {type: 'column'},
            legend: {
                enabled: false
            },
            title: {text: null},
            xAxis: {
                type: 'datetime',
                units: [['day', [1]], ['week', [2]], ['month', [1]]],
                labels: {
                    formatter: function() {return fmtDate(this.value, 'D MMM')}
                }
            },
            yAxis: {
                title: {
                    text: 'Unique Visits'
                }
            }
        }
    });

    async loadAsync() {
        const {startDate, endDate, username} = this;

        if ((!this.isValidDate(startDate)) || !this.isValidDate(endDate)) return;

        return XH.fetchJson({
            url: 'trackLogAdmin/dailyVisitors',
            params: {
                startDate: fmtDate(startDate, 'YYYYMMDD'),
                endDate: fmtDate(endDate, 'YYYYMMDD'),
                username: username
            }
        }).then(data => {
            this.chartModel.setSeries(this.getSeriesData(data));
        }).catchDefault();
    }

    @action
    setStartDate(date) {
        this.startDate = date;
    }

    @action
    setEndDate(date) {
        this.endDate = date;
    }

    @action
    setUsername(username) {
        this.username = username;
    }

    //----------------
    // Implementation
    //----------------
    isValidDate(date) {
        return date && date.toString() !== 'Invalid Date';
    }

    getSeriesData(visits) {
        const data = [];

        forOwn(visits, (k, v) => {
            data.push([moment(v).valueOf(), k]);
        });

        return [{data}];
    }

    destroy() {
        XH.safeDestroy(this.chartModel, this.sizingModel);
    }
}