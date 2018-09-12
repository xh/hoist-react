/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {searchInput as onsenSearchInput} from '@xh/hoist/kit/onsen';

import {HoistInput} from '@xh/hoist/cmp/form';
import './SearchInput.scss';

/**
 * A Search Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class SearchInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

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

    baseClassName = 'xh-search-field';

    render() {
        const {style, width, spellCheck} = this.props;

        return onsenSearchInput({
            className: this.getClassName(),
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


    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = () => {
        this.noteFocused();
    }
}

export const searchInput = elemFactory(SearchInput);