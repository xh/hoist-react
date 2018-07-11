/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {searchInput} from '@xh/hoist/mobile/onsen';

import {HoistField} from './HoistField';

/**
 * A Search Input Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent()
export class SearchField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** Value of the control */
        value: PT.string,

        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Whether to allow browser spell check, defaults to false */
        spellCheck: PT.bool,
        /** Onsen modifier string */
        modifier: PT.string
    };

    delegateProps = ['className', 'disabled', 'placeholder', 'modifier'];

    render() {
        const {style, width, spellCheck} = this.props;

        return searchInput({
            cls: 'xh-field xh-search-field',
            value: this.renderValue || '',
            onChange: this.onChange,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {...style, width},
            spellCheck: !!spellCheck,
            ...this.getDelegateProps()
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

}

export const searchField = elemFactory(SearchField);