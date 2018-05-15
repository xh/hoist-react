/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button, inputGroup} from '@xh/hoist/kit/blueprint';
import {observable, setter} from '@xh/hoist/mobx';
import {escapeRegExp} from 'lodash';

/**
 * A Component that can bind to a LeftRightChooser and filter both lists
 * based on simple text matching in selected fields.
 */
@HoistComponent()
class LeftRightChooserFilter extends Component {

    static propTypes = {
        /** Names of fields in chooser to filter by */
        fields: PT.arrayOf(PT.string)
    };

    static baseCls = 'xh-lr-chooser-filter';

    @setter @observable value = '';

    render() {
        return inputGroup({
            placeholder: 'Quick filter...',
            value: this.value,
            onChange: this.onValueChange,
            rightElement: button({
                cls: 'pt-minimal pt-icon-cross',
                onClick: this.onClearClick
            })
        });
    }

    onValueChange = (e) => {
        this.setValue(e.target.value);
        this.runFilter();
    }

    onClearClick = () => {
        this.setValue('');
        this.runFilter();
    }
    
    runFilter() {
        const fields = this.props.fields || [],
            searchTerm = escapeRegExp(this.value);

        const filter = (raw) => {
            return fields.some(f => {
                const fieldVal = !!searchTerm && raw[f];
                return ((fieldVal && new RegExp(`(^|\\\\W)${searchTerm}`, 'ig').test(fieldVal)) || !fieldVal);
            });
        };

        this.model.setDisplayFilter(filter);
    }
}
export const leftRightChooserFilter = elemFactory(LeftRightChooserFilter);