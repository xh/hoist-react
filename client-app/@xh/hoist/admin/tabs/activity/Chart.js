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
import {grid, GridModel} from 'hoist/grid';
import {chart, ChartModel} from 'hoist/highcharts';
import {vframe, hbox, vbox} from 'hoist/layout';
import {collapsible} from 'hoist/cmp';
import {observer, observable, action, whyRun} from 'hoist/mobx';
import {numberRenderer} from 'hoist/format';

@hoistComponent()
export class VisitsChart extends Component {

    @observable _dailyVisits = [];
    @observable.ref needReload = false;
    startDate = 20151128;

    @observable chartModel = new ChartModel({
        config: {
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
            this.getUniqueVisits(this.startDate);
        }

        this.chartModel.setSeries(this.getSeries(this._dailyVisits));

        return vframe(
                this.createToolbar(),
                chart({model: this.chartModel})
        );
    }

    @action
    onChangeDate = () => {
        console.log('changing startDate');
        this.startDate = 20171101;
        this.needReload = true; // this is wrong. You are not supposed to change obseravb;es in render but it's the only way I've been able to trigger rerender
    }


    getUniqueVisits(startDate) {
        // console.log('fetching', config.startDate);
        return XH.fetchJson({
            url: 'trackLogAdmin/dailyVisitors',
            // params will also take a user name, cannot be set to null, better to not pass one at all.
            params: {
                startDate: startDate, // piq defaults to a year ago from today. implement this later
                endDate: 20180228
            },
        }).then(data => {
            this.setDailyVisits(data)
        }).catchDefault({
            message: 'Failed to fetch daily visits'
        });
    }

    @action
    setDailyVisits(data) {
        this._dailyVisits = data;
        this.needReload = false;
    }

    getSeries(visits) {
        if (visits.length === 0) return;

        const data = [];

        forOwn(this._dailyVisits, (k, v) => {
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

}

export const visitsChart = elemFactory(VisitsChart);