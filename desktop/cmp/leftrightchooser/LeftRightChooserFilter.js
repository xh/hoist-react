/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {escapeRegExp} from 'lodash';
import {bindable} from '@xh/hoist/mobx';
import {hoistCmp, useLocalModel, uses, HoistModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {textInput} from '@xh/hoist/desktop/cmp/input';

import {LeftRightChooserModel} from './LeftRightChooserModel';

/**
 * A Component that can bind to a LeftRightChooser and filter both lists
 * based on simple text matching in selected fields.
 */
export const [LeftRightChooserFilter, leftRightChooserFilter] = hoistCmp.withFactory({
    displayName: 'LeftRightChooserFilter',
    model: uses(LeftRightChooserModel),

    render(props) {
        const impl = useLocalModel(LocalModel);
        impl.lastProps = props;

        return textInput({
            placeholder: 'Quick filter...',
            bind: 'value',
            model: impl,
            commitOnChange: true,
            leftIcon: Icon.filter({style: {opacity: 0.5}}),
            enableClear: true
        });
    }
});

LeftRightChooserFilter.propTypes = {

    /** Names of fields in chooser on which to filter. */
    fields: PT.arrayOf(PT.string).isRequired,

    /** True to prevent regex start line anchor from being added. */
    anyMatch: PT.bool,

    /** A LeftRightChooserModel to bind to. */
    model: PT.object
};


@HoistModel
class LocalModel {
    lastProps;

    @bindable
    value = null;

    constructor() {
        this.addReaction({
            track: () => this.value,
            run: () => this.runFilter()
        });
    }

    runFilter() {
        const {fields, anyMatch, model} = this.lastProps;
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

        model.setDisplayFilter(filter);
    }

    destroy() {
        // This unusual bit of code is extremely important -- the model we are linking to might
        // survive the display of this component and should be restored. (This happens with GridColumnChooser)
        this.lastProps.model.setDisplayFilter(null);
    }
}