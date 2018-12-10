/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Ref} from '@xh/hoist/utils/react';
import {TabModel} from './TabModel';

/**
 * Wrapper for Pages to be shown inside of a TabContainer tab. Reloads the active tab whenever
 * its lastLoaded is out of date with its parent's 'lastRefreshRequest'.
 *
 * Contained Pages that load data/state from the server should implement loadAsync(), but
 * generally leave the calling of that method to this component
 */
@HoistComponent
export class Tab extends Component {

    static modelClass = TabModel;

    child = new Ref();

    constructor(props) {
        super(props);
        this.addAutorun(this.syncLoad);
    }

    render() {
        const model = this.model,
            {pageFactory, pageProps} = model;

        return pageFactory({
            ...pageProps,
            ref: this.child.ref,
            tabModel: this.model
        });
    }

    //------------------------
    // Implementation
    //------------------------
    syncLoad() {
        const {model, child} = this;
        if (model.needsLoad && child.value) this.loadChild();
    }

    loadChild() {
        const model = this.model,
            child = this.child.value;

        if (!child.loadAsync) {
            model.markLoaded();
        } else {
            child.loadAsync()
                .finally(() => model.markLoaded())
                .linkTo(model.loadState)
                .catchDefault();
        }
    }

}

export const tab = elemFactory(Tab);