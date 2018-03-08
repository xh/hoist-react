/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {upperFirst} from 'lodash';


/**
 *
 * A decorator to provide support for components that can *either* operate
 * in standard 'controlled' mode OR bind directly to a model property.
 *
 * In controlled mode, they will be using 'value'/'onChange' props.
 * In bound mode, they will be using the 'model'/'field' props.
 *
 * Applications should typically provide only one of these pairs of
 * properties. If both are provided, controlled mode will be used.
 *
 * Note that operating in bound mode may allow for more efficient rendering
 * in a mobx context, in that the bound value is only read *within* this
 * control, so that changes to its value do not cause the parent of this
 * control to re-render.
 */
export function bindableField(C) {
    const proto = C.prototype;


    proto.getDelegateProps = function() {
        const props = this.props,
            ret = {},
            delegates = this.delegateProps || [];

        delegates.forEach(it => {
            if (it in props) ret[it] = props[it];
        });
        
        return ret;
    };

    proto.readValue = function() {
        const {value, model, field} = this.props;
        if (value != undefined) {
            return value;
        } else if (model && field) {
            return model[field];
        } else {
            return undefined;
        }
    };

    proto.noteValueChange = function(val) {
        const {onChange, model, field} = this.props;
        if (onChange) {
            onChange(val);
        } else if (model && field) {
            const setterName = `set${upperFirst(field)}`;
            model[setterName](val);
        }
    };
}