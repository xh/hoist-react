/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {autorun, reaction} from 'hoist/mobx';
import {provideMethods, chainMethods} from 'hoist/utils/ClassUtils';

/**
 * Mixin to support adding managed MobX reactivity
 *
 * Provides support for adding and removing managed reactions and
 * autoruns.
 */
export function Reactive(C) {

    C.isReactive = true;

    provideMethods(C, {

        /**
         * Add and start a managed autorun
         *
         * @param {*} args, arguments to autorun().
         */
        addAutorun(...args) {
            this.addMobxDisposer(autorun(...args));
        },

        /**
         * Add and start a managed reaction
         *
         * @param {*} args - arguments to reaction().
         */
        addReaction(...args) {
            this.addMobxDisposer(reaction(...args));
        },
        
        //------------------
        // Implemenatation
        //------------------
        addMobxDisposer(disposer) {
            this.xhDisposers = this.xhDisposers || [];
            this.xhDisposers.push(disposer);
        }
    });

    chainMethods(C, {
        /**
         * Destroy all mobx autoruns and reactions
         */
        destroy() {
            if (this.xhDisposers) {
                this.xhDisposers.forEach(f => f());
                this.xhDisposers = null;
            }
        }
    });

    return C;
}
