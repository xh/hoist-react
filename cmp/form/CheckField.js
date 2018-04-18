/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {hoistComponent, elemFactory} from 'hoist/core';
import {label} from 'hoist/cmp';
import {checkbox} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * CheckBox Field
 *
 * @prop rest, see properties for HoistField
 *
 * @prop text, name for labelling field
 */
@hoistComponent()
export class CheckField extends HoistField {

    static defaultProps = {
        text: ''
    }

    delegateProps = ['className', 'disabled']

    render() {
        const {text, style} = this.props;

        return checkbox({
            checked: this.renderValue,
            onChange: this.onChange,
            style: {...style, marginBottom: '0px', marginRight: '0px'},
            label: label(text),
            inline: true,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            ...this.getDelegateProps()
        });
    }

    onChange = (e) => {
        // BROKEN IN BLUEPRINT v2.1.1
        // Fix pushed to their develop branch 4/13/18
        // https://github.com/palantir/blueprint/issues/2370
        // https://github.com/palantir/blueprint/pull/2377/files
        this.noteValueChange(e.target.checked);
        this.doCommit();
    }
}
export const checkField = elemFactory(CheckField);