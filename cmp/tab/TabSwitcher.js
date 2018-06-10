import {Component} from 'react';
import {elemFactory, HoistComponent} from '../../core';
import {tab, tabs} from '../../kit/blueprint';

/**
 * Switcher display for a TabContainer.
 * @see TabContainerModel
 */
@HoistComponent()
export class TabSwitcher extends Component {
    render() {
        const {vertical, id, children} = this.model;
        return tabs({
            id,
            vertical,
            onChange: this.onTabChange,
            large: !vertical,
            items: children.map(({id, name}) => tab({id, title: name}))
        });
    }

    onTabChange = (activeId) => {
        this.model.setSelectedId(activeId);
    }
}

export const tabSwitcher = elemFactory(TabSwitcher);