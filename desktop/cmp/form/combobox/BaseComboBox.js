/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {PropTypes as PT} from 'prop-types';
import {observable, computed, action, runInAction} from '@xh/hoist/mobx';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {isObject, find, debounce} from 'lodash';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Abstract superclass supporting ComboBox and QueryComboBox.
 *
 * This includes debouncing commits due to the multiple ways committing
 * can be triggered from these inputs (blur/enter/item select).
 */
export class BaseComboBox extends HoistInput {

    @observable pendingCommit;

    NULL_VALUE = 'xhNullValue';

    static propTypes = {
        ...HoistInput.propTypes,

        /** Text to display when control is empty */
        placeholder: PT.string
    };

    static defaultProps = {
        placeholder: 'Select',
        commitOnChange: false
    };

    // blueprint-ready collection of available options, normalized to {label, value} form.
    @observable.ref internalOptions = [];


    constructor(props) {
        super(props);
        // The debounce wait has to be quite long to account for the delayed onItemSelect event.
        // This delay is masked to the user by rendering internalValue while pendingCommit.
        this._debouncedCommit = debounce(this.doCommit, !props.requireSelection ? 200 : 0);
    }

    //---------------------------------------------------------------------------
    // Handling of null values.  Blueprint doesn't allow null for the value of a
    // dropdown control, but we can use a sentinel value to represent it.
    //----------------------------------------------------------------------------
    toExternal(internal) {
        return internal === this.NULL_VALUE ? null : internal;
    }

    toInternal(external) {
        return external ===  null ? this.NULL_VALUE : external;
    }

    //-----------------------------------------------------------
    // Common handling of options, rendering of selected option
    //-----------------------------------------------------------
    @action
    normalizeOptions(options, additionalOption) {
        options = withDefault(options, []);
        options = options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });

        if (additionalOption && !find(options, (it) => it.value == additionalOption || it.label == additionalOption)) {
            options.unshift({value: additionalOption, label: additionalOption});
        }

        this.internalOptions = options;
    }

    getOptionRenderer() {
        return this.props.optionRenderer || this.defaultOptionRenderer;
    }

    defaultOptionRenderer(option, optionProps) {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value});

        if (match) return match.label;
        return (value == null || value === this.NULL_VALUE) ? placeholder : value.toString();
    }

    @computed
    get renderValue() {
        return this.hasFocus || this.pendingCommit ?
            this.internalValue :
            this.toInternal(this.externalValue);
    }

    noteBlurred()  {
        // Combos that allow custom entries (!requireSelection) will commit those on blur.
        // Note this could be confusing in the case where the user has entered enough text to cause
        // the pop-up suggestion list to narrow down to a single item. It would be reasonable to
        // think that tabbing out would select that value, but instead you get a new, custom value.
        // Suggest we revisit this in the context of a more explicit inline "New" button for these
        // combos that allow for on-the-fly entries, so it's more clear all around.
        if (!this.props.requireSelection) {
            this.doDebouncedCommit();
        }
        runInAction(() => this.hasFocus = false);
    }

    onKeyPress = (ev) => {
        // For Combos that requireSelection, <enter> must/will trigger onItemSelect to commit.
        if (ev.key === 'Enter' && !this.props.requireSelection) {
            this.doDebouncedCommit();
        }
    }

    onItemSelect = (val) => {
        this.noteValueChange(val.value);
        this.doDebouncedCommit();
    }

    doDebouncedCommit() {
        this.setPendingCommit(true);
        this._debouncedCommit();
    }

    doCommit() {
        super.doCommit();
        this.setPendingCommit(false);
    }

    @action
    setPendingCommit(val) {
        this.pendingCommit = val;
    }

    onQueryChange = (s) => {
        this.noteValueChange(s);
    }
}
