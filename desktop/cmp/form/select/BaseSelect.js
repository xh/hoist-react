/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {isObject} from 'lodash';
import {observable, action} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * BaseSelect
 *
 * Abstract class supporting BaseSelect and Select
 */
export class BaseSelect extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Text to display when control is empty */
        placeholder: PT.string
    };

    static defaultProps = {
        placeholder: 'Select',
        commitOnChange: false
    };

    // blueprint-ready collection of available options, normalized to {label, value} form.
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }

    @action
    normalizeOptions(options) {
        options = withDefault(options, []);
        this.internalOptions = options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });
    }
}