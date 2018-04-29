/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent} from 'hoist/core/index';
import {div, hbox, vbox, h3} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import './IconsPanel.scss';

@hoistComponent()
export class IconsPanel extends Component {

    render() {
        return div({
            cls: 'xh-toolbox-icons-panel',
            items: [
                vbox({
                    cls: 'xh-toolbox-icons-inner-panel',
                    items: [
                        h3('Available Icons'),
                        this.renderTable()
                    ]
                })
            ]
        });
    }

    renderTable() {
        const header = (...labels) => hbox({ cls: 'header', items: labels.map(label => div(label))}),
            row = icon => hbox({cls: 'row', items: [div(icon.name), ...this.renderIconTiles(icon)]});

        return vbox({
            cls: 'xh-toolbox-icons-table',
            items: [
                header('name', 'regular', 'solid', 'light'),
                vbox({
                    overflow: 'auto',
                    items: this.getAllIcons().map(icon => row(icon))
                })
            ]
        });
    }

    getAllIcons() {
        return Object.keys(Icon).map(key => ({
            regular: Icon[key]({size: '2x'}),
            solid: Icon[key]({prefix: 'fas', size: '2x'}),
            light: Icon[key]({prefix: 'fal', size: '2x'}),
            name: key
        }));
    }

    renderIconTiles(icon) {
        return [
            div(icon.regular),
            div(icon.solid),
            div(icon.light)
        ];
    }
}
