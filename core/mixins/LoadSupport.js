/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {provideMethods, markClass, defaultMethods, chainMethods, throwIf, withDefault} from '@xh/hoist/utils/js';
import {RefreshContext} from '../refresh';

export function LoadSupport(C) {

    markClass(C, 'hasLoadSupport');

    throwIf(C.contextType,  'Cannot decorate a class with LoadSupport if it already uses context type');
    C.contextType = RefreshContext;
    
    defaultMethods(C, {
        refreshWhenHiddenMode: {
            get() {return 'immediate'}
        },

        loadOnMount: {
            get() {return true}
        },

        async loadAsync({isAutoRefresh = false} = {}) {
            const modelLoad = this.model.loadAsync;
            return modelLoad ? modelLoad.loadAsync(isAutoRefresh) : null;
        }
    });

    provideMethods(C, {
        refreshModel: {
            get() {return this.context}
        },

        async refreshAsync({isAutoRefresh = false} = {}) {
            const refreshWhenHiddenMode = withDefault(this.refreshWhenHiddenMode, false);
            switch (refreshWhenHiddenMode) {
                case 'lazy':
                    throw XH.exception('Lazy Mode not yet implemented.');
                case 'skip':
                    if (!this.isDisplayed) return;
                    break;
                case 'immediate':
                default:
            }
            return this.loadAsync({isAutoRefresh});
        }
    });

    chainMethods(C, {
        componentDidMount() {
            const {refreshModel} = this;
            if (refreshModel) refreshModel.register(this);
            this.loadAsync();
        },

        componentWillUnmount() {
            const {refreshModel} = this;
            if (refreshModel) refreshModel.unregister(this);
        }
    });
}
