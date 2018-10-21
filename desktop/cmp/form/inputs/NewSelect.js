/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {castArray, isEmpty, isPlainObject, keyBy, find} from 'lodash';
import {observable, action} from '@xh/hoist/mobx';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault, throwIf} from '@xh/hoist/utils/js';
import {
    reactSelect,
    reactCreatableSelect,
    reactAsyncSelect,
    reactAsyncCreatableSelect
} from '@xh/hoist/kit/react-select';

/**
 * TODO - custom renderers, custom local query, test in dialog, very large lists, dark theme, creatable
 */
@HoistComponent
export class NewSelect extends HoistInput {


    static propTypes = {
        ...HoistInput.propTypes,

        /** True to focus the control on render. */
        autoFocus: PT.bool,

        /** True to allow entry/selection of values not present in options or returned by a query. */
        enableCreate: PT.bool,

        /** True to allow entry/selection of multiple values - "tag picker" style. */
        enableMulti: PT.bool,

        /** Function to return loading message during async query. Passed current query input. */
        loadingMessageFn: PT.func,

        /** Function to return message indicating no options loaded. Passed current query input. */
        noOptionsMessageFn: PT.func,

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** Escape-hatch props passed directly to react-select. Use with care. */
        rsOptions: PT.object,

        /** True (default) to enable type-to-search. False to present pop-up on click only . */
        searchable: PT.bool,

        /** Width of the control in pixels. */
        width: PT.number
    };

    baseClassName = 'xh-select';

    @observable.ref internalOptions = [];

    // Prop flags that switch core behavior.
    get asyncMode() {return !!this.props.queryFnAsync}
    get creatableMode() {return !!this.props.enableCreate}
    get multiMode() {return !!this.props.enableMulti}

    constructor(props) {
        super(props);
        this.addReaction({
            track: () => this.props.options,
            run: (opts) => {
                opts = this.normalizeOptions(opts);
                this.setInternalOptions(opts);
            },
            fireImmediately: true
        });
    }

    render() {
        const {props, renderValue} = this;

        let reactSelectProps = {
            value: renderValue,

            autoFocus: props.autoFocus,
            isDisabled: props.disabled,
            isMulti: props.enableMulti,
            menuPortalTarget: document.body,
            noOptionsMessage: this.noOptionsMessageFn,
            placeholder: withDefault(props.placeholder, 'Select...'),

            onChange: this.onSelectChange
        };

        if (this.asyncMode) {
            reactSelectProps = {
                ...reactSelectProps,
                loadOptions: this.doQueryAsync,
                loadingMessage: this.loadingMessageFn
            };
        } else {
            reactSelectProps = {
                ...reactSelectProps,
                options: this.internalOptions,
                isSearchable: withDefault(props.searchable, true),
            };
        }

        if (this.creatableMode) {
            reactSelectProps = {
                ...reactSelectProps
                // TODO
            };
        }

        let factory;
        if (this.asyncMode) {
            factory = this.creatableMode ? reactAsyncCreatableSelect : reactAsyncSelect;
        } else {
            factory = this.creatableMode ? reactCreatableSelect : reactSelect;
        }

        return factory({
            ...reactSelectProps,
            ...(props.rsOptions || {})
        });
    }

    doQueryAsync = (query) => {
        return this.props
            .queryFnAsync(query)
            .then(matchOpts => {
                // Normalize query return.
                matchOpts = this.normalizeOptions(matchOpts);

                // Carry forward and add to any existing internalOpts to allow our value
                // converters to continue all selected values in multiMode.
                const matchesByVal = keyBy(matchOpts, 'value'),
                    newOpts = [...matchOpts];

                this.internalOptions.forEach(currOpt => {
                    const matchOpt = matchesByVal[currOpt.value];
                    if (!matchOpt) newOpts.push(currOpt);  // avoiding dupes
                });

                this.setInternalOptions(newOpts);

                // But only return the matching options back to the combo.
                return matchOpts;
            });
    }

    // Convert external value into option object(s). Options created if missing; this is the
    // external value, and we will respect that even if we don't know about it.
    toInternal(external) {
        if (this.multiMode) {
            // Find or create all opts. Don't create null value opts in multiMode.
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

    normalizeOptions(options) {
        options = options || [];
        return options.map(it => this.toOption(it));
    }

    @action
    setInternalOptions(options) {
        this.internalOptions = options;
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


    loadingMessageFn = (params) => {
        const {loadingMessageFn} = this.props,
            q = params.inputValue;

        return loadingMessageFn ? loadingMessageFn(q) : 'Loading...';
    }

    noOptionsMessageFn = (params) => {
        const {noOptionsMessageFn} = this.props,
            q = params.inputValue;

        return noOptionsMessageFn ?
            noOptionsMessageFn(q) :
            (q ? 'No matches found.' : 'Type to search.');
    }

    log(...args) {
        if (this.props.log) console.log(...args);
    }

}
export const newSelect = elemFactory(NewSelect);