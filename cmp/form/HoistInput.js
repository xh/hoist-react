/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {isFunction, upperFirst} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';
import {observable, computed, action} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {wait} from '@xh/hoist/promise';

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
 * Hoist Inputs also introduce the notion of "Committing" a field to the model, when the user has completed
 * a discrete act of data entry. at this time,  Any specified 'onCommit' handler will be fired, and the bound model
 * will be updated with the new value.
 *
 * For many fields (e.g. checkbox, select, switchInput, slider) commit occurs concurrenty with the change event.
 * However, several text-based fields support a "commitOnChange" property that allows control of this behavior.
 * When this property is set to false, (the default) the commit action will happen only when the user hits 'enter',
 * 'blurs' the field, or takes another committ action defined by the control.
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
        /** handler to fire when value is committed to backing model, gets passed the new value */
        onCommit: PT.func,
        /** model to bind to */
        model: PT.object,
        /** name of property in model to bind to */
        field: PT.string,
        /** is control disabled */
        disabled: PT.bool,
        /** Style block */
        style: PT.object,
        /** css class name **/
        className: PT.string,
        /** tab order of this control.  Set to -1 to skip.  If not set, browser will choose a layout related ordering. **/
        tabIndex: PT.number
    };

    @observable hasFocus;
    @observable internalValue;

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
    /**
     * Commit immediately when value is changed?
     *
     * Note that certain text controls provide a prop to override this value.
     */
    get commitOnChange() {
        return true;
    }

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
        const {onChange} = this.props;

        this.setInternalValue(val);
        if (onChange) onChange(this.toExternal(val));
        if (this.commitOnChange) this.doCommit();
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

    toExternal(internal) {
        return internal;
    }

    toInternal(external) {
        return external;
    }

    //---------------------------------------------------------------
    // Handling of Focus/Blurring
    // Bound handlers provided should be applied by all instances.
    //--------------------------------------------------------------
    @action
    noteBlurred() {
        if (!this.hasFocus) return;
        
        this.doCommit();
        
        const field = this.getField();
        if (field) field.startValidating();

        this.hasFocus = false;
    }

    @action
    noteFocused() {
        if (this.hasFocus) return;
        
        this.setInternalValue(this.toInternal(this.externalValue));
        this.hasFocus = true;
    }

    onBlur = () => {
        // Focus very frequently will be jumping internally from element to element *within* a control.
        // This delay prevents extraneous 'flapping' of focus state at this level.
        wait(200).then(() => {
            if (!this.containsElement(document.activeElement)) {
                this.noteBlurred();
            }
        });
    }
    onFocus = () => this.noteFocused();

    //-----------------------------
    // Additional Utilities
    //-----------------------------
    // Override of the default implementation provided by HoistComponent so we can add
    // the xh-input and xh-input-invalid classes
    getClassName(...extraClassNames) {
        const field = this.getField(),
            validityClass = field && field.isNotValid ? 'xh-input-invalid' : null;

        return classNames('xh-input', validityClass, this.baseClassName, this.props.className, ...extraClassNames);
    }
}