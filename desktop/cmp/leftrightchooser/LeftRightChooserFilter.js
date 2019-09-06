/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {escapeRegExp, isEqual} from 'lodash';
import {observable, runInAction} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textInput} from '@xh/hoist/desktop/cmp/input';

/**
 * A Component that can bind to a LeftRightChooser and filter both lists
 * based on simple text matching in selected fields.
 */
@HoistComponent
export class LeftRightChooserFilter extends Component {

    static propTypes = {

        /** Names of fields in chooser on which to filter. */
        fields: PT.arrayOf(PT.string).isRequired,

        /** True to prevent regex start line anchor from being added. */
        anyMatch: PT.bool,

        /** A LeftRightChooserModel to bind to. */
        model: PT.object
    };

    @observable value = '';

    render() {
        return textInput({
            placeholder: 'Quick filter...',
            value: this.value,
            onChange: this.onValueChange,
            leftIcon: Icon.filter({style: {opacity: 0.5}}),
            rightElement: button({
                icon: Icon.x(),
                minimal: true,
                onClick: this.clearFilter
            })
        });
    }

    onValueChange = (v) => {
        runInAction(() => this.value = v);
        this.runFilter();
    }

    clearFilter = () => {
        runInAction(() => this.value = '');
        this.runFilter();
    }

    runFilter() {
        const {fields, anyMatch} = this.props;
        let searchTerm = escapeRegExp(this.value);

        if (!anyMatch) {
            searchTerm = `(^|\\W)${searchTerm}`;
        }

        const filter = (raw) => {
            return fields.some(f => {
                const fieldVal = !!searchTerm && raw[f];
                return ((fieldVal && new RegExp(searchTerm, 'ig').test(fieldVal)) || !fieldVal);
            });
        };

        this.model.setDisplayFilter(filter);
    }

    componentDidUpdate(prevProps) {
        const {props} = this;

        if (prevProps.anyMatch !== props.anyMatch || !isEqual(prevProps.fields, props.fields)) {
            this.runFilter();
        }
    }

    componentWillUnmount() {
        this.clearFilter();
    }
}
export const leftRightChooserFilter = elemFactory(LeftRightChooserFilter);