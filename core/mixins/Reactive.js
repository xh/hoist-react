/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {pull} from 'lodash';
import {wait} from 'hoist/promise';
import {mixin} from './ClassUtils';

/**
 * Mixin to support adding managed MobX reactivity
 *
 * Provides support for adding and removing managed reactions and
 * autoruns.
 */
export const Reactive = mixin({

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

    /**
     * Destroy all mobx autoruns and reactions
     */
    destroy() {
        if (this.xhDisposers) {
            this.xhDisposers.forEach(f => f());
            this.xhDisposers = null;
        }
    },

    //------------------
    // Implemenatation
    //------------------
    addMobxDisposer(disposer){
        this.xhDisposers = this.xhDisposers || [];
        this.xhDisposers.push(disposer);
    }
});
