/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory} from 'hoist';
import {observer} from 'hoist/mobx';
import {vbox, hbox} from 'hoist/layout';
import {tabs, tab} from 'hoist/kit/blueprint';
import {menu} from 'hoist/kit/semantic';
import {hoistAppModel} from 'hoist/app/HoistAppModel';

import {tabPane} from './TabPane';
import {TabContainerModel} from './TabContainerModel';

/**
 * Enhanced TabContainer for Admin App.
 */
@observer
export class TabContainer extends Component {

    render() {
        return hoistAppModel.useSemantic ? this.renderSemantic() : this.renderBlueprint();
    }

    renderBlueprint() {
        const {id, children, selectedId, vertical} = this.model;

        return tabs({
            id,
            vertical,
            onChange: this.onBlueprintTabChange,
            selectedTabId: selectedId,
            items: children.map(childModel => {
                const id = childModel.id,
                    isSubContainer = childModel instanceof TabContainerModel,
                    cmp = isSubContainer ? tabContainer : tabPane;
                return tab({
                    id,
                    title: id,
                    panel: cmp({model: childModel})
                });
            })
        });
    }

    renderSemantic() {
        const {children, selectedIndex, vertical, isActive} = this.model;

        // 0) Construct Selectors.
        const $items = children.map(it => ({key: it.id, name: it.id})),
            selectors = menu({
                key: 'menu',
                size: 'small',
                color: 'blue',
                activeIndex: selectedIndex,
                onItemClick: this.onSemanticTabChange,
                vertical,
                pointing: !vertical,
                secondary: true,
                style: vertical ? {flex: '0 0 auto', width: '100px', margin: 0} : {margin: 0},
                $items
            });

        // 1) Construct Panes
        const panes = children.map(childModel => {
            const isSubContainer = childModel instanceof TabContainerModel,
                cmp = isSubContainer ? tabContainer : tabPane;
            return cmp({
                model: childModel,
                key: childModel.id
            });
        });

        const conf = {
            flex: 1,
            maxWidth: '100%',
            maxHeight: '100%',
            display: isActive ? 'flex' : 'none',
            items: [selectors, ...panes]
        };
        return vertical ? hbox(conf) : vbox(conf);
    }

    //--------------------------
    // Implementation
    //--------------------------
    get model() {return this.props.model}

    onSemanticTabChange = (e, {index}) => {
        this.model.setSelectedIndex(index);
    }

    onBlueprintTabChange = (activeId) => {
        this.model.setSelectedId(activeId);
    }
}
export const tabContainer = elemFactory(TabContainer);
