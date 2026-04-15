/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {upperFirst} from 'lodash';
import {action, observable, runInAction} from 'mobx';

type BindableAccessorDecorator = (
    value: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext
) => ClassAccessorDecoratorResult<any, any>;

/**
 * Decorator to mark a property as observable and also provide a simple MobX action of the
 * form `setPropName()`.
 *
 * Especially useful for creating observable properties that are intended to be bound to UI
 * components that will both display and set the property.
 *
 * Apply to an `accessor` class field. Use `@bindable.ref` for reference-equality observable
 * semantics (wraps `@observable.ref`).
 *
 * ```ts
 * class MyModel extends HoistModel {
 *     @bindable accessor name: string = '';
 *     @bindable.ref accessor items: Item[] = [];
 * }
 *
 * // Consumers call the auto-generated setter...
 * model.setName('Hello');  // action-wrapped, reactive
 * // ...or use `setBindable()` when the property name is dynamic.
 * model.setBindable('name', 'Hello');
 * ```
 */
export const bindable: BindableAccessorDecorator & {ref: BindableAccessorDecorator} = Object.assign(
    (value: ClassAccessorDecoratorTarget<any, any>, context: ClassAccessorDecoratorContext) =>
        createBindable(value, context, false),
    {
        ref: (
            value: ClassAccessorDecoratorTarget<any, any>,
            context: ClassAccessorDecoratorContext
        ) => createBindable(value, context, true)
    }
) as any;

//-----------------
// Implementation
//-----------------
function createBindable(
    value: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext,
    isRef: boolean
): ClassAccessorDecoratorResult<any, any> {
    if (context.kind !== 'accessor') {
        throw new Error(
            `@bindable${isRef ? '.ref' : ''} must be applied to an 'accessor' class field ` +
                `(got kind='${context.kind}' for '${String(context.name)}'). ` +
                `Add the \`accessor\` keyword, e.g. \`@bindable accessor foo = 0\`.`
        );
    }
    const accessorName = String(context.name),
        setterName = 'set' + upperFirst(accessorName),
        // Delegate to MobX's TC39 accessor decorator for storage/reactivity.
        mobxResult = (isRef ? observable.ref : observable)(
            value as any,
            context as any
        ) as unknown as ClassAccessorDecoratorResult<any, any>;

    // Wrap the accessor's set in runInAction so direct assignment (`model.foo = v`) is
    // action-wrapped too — preserving the pre-v85 @bindable contract that code relying on
    // `enforceActions: 'observed'` can set @bindable values without opting into an outer action.
    const origSet = mobxResult.set;
    if (origSet) {
        mobxResult.set = function (this: any, v: any) {
            runInAction(() => origSet.call(this, v));
        };
    }

    // Install an action-wrapped setXxx() on the prototype the first time an instance is constructed.
    // addInitializer runs once per instance but the setter only needs to be installed once per class —
    // the hasOwnProperty guard ensures idempotency without paying for a repeated defineProperty.
    context.addInitializer(function (this: any) {
        const proto = Object.getPrototypeOf(this);
        if (!Object.prototype.hasOwnProperty.call(proto, setterName)) {
            Object.defineProperty(proto, setterName, {
                value: action(function (this: any, val: any) {
                    this[accessorName] = val;
                }),
                configurable: true,
                writable: true
            });
        }
    });

    return mobxResult;
}
