/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {observable, action} from 'mobx';
import {label} from 'hoist/cmp';
import {Timer} from 'hoist/utils/Timer';
import {SECONDS} from 'hoist/utils/DateTimeUtils';
import {getString} from 'hoist/utils/RelativeTimestampUtils';
/**
 * A RelativeTimestamp form field that uses the RelativeTimestamp string generator
 *
 * @prop timeStamp, Date
 * @prop options, Object, see the RelativeTimestamp options
 */

@hoistComponent()
class RelativeTimestamp extends Component {
    @observable relativeTimeString;
    timer = null;

    render() {
        return label(this.relativeTimeString);
    }

    @action
    updateLabel = () => {
        const {timeStamp, options} = this.props;
        this.relativeTimeString = getString(timeStamp, options);
    }

    componentDidMount() {
        this.timer = new Timer({
            runFn: this.updateLabel,
            interval: 10 * SECONDS
        });
    }

    componentWillUnmount() {
        this.timer.cancel();
    }
}

export const relativeTimestamp = elemFactory(RelativeTimestamp);