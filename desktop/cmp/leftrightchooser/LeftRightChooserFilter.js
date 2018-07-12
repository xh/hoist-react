/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {escapeRegExp, isEqual} from 'lodash';
import {inputGroup} from '@xh/hoist/kit/blueprint';
import {observable, setter} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';

/**
 * A Component that can bind to a LeftRightChooser and filter both lists
 * based on simple text matching in selected fields.
 */
@HoistComponent()
class LeftRightChooserFilter extends Component {

    static propTypes = {
        /** Names of fields in chooser to filter by */
        fields: PT.arrayOf(PT.string).isRequired,
        /** True to prevent regex start line anchor from being added */
        anyMatch: PT.bool,
        /** A LeftRightChooserModel to bind to */
        model: PT.object.isRequired
    };

    @setter @observable value = '';

    render() {
        return inputGroup({
            placeholder: 'Quick filter...',
            value: this.value,
            onChange: this.onValueChange,
            rightElement: button({
                cls: 'pt-minimal pt-icon-cross',
                onClick: this.clearFilter
            })
        });
    }

    onValueChange = (e) => {
        this.setValue(e.target.value);
        this.runFilter();
    }

    clearFilter = () => {
        this.setValue('');
        this.runFilter();
    }
    
    runFilter() {
        const {fields, anyMatch} = this.props;
        let searchTerm = escapeRegExp(this.value);

        if (!anyMatch) {
            searchTerm = `(^|\\\\W)${searchTerm}`;
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