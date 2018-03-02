/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import moment from 'moment';
import {forOwn} from 'lodash';
import {button} from 'hoist/kit/blueprint';
import {XH, hoistComponent, elemFactory} from 'hoist/core';
import {chart, ChartModel} from 'hoist/highcharts';
import {vframe, hbox} from 'hoist/layout';
import {observable, action, whyRun, trace} from 'hoist/mobx';

@hoistComponent()
export class VisitsChart extends Component {

    @observable.ref _dailyVisits = [];

    @observable chartModel = new ChartModel({
        config: {
            startDate: 20151128,
            chart: {type: 'column'},
            title: {text: 'Unique Visits'},
            xAxis: {
                type: 'datetime',
                units: [['day', [1]], ['week', [1]], ['month', [1]]]
            },
            yAxis: {
                title: {
                    text: 'Unique Visits'
                }
            }
        }
    });

    render() {
        if(this._dailyVisits.length === 0 || this.needReload) {
            this.getUniqueVisits();
            return null
        }

        this.chartModel.setSeries(this.getSeries(this._dailyVisits));

        return vframe(
                this.createToolbar(),
                chart({model: this.chartModel})
        );
    }

    getUniqueVisits() {
        return XH.fetchJson({
            url: 'trackLogAdmin/dailyVisitors',
            // params will also take a user name, cannot be set to null, better to not pass one at all.
            params: {
                startDate: this.chartModel.config.startDate, // piq defaults to a year ago from today. implement this later
                endDate: 20180228
            },
        }).then(data => {
            this.setDailyVisits(data)
        }).catchDefault({
            message: 'Failed to fetch daily visits'
        });
    }

    getSeries(visits) {
        if (visits.length === 0) return;

        const data = [];

        forOwn(visits, (k, v) => {
            data.push([moment(v).valueOf(), k])
        });

        return  [{
            data: data
        }]
    }

    createToolbar() {
        return hbox({
            itemSpec: {
                factory: button,
                cls: 'xh-mr'
            },
            items: [{
                text: 'Change Start Date',
                intent: 'success',
                onClick: this.onChangeDate
            }]
        });
    }

    @action
    setDailyVisits(data) {
        this._dailyVisits = data;
        this.needReload = false;
    }

    @action
    onChangeDate = () => {
        this.chartModel.config.startDate = 20171101;
    }

}

export const visitsChart = elemFactory(VisitsChart);