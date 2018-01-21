/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, Ref} from 'hoist';
import {box} from 'hoist/layout';
import {autorun, observer, observable, setter} from 'hoist/mobx';
import {appStore} from '../AppStore';

/**
 * Container for an Admin Tab
 *
 * This host for a content panel of an admin tab does the following:
 *  - Assigns a label and a unique id to the tab.
 *  - Lazily renders the contents of the tab only when it first becomes active.
 *  - Reload the active tab whenever its lastLoaded is out of date with global app state.
 *  - Stretches the content of the child component using a flex layout.
 *
 * It requires that its child implement:
 *   - loadAsync()
 *   - isLoading (observable)
 *   - lastLoaded (observable)
 */
@observer
export class Tab extends Component {

    @setter @observable childIsRendering = false;
    
    ref = new Ref();

    componentDidMount() {
        autorun(() => {
            const store = this.props.store;

            if (store.isActive) {
                this.setChildIsRendering(true);
                const child = this.ref.value;
                if (child && !child.isLoading) {
                    const lastLoaded = child.lastLoaded;
                    if (!lastLoaded || lastLoaded < appStore.lastRefreshRequest) {
                        child.loadAsync();
                    }
                }
            }
        });
    }

    render() {
        if (!this.childIsRendering) return null;

        const store = this.props.store;
        return box({
            flex: 1,
            items: elem(store.componentClass, {...this.props, ref: this.ref.callback})
        });
    }
}
