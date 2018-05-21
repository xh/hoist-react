/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {autorun, reaction} from '@xh/hoist/mobx';
import {provideMethods, chainMethods} from '@xh/hoist/utils/ClassUtils';

/**
 * Mixin to support adding managed MobX reactivity.
 * Provides support for adding and removing managed reactions and autoruns.
 */
export function Reactive(C) {

    C.isReactive = true;

    provideMethods(C, {

        /**
         * Add and start a managed autorun.
         * @param {*} args - arguments to autorun().
         */
        addAutorun(...args) {
            this.addMobxDisposer(autorun(...args));
        },

        /**
         * Add and start a managed reaction.
         * @param {*} args - arguments to reaction().
         */
        addReaction(...args) {
            this.addMobxDisposer(reaction(...args));
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
