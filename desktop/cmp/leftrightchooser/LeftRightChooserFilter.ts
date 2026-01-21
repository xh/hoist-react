/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, HoistProps, lookup, useLocalModel, uses, XH} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {escapeRegExp} from 'lodash';
import {LeftRightChooserModel} from './LeftRightChooserModel';

export interface LeftRightChooserFilterProps extends HoistProps<LeftRightChooserModel> {
    /** Names of fields in chooser on which to filter. Defaults to ['text', 'group'] */
    fields?: string[];

    /** Mode to use when filtering (default 'startWord'). */
    matchMode?: 'start' | 'startWord' | 'any';
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

    get matchMode() {
        return this.componentProps.matchMode;
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => [this.value, this.matchMode],
            run: () => this.runFilter()
        });
    }

    private runFilter() {
        const {fields = ['text', 'group']} = this.componentProps,
            searchTerm = this.value,
            regex = this.getRegex(searchTerm);

        const filter = raw => {
            return fields.some(f => {
                if (!searchTerm) return true;
                const fieldVal = raw.data[f];
                return fieldVal && regex.test(fieldVal);
            });
        };

        this.model.setDisplayFilter(filter);
    }

    private getRegex(searchTerm: string): RegExp {
        searchTerm = escapeRegExp(searchTerm);
        switch (this.matchMode ?? 'startWord') {
            case 'any':
                return new RegExp(searchTerm, 'i');
            case 'start':
                return new RegExp(`^${searchTerm}`, 'i');
            case 'startWord':
                return new RegExp(`(^|\\W)${searchTerm}`, 'i');
        }
        throw XH.exception('Unknown matchMode in StoreFilterField');
    }

    override destroy() {
        // This unusual bit of code is extremely important -- the model we are linking to might
        // survive the display of this component and should be restored. (This happens with GridColumnChooser)
        this.model.setDisplayFilter(null);
        super.destroy();
    }
}
