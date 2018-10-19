/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {castArray, isEmpty, isPlainObject, keyBy, find} from 'lodash';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {reactSelect, reactAsyncSelect} from '@xh/hoist/kit/react-select';

/**
 * TODO - custom renderers, custom local query, test in dialog, very large lists, dark theme
 */
@HoistComponent
export class NewSelect extends HoistInput {

    baseClassName = 'xh-select';

    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addReaction({
            track: () => this.props.options,
            run: (opts) => this.normalizeOptions(opts),
            fireImmediately: true
        });
    }

    get multiValueMode() {
        return !!this.props.multi;
    }

    get asyncMode() {
        return !!this.props.queryFnAsync;
    }

    log(...args) {
        if (this.props.log) console.log(...args);
    }

    render() {
        const {props, renderValue} = this;

        const commonProps = {
            value: renderValue,
            isDisabled: props.disabled,
            isMulti: props.multi,
            menuPortalTarget: document.body,
            placeholder: withDefault(props.placeholder, 'Select...'),
            onChange: this.onSelectChange
        };

        if (this.asyncMode) {
            this.log('renderAsync', renderValue);
            return reactAsyncSelect({
                loadOptions: this.doQueryAsync,
                ...commonProps
            });
        } else {
            this.log('render', renderValue);
            return reactSelect({
                options: this.internalOptions,
                ...commonProps
            });
        }
    }

    doQueryAsync = (query) => {
        return this.props
            .queryFnAsync(query)
            .then(newOpts => {
                // Normalize query return
                newOpts = isEmpty(newOpts) ? [] : newOpts;
                newOpts = newOpts.map(it => this.toOption(it));

                // Carry forward any existing internalOpts (TODO think through...)
                // Required for multi-select to continue resolving earlier values w/new query.
                const newByVal = keyBy(newOpts, 'value');
                this.internalOptions.forEach(currOpt => {
                    const newOpt = newByVal[currOpt.value];
                    if (!newOpt) newOpts.push(currOpt);
                });

                // Could just set directly and return vs. no-op normalize call
                this.normalizeOptions(newOpts);
                return this.internalOptions;
            });
    }

    // Convert external value into option object(s). Options created if missing; this is the
    // external value and we will respect that even if we don't know about it.
    toInternal(external) {
        if (this.multiValueMode) {
            // Find or create n opts. Don't create null value opts in multiValueMode.
            return castArray(external)
                .filter(it => !isEmpty(it))
                .map(it => this.findOption(it, true));
        }

        // Find or create single opt. Support null value only if explicitly in options.
        return this.findOption(external, !isEmpty(external));
    }

    findOption(val, createIfNotFound) {
        const valAsOption = this.toOption(val),
            match = find(this.internalOptions, {value: valAsOption.value});

        return match ? match : (createIfNotFound ? valAsOption : null);
    }

    // Convert internal option(s) into values, respecting our emitObjects prop and returning
    // shallow clones of our options if we're expected to produce objects instead of primitives.
    toExternal(internal) {
        this.log('toExternal - internal:', internal);
        const {emitObjects} = this.props;

        return this.props.multi ?
            castArray(internal).map(it => emitObjects ? this.toOption(it) : it.value) :
            isEmpty(internal) ? null : (emitObjects ? this.toOption(internal) : internal.value);
    }

    onSelectChange = (opt) => {
        this.log('onChange', opt);
        this.noteValueChange(opt);
    }

    @action
    normalizeOptions(options) {
        options = options || [];
        this.internalOptions = options.map(it => this.toOption(it));
    }

    // Normalize / clone a single source value into a normalized option object.
    toOption(src) {
        const srcIsObject = isPlainObject(src);

        throwIf(
            srcIsObject && !src.hasOwnProperty('value'),
            "Select options/values provided as Objects must define a 'value' property."
        );

        return srcIsObject ?
            {label: withDefault(src.label, src.value), ...src} :
            {label: src != null ? src.toString() : '-null-', value: src};
    }

}
export const newSelect = elemFactory(NewSelect);