/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isFunction} from 'lodash';
import {autorun, reaction} from '@xh/hoist/mobx';
import {provideMethods, chainMethods} from '@xh/hoist/utils/ClassUtils';

/**
 * Mixin to support adding managed MobX reactivity.
 *
 * Provides support for adding and removing 'managed' reactions and autoruns.
 *
 * The artifacts created by these methods will be disposed of automatically
 * when this object is destroyed.
 */
export function Reactive(C) {

    C.isReactive = true;

    provideMethods(C, {

        /**
         * Add and start a managed autorun.
         *
         * @param {[Object | function]} conf - function to run,  or configuration containing options accepted
         *      by mobx autorun() API, as well as argument below,
         * @param {function} [conf.run] - function to run, the first argument to the underlying autorun() call.
         */
        addAutorun(conf) {
            let run, options;
            if (isFunction(conf)) {
                run = conf,
                options = {};
            } else {
                ({run, ...options} = conf);
            }
            run = run.bind(this);
            this.addMobxDisposer(autorun(run, options));
        },


        /**
         * Add and start a managed reaction.
         *
         * @param {Object} conf - configuration of reaction, containing options accepted by mobx
         *      reaction() API, as well as arguments below.
         * @param {function} conf.track - function returning data to trac, the first argument to
         *      the underlying reaction() call
         * @param {function} conf.run - function to run, the second argument to the underlying reaction() call.
         */
        addReaction(conf) {
            let {track, run, ...options} = conf;
            run = run.bind(this);
            this.addMobxDisposer(reaction(track, run, options));
        },


        //------------------------
        // Implementation
        //------------------------
        addMobxDisposer(disposer) {
            this._disposers = this._disposers || [];
            this._disposers.push(disposer);
        }
    });

    chainMethods(C, {
        /**
         * Destroy all mobx autoruns and reactions.
         */
        destroy() {
            if (this._disposers) {
                this._disposers.forEach(f => f());
                this._disposers = null;
            }
        }
    });

    return C;
}
