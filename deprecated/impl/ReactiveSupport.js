/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {
    action,
    autorun as mobxAutorun,
    reaction as mobxReaction,
    when as mobxWhen
} from '@xh/hoist/mobx';
import {applyMixin, throwIf} from '@xh/hoist/utils/js';
import {
    debounce as lodashDebounce,
    isFunction,
    isNil,
    isNumber,
    isPlainObject,
    upperFirst
} from 'lodash';

/**
 * @private
 */
export function ReactiveSupport(C) {
    return applyMixin(C, {
        name: 'ReactiveSupport',

        provides: {

            addAutorun(conf) {
                if (isFunction(conf)) conf = {run: conf};
                let {run, debounce, ...opts} = conf;

                this.validateMobxOptions(opts);
                run = this.bindAndDebounce(run, debounce);

                return this.addMobxDisposer(mobxAutorun(run, opts));
            },

            addReaction({track, when, run, debounce, ...opts}) {
                throwIf(
                    (track && when) || (!track && !when),
                    "Must specify either 'track' or 'when' in addReaction."
                );
                this.validateMobxOptions(opts);

                run = this.bindAndDebounce(run, debounce);

                return track ?
                    this.addMobxDisposer(mobxReaction(track, run, opts)):
                    this.addMobxDisposer(mobxWhen(when, run, opts));
            },

            setBindable(property, value) {
                const setter = `set${upperFirst(property)}`;
                throwIf(!isFunction(this[setter]),
                    `Required function '${setter}()' not found on bound model. ` +
                    `Implement a setter, or use the @bindable annotation.`
                );
                this[setter].call(this, value);
            },

            //------------------------
            // Implementation
            //------------------------
            addMobxDisposer(disposer) {
                this._disposers = this._disposers || [];
                this._disposers.push(disposer);
                return disposer;
            },

            validateMobxOptions(options) {
                throwIf(
                    !isNil(options.runImmediately),
                    '"runImmediately" is not a reaction option.  Did you mean "fireImmediately"?'
                );
            },

            bindAndDebounce(fn, debounce) {
                let ret = fn.bind(this);

                //  See https://github.com/mobxjs/mobx/issues/1956 and note we cannot use mobx scheduler.
                //  ensure the async run of the effect also occurs in action as expected.
                if (isNumber(debounce)) return lodashDebounce(action(ret), debounce);
                if (isPlainObject(debounce)) return lodashDebounce(action(ret), debounce.interval, debounce);
                return ret;
            }
        },

        chains: {
            destroy() {
                if (this._disposers) {
                    this._disposers.forEach(f => f());
                    this._disposers = null;
                }
            }
        }
    });
}
