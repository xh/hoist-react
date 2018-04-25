/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {hoistComponent, elemFactory} from 'hoist/core';
import {observable, setter} from 'hoist/mobx';
import {Classes, suggest} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * ComboBox Field, which populates its items via an async function (e.g. querying a remote server)
 *
 * @prop rest, see properties for HoistField
 *
 * @prop queryAsync, async function that receives (string query)
 *          Should return a collection of form [{value: string, label: string}, ...] or [val, val, ...]
 * @prop placeholder, text to display when control is empty
 * @prop itemRenderer, optional custom itemRenderer, a function that receives (item, itemProps)
 */
@hoistComponent()
export class AsyncComboField extends HoistField {
    @observable.ref @setter items = [];

    static defaultProps = {
        placeholder: 'Search'
    }

    delegateProps = ['className', 'style', 'placeholder', 'disabled'];

    constructor(props) {
        super(props);
        this.addAutoRun(() => this.onQueryChange(), {delay: 100});
    }

    render() {
        const {style, width, itemRenderer, disabled} = this.props;

        const value = this.renderValue;

        return suggest({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: this.items,
            onItemSelect: this.onItemSelect,
            itemRenderer: itemRenderer || this.defaultItemRenderer,
            inputValueRenderer: s => s,
            inputProps: {
                value: value === null ? '' : value.toString(),
                onChange: this.onChange,
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                style: {...style, width},
                ...this.getDelegateProps()
            },
            disabled
        });
    }

    onQueryChange() {
        const query = this.internalValue,
            {queryAsync} = this.props;

        if (!queryAsync) return;
        queryAsync(query).then(items => {
            this.setItems(items);
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

    onItemSelect = (val) => {
        this.noteValueChange(val);
        this.doCommit();
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
    }

}
export const asyncComboField = elemFactory(AsyncComboField);