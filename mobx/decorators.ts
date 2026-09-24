/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {upperFirst} from 'lodash';
import {observable, runInAction, observableRef} from 'mobx';

/**
 * Decorator to mark a property as observable and also provide a simple MobX action of the
 * form `setXxxName()`.
 *
 * This decorator is especially useful for creating observable properties that are intended to be
 * bound to UI components that will both display and set the property.
 *
 * Use `@bindableRef` for a version of the decorator that will mark the property as observable by
 * reference. This will use the similarly named `@observableRef` decorator in the core MobX API.
 */
export const bindable: any = (value: any, context: ClassAccessorDecoratorContext) => {
    return createBindable(value, context, false);
};

/** Reference-only variant of {@link bindable} - see `@observableRef`. */
export const bindableRef: any = (value: any, context: ClassAccessorDecoratorContext) => {
    return createBindable(value, context, true);
};

//-----------------
// Implementation
//-----------------
function createBindable(value: any, context: ClassAccessorDecoratorContext, isRef: boolean) {
    // 1) Delegate to MobX for core functionality
    const ret: any = (isRef ? observableRef : observable)(value, context as any);

    // 2) Wrap the set in runInAction so direct assignment (`model.foo = v`) is action
    const origSet = ret.set;
    if (origSet) {
        ret.set = function (v: any) {
            runInAction(() => origSet.call(this, v));
        };
    }

    // 3) Set up a setXxx() action on the prototype, if one does not exist anywhere on the chain.
    //    This is the original side effect of bindable, used for backward compat by `setBindable`.
    //    Be sure not to shadow any explicit setter already in place
    context.addInitializer(function () {
        const target = Object.getPrototypeOf(this),
            name = context.name as string,
            setterName = 'set' + upperFirst(name);
        if (!(setterName in target)) {
            const value = function (v) {
                this[name] = v;
            };
            Object.defineProperty(target, setterName, {value});
        }
    });

    return ret;
}
