/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, Ref} from 'hoist';
import {box} from 'hoist/layout';
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
export class Tab extends Component {

    ref = new Ref();

    componentDidMount() {
        autorun(() => {
            const model = this.props.model,
                {isActive, isLoading, lastLoaded} = model;

            if (isActive) {
                model.setIsLazyMode(false);
                const child = this.ref.value;
                if (child && !isLoading) {
                    if (!lastLoaded || lastLoaded < appModel.lastRefreshRequest) {
                        this.loadChild(child);
                    }
                }
            }
        });
    }

    render() {
        const model = this.props.model;

        return model.isLazyMode ?
            null :
            box({
                flex: 1,
                items: elem(model.componentClass, {...this.props, ref: this.ref.callback})
            });
    }

    loadChild(child) {
        const model = this.props.model;
        if (child.loadAsync) {
            model.setIsLoading(true);
            child.loadAsync().finally(() => model.markLoaded());
        } else {
            model.markLoaded();
        }
    }
}
