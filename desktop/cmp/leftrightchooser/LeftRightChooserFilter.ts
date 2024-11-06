/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, HoistProps, lookup, useLocalModel, uses} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {escapeRegExp} from 'lodash';
import {LeftRightChooserModel} from './LeftRightChooserModel';

export interface LeftRightChooserFilterProps extends HoistProps<LeftRightChooserModel> {
    /** Names of fields in chooser on which to filter. Defaults to ['text', 'group'] */
    fields?: string[];

    /** True to prevent regex start line anchor from being added. */
    anyMatch?: boolean;
}

/**
 * A Component that can bind to a LeftRightChooser and filter both lists
 * based on simple text matching in selected fields.
 */
export const [LeftRightChooserFilter, leftRightChooserFilter] =
    hoistCmp.withFactory<LeftRightChooserFilterProps>({
        displayName: 'LeftRightChooserFilter',
        model: uses(LeftRightChooserModel),

        render() {
            const impl = useLocalModel(LeftRightChooserFilterLocalModel);
            return textInput({
                placeholder: 'Filter...',
                bind: 'value',
                model: impl,
                commitOnChange: true,
                leftIcon: Icon.filter({style: {opacity: 0.5}}),
                enableClear: true
            });
        }
    });

class LeftRightChooserFilterLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(LeftRightChooserModel)
    model: LeftRightChooserModel;

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

    private runFilter() {
        const {fields = ['text', 'group'], anyMatch = false} = this.componentProps;
        let searchTerm = escapeRegExp(this.value);

        if (!anyMatch) {
            searchTerm = `(^|\\W)${searchTerm}`;
        }

        const filter = raw => {
            return fields.some(f => {
                if (!searchTerm) return true;
                const fieldVal = raw.data[f];
                return fieldVal && new RegExp(searchTerm, 'ig').test(fieldVal);
            });
        };

        this.model.setDisplayFilter(filter);
    }

    override destroy() {
        // This unusual bit of code is extremely important -- the model we are linking to might
        // survive the display of this component and should be restored. (This happens with GridColumnChooser)
        this.model.setDisplayFilter(null);
        super.destroy();
    }
}
