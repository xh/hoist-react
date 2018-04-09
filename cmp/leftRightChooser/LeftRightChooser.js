/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {vframe, hframe} from 'hoist/layout';
import {grid} from 'hoist/grid';
import {Icon} from 'hoist/icon';
import {LeftRightChooserModel} from './LeftRightChooserModel';
import {leftRightChooserDescription} from  './LeftRightChooserDescription';
import {leftRightChooserToolbar} from './LeftRightChooserToolbar';
import './LeftRightChooser.scss';

/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left group represents
 * 'available' items and the right group represents 'selected' items. A description panel is also available
 * to give the user more in-depth information on each item.
 *
 *
 * @prop chooserData, a data array to be loaded as source for both lists
 *
 * The data that is loaded into the store expects the following properties:
 *      text                    (string)    Text to display as item title in the chooser.
 *      value                   (string)    The value that the item respresents.
 *      description             (string)    A user-friendly description of the item.
 *      group                   (string)    Used to group the list of items.
 *      side                    (string)    ['left','right'] Which side of the chooser the item should appear in.
 *      locked                  (bool)      If item cannot be moved between sides of the chooser.
 *      exclude:                (bool)      Exclude the item from the chooser entirely.
 *
 * @prop ungroupedName,
 * @prop lockedText,
 * @prop descriptionTitle,
 *
 * @prop leftTitle
 * @prop leftGrouping
 * @prop leftSorters
 *
 * @prop rightTitle
 * @prop rightGrouping
 * @prop rightSorters
 */

@hoistComponent()
class LeftRightChooser extends Component {

    static defaultProps = {
        chooserData: [],
        ungroupedName: 'Ungrouped',
        lockedText: ` ${Icon.lock({cls: 'medium-gray'})}`,
        descriptionTitle: 'Description',

        // Left Grid
        leftTitle: 'Available',
        leftGrouping: true,
        leftSorters: [],

        // Right Grid
        rightTitle: 'Selected',
        rightGrouping: true,
        rightSorters: []
    };

    localModel = new LeftRightChooserModel(this.props);

    render() {
        const {leftModel, rightModel} = this.model;

        return vframe({
            cls: 'xh-leftRightChooser',
            items: [
                hframe({
                    cls: 'gridContainer',
                    items: [
                        grid({
                            isLeft: true,
                            model: leftModel
                        }),
                        leftRightChooserToolbar({
                            model: this.model
                        }),
                        grid({
                            model: rightModel
                        })
                    ]
                }),
                leftRightChooserDescription({
                    title: this.model.descriptionTitle,
                    model: this.model
                })
            ]
        });
    }

    componentWillReceiveProps(nextProps) {
        this.model.updateConfig(nextProps);
    }
}

export const leftRightChooser = elemFactory(LeftRightChooser);