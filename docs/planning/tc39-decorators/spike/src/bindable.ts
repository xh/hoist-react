/*
 * Phase 0 spike — candidate TC39 implementation of hoist-react's @bindable / @bindable.ref.
 * Mirrors the reference in issue #4321 §2. Will be promoted to mobx/decorators.ts in Phase 1.
 */
import {action, observable} from 'mobx';
import {upperFirst} from 'lodash';

type AccessorDecorator = (
    value: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext
) => ClassAccessorDecoratorResult<any, any>;

function createBindable(
    value: ClassAccessorDecoratorTarget<any, any>,
    context: ClassAccessorDecoratorContext,
    isRef: boolean
): ClassAccessorDecoratorResult<any, any> {
    if (context.kind !== 'accessor') {
        throw new Error(
            `@bindable${isRef ? '.ref' : ''} must be applied to an 'accessor' class field.`
        );
    }
    const accessorName = String(context.name),
        setterName = 'set' + upperFirst(accessorName),
        mobxResult = (isRef ? observable.ref : observable)(
            value as any,
            context as any
        ) as unknown as ClassAccessorDecoratorResult<any, any>;

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

export const bindable: AccessorDecorator & {ref: AccessorDecorator} = Object.assign(
    (value: any, context: any) => createBindable(value, context, false),
    {
        ref: (value: any, context: any) => createBindable(value, context, true)
    }
) as any;
