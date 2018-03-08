/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {upperFirst} from 'lodash';
import moment from 'moment';
import {fmtDate} from 'hoist/format';
import {hoistComponent, elemFactory} from 'hoist/core';
import {dateInput} from 'hoist/kit/blueprint';

/**
 * A model bindable calendar field for choosing a Day.
 *
 * @prop model
 * @prop field, name of property in model to bind to
 * @prop width, width of field
 * @prop onCommit, handler to call when enter or tab pressed, or popover closed
 * @prop popoverPosition, 'top' | 'bottom' |  'auto' (auto determined),
 * @prop style
 */
@hoistComponent()
export class DayField extends Component {

    static defaultProps = {
        width: 100,
        popoverPosition: 'auto'
    }

    render() {
        const {model, field, width, onCommit, popoverPosition, style} = this.props;

        return dateInput({
            value: model[field],
            onChange: this.onChange,
            formatDate: this.formatDate,
            parseDate: this.parseDate,
            inputProps: {style: {...style, width}},
            popoverProps: {
                minimal: true,
                usePortal: true,
                position: popoverPosition,
                popoverWillClose: onCommit
            },
            dayPickerProps: {fixedWeeks: true}
        });
    }

    formatDate(date) {
        return fmtDate(date);
    }

    parseDate(dateString) {
        return moment(dateString).toDate();
    }

    onChange = (date) => {
        const {field} = this.props;
        this.model[`set${upperFirst(field)}`](date);
    }
}
export const dayField = elemFactory(DayField);