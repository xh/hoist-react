/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, useLocalModel, uses, lookup} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {escapeRegExp} from 'lodash';
import PT from 'prop-types';
import {LeftRightChooserModel} from './LeftRightChooserModel';

/**
 * A Component that can bind to a LeftRightChooser and filter both lists
 * based on simple text matching in selected fields.
 */
export const [LeftRightChooserFilter, leftRightChooserFilter] = hoistCmp.withFactory({
    displayName: 'LeftRightChooserFilter',
    model: uses(LeftRightChooserModel),

    render() {
        const impl = useLocalModel(LocalModel);
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

    /** Names of fields in chooser on which to filter. Defaults to ['text', 'group'] */
    fields: PT.arrayOf(PT.string),

    /** True to prevent regex start line anchor from being added. */
    anyMatch: PT.bool,

    /** A LeftRightChooserModel to bind to. */
    model: PT.object
};


class LocalModel extends HoistModel {

    /** @member {LeftRightChooserModel} */
    @lookup(LeftRightChooserModel) model;

    @bindable
    value = null;

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => this.value,
            run: () => this.runFilter()
        });
    }

    runFilter() {
        const {fields = ['text', 'group'], anyMatch = false} = this.componentProps;
        let searchTerm = escapeRegExp(this.value);

        if (!anyMatch) {
            searchTerm = `(^|\\W)${searchTerm}`;
        }

        const filter = (raw) => {
            return fields.some(f => {
                if (!searchTerm) return true;
                const fieldVal = raw.data[f];
                return fieldVal && new RegExp(searchTerm, 'ig').test(fieldVal);
            });
        };

        this.model.setDisplayFilter(filter);
    }

    destroy() {
        // This unusual bit of code is extremely important -- the model we are linking to might
        // survive the display of this component and should be restored. (This happens with GridColumnChooser)
        this.model.setDisplayFilter(null);
        super.destroy();
    }
}
