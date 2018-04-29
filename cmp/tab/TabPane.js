/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, hoistComponent} from 'hoist/core';
import {Ref} from 'hoist/utils/Ref';
import {frame} from 'hoist/layout';

/**
 * Wrapper for Components to be shown inside of a TabContainer tab. Provides the following:
 *
 *   - Lazily renders the contents of the tab only when it first becomes active.
 *   - Reloads the active tab whenever its lastLoaded is out of date with its parent's 'lastRefreshRequest'.
 *   - Stretches the content of the child component using a flex layout.
 *
 * Contained components that load data/state from the server should implement loadAsync(), but
 * generally leave the calling of that method to this component
 */
@hoistComponent()
export class TabPane extends Component {

    child = new Ref();
    isLazyState = true;

    constructor(props) {
        super(props);
        this.addAutoRun(() => this.syncLoad());
    }

    render() {
        const model = this.model,
            {isActive} = model;

        if (isActive) this.isLazyState = false;
        if (this.isLazyState) return null;

        return frame({
            display: isActive ? 'flex' : 'none',
            margin: 4,
            cls: 'xh-tab-component',
            item: elem(model.componentClass, {...this.props, flex: 1, ref: this.child.ref, tabPaneModel: this.model})
        });
    }


    //------------------------
    // Implementation
    //------------------------
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

    syncLoad() {
        const {model, child} = this;
        if (model.needsLoad && child.value) this.loadChild();
    }

}
export const tabPane = elemFactory(TabPane);
