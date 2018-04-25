/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {upperFirst, isObject} from 'lodash';
import {observable, setter, computed} from 'hoist/mobx';
import {menuItem} from 'hoist/kit/blueprint';


/**
 *
 * A Standard Hoist Field.
 *
 * Hoist Fields can *either* operate in bound mode or in standard controlled mode.
 * In bound mode, they will read their value from the  'model' and 'field' props.
 * If not bound, they will get their value in the standard way using the value in props.
 *
 * Hoist Fields will call a common onChange() callback with the latest value, as
 * it is updated.
 *
 * Hoist Fields also introduce the notion of "Committing" a field to the model, when
 * the user has completed a discrete act of data entry. For certain controls
 * (e.g. CheckField, SelectField) this may happen concurrently with valueChange.  For
 * text controls (e.g. ComboField, TextField, NumberField) this will happen when the user
 * hits 'enter' or 'blurs' the field.  At this time, any specified 'onCommit' handler will
 * be fired.
 *
 * Note that operating in bound mode may allow for more efficient rendering
 * in a mobx context, in that the bound value is only read *within* this
 * control, so that changes to its value do not cause the parent of this
 * control to re-render.
 *
 * Hoist Fields generally support the following properties.
 *
 * @prop value, string
 * @prop onChange, handler to fire when value changes
 * @prop onCommit, handler to fire when value is committed.
 *
 * @prop model, model to bind to
 * @prop field, name of property in model to bind to
 * @prop disabled, is control disabled
 * @prop style
 * @prop className
 */
export class HoistField extends Component {

    @observable @setter hasFocus
    @observable @setter internalValue

    //-----------------------------------------------------------
    // Handling of internal vs. External value, committing
    //----------------------------------------------------------
    
    /** Return the value to be rendered internally by control. **/
    @computed
    get renderValue() {
        return this.hasFocus ?
            this.internalValue :
            this.toInternal(this.externalValue);
    }

    /** Return the external value associated with control. **/
    get externalValue() {
        const {value, model, field} = this.props;
        if (model && field) {
            return model[field];
        }
        return value;
    }

    /** Set normalized internal value, and fire associated value changed **/
    noteValueChange(val) {
        const {onChange} = this.props;

        this.setInternalValue(val);
        if (onChange) onChange(this.toExternal(val));
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
            model[setterName](newValue);
            newValue = this.externalValue;    // Round trip this, in case model decides to intervene.
        }

        if (onCommit) onCommit(newValue);

        this.setInternalValue(this.toInternal(this.externalValue));
    }

    onBlur = () => {
        this.doCommit();
        this.setHasFocus(false);
    }

    onFocus = () => {
        this.setInternalValue(this.toInternal(this.externalValue));
        this.setHasFocus(true);
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
            ret = {},
            delegates = this.delegateProps || [];

        delegates.forEach(it => {
            if (it in props) ret[it] = props[it];
        });

        return ret;
    }

    defaultItemRenderer(item, itemProps) {
        let isObj = isObject(item) && item.value,
            value = isObj ? item.value : item,
            label = isObj ? item.label : item;
        if (label === null) label = '-';
        return menuItem({key: value, text: label.toString(), onClick: itemProps.handleClick});
    }
}