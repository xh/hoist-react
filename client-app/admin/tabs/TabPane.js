/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, Ref} from 'hoist';
import {frame} from 'hoist/layout';
import {autorun, observer} from 'hoist/mobx';

import {appModel} from '../AppModel';

/**
 * Container for an Admin Tab
 *
 * This host for a content panel of an admin tab does the following:
 *  - Lazily renders the contents of the tab only when it first becomes active.
 *  - Reload the active tab whenever its lastLoaded is out of date with global app state.
 *  - Stretches the content of the child component using a flex layout.
 *
 * Contained components that load data/state from the server should implement loadAsync(), but
 * generally leave the calling of that method to this class.
 */
@observer
export class TabPane extends Component {

    child = new Ref();

    componentDidMount() {
        autorun(() => {
            const model = this.model,
                {isActive, isLoading, lastLoaded} = model;

            if (isActive) {
                model.setIsLazyMode(false);
                const child = this.child.value;
                if (child && !isLoading) {
                    if (!lastLoaded || lastLoaded < appModel.lastRefreshRequest) {
                        this.loadChild(child);
                    }
                }
            }
        });
    }

    render() {
        const model = this.model;

        return model.isLazyMode ?
            null :
            frame({
                display: model.isActive ? 'flex' : 'none',
                margin: 4,
                item: elem(model.componentClass, {...this.props, flex: 1, ref: this.child.ref})
            });
    }

    //------------------------------
    // Implementation
    //-----------------------------
    get model() {return this.props.model}

    loadChild(child) {
        const model = this.model;
        if (child.loadAsync) {
            model.setIsLoading(true);
            child.loadAsync().finally(() => model.markLoaded());
        } else {
            model.markLoaded();
        }
    }
}
export const tabPane = elemFactory(TabPane);
