/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {isFunction, omit, pick, upperFirst} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';
import {observable, computed, action, runInAction} from '@xh/hoist/mobx';
import classNames from 'classnames';

import './HoistInput.scss';

/**
 *
 * A Standard Hoist Input.
 *
 * Hoist Inputs can *either* operate in bound mode or in standard controlled mode.
 * In bound mode, they will read their value from the  'model' and 'field' props.
 * If not bound, they will get their value in the standard way using the value in props.
 *
 * Hoist Inputs will call a common onChange() callback with the latest value, as it is updated.
 *
 * Hoist Inputs also introduce the notion of "Committing" a field to the model, when
 * the user has completed a discrete act of data entry. If the 'commitOnChange' property is true,
 * this will happen concurrently with valueChange.  Otherwise, this will happen only when the user
 * hits 'enter' or 'blurs' the field, or takes another commit action defined by the control.
 * At this time, any specified 'onCommit' handler will be fired.
 *
 * The 'commitOnChange' property defaults to false, except for selected controls such as CheckBox
 * where a true value is more intuitive. Also note that `commitOnChange: false` is not currently
 * supported on DropdownInputs and ComboBoxes - see BaseDropdownInput for more information.
 *
 * Note that operating in bound mode may allow for more efficient rendering in a MobX context,
 * in that the bound value is only read *within* this control, so that changes to its value do not
 * cause the parent of this control to re-render.
 *
 * HoistInputs support built-in validation when bound to a model enhanced by `@FieldSupport`.
 * When a HoistInput control is linked to a property on the underlying model decorated by `@field`,
 * the model Field will be used to provide validation info and styling to the input component.
 */
export class HoistInput extends Component {

    static propTypes = {

        /** value of the control */
        value: PT.any,
        /** handler to fire when value changes, gets passed the new value */
        onChange: PT.func,
        /** handler to fire when value is committed, gets passed the new value */
        onCommit: PT.func,
        /** config to commit changes on change instead of blur */
        commitOnChange: PT.bool,
        /** model to bind to */
        model: PT.object,
        /** name of property in model to bind to */
        field: PT.string,
        /** is control disabled */
        disabled: PT.bool,
        /** Style block */
        style: PT.object,
        /** css class name **/
        className: PT.string
    };

    static defaultProps = {
        commitOnChange: false
    };

    @observable hasFocus;
    @observable internalValue;

    /**
     * List of properties that if passed to this control should be trampolined to the underlying
     * control. Implementations of HoistInput should use this.getDelegateProps() to get a
     * basket of these props for passing along.
     *
     * If this configuration is left empty, getDelegateProps() will instead return all props passed
     * to the component, but filtered to remove those known to be added by the HoistInput API.
     *
     * (Overall role of the delegateProps concept for HoistInput components is still under review.)
     */
    delegateProps = [];

    /**
     * Field (if any) associated with this control.
     */
    getField() {
        const {model, field} = this.props;
        return model && field && model.hasFieldSupport && model.getField(field);
    }

    //-----------------------------------------------------------
    // Handling of internal vs. external value, committing
    //-----------------------------------------------------------
    /** Return the value to be rendered internally by control. **/
    @computed
    get renderValue() {
        return this.hasFocus ?
            this.internalValue :
            this.toInternal(this.externalValue);
    }

    /**
     * Return the external value associated with control.
     * This is the last value committed to the model.
     */
    @computed
    get externalValue() {
        const {value, model, field} = this.props;
        if (model && field) {
            return model[field];
        }
        return value;
    }

    /** Set internal value **/
    @action
    setInternalValue(val) {
        this.internalValue = val;
    }

    /** Set normalized internal value, and fire associated value changed **/
    noteValueChange(val) {
        const {commitOnChange, onChange} = this.props;

        this.setInternalValue(val);
        if (onChange) onChange(this.toExternal(val));
        if (commitOnChange) this.doCommit();
    }

    /**
     * Commit the internal value to the external value.
     * Fire commit handlers, and synchronize state.
     */
    doCommit() {
        const {onCommit, model, field} = this.props;
        let externalValue = this.externalValue,
            newValue = this.toExternal(this.internalValue);

        if (newValue === externalValue) return;

        if (model && field) {
            const setterName = `set${upperFirst(field)}`;
            throwIf(!isFunction(model[setterName]), `Required function '${setterName}()' not found on bound model`);
            model[setterName](newValue);
            newValue = this.externalValue;    // Round trip this, in case model decides to intervene.
        }

        if (onCommit) onCommit(newValue);

        this.setInternalValue(this.toInternal(newValue));
    }

    noteBlurred() {
        this.doCommit();

        // Trigger validation.  Useful if user just visited field without making change.
        const field = this.getField();
        if (field) field.startValidating();

        runInAction(() => this.hasFocus = false);
    }

    noteFocused() {
        this.setInternalValue(this.toInternal(this.externalValue));
        runInAction(() => this.hasFocus = true);
    }

    toExternal(internal) {
        return internal;
    }

    toInternal(external) {
        return external;
    }

    //-----------------------------
    // Additional Utilities
    //-----------------------------
    getDelegateProps() {
        const props = this.props,
            delegates = this.delegateProps;

        // See above comment on delegateProps field.
        if (delegates.length) {
            return pick(props, delegates);
        } else {
            return omit(props, [
                'value',
                'onChange',
                'onCommit',
                'commitOnChange',
                'model',
                'field'
            ]);
        }
    }

    // Override of the default implementation provided by HoistComponent so we can add
    // the xh-field and xh-field-invalid classes
    getClassName(...extraClassNames) {
        const field = this.getField(),
            validityClass = field && field.isNotValid ? 'xh-field-invalid' : null;

        return classNames('xh-field', validityClass, this.baseClassName, this.props.className, ...extraClassNames);
    }
}