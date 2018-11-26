/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {select} from '@xh/hoist/mobile/cmp/form'
import {MenuModel} from '@xh/hoist/mobile/cmp/menu';
import {withDefault} from '@xh/hoist/utils/js';
import {DimensionChooserModel} from '@xh/hoist/desktop/cmp/dimensionchooser'
import {hbox, div, span} from '@xh/hoist/cmp/layout';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {observable, action, bindable} from '@xh/hoist/mobx';
import {size, isEmpty} from 'lodash';



@HoistModel
export class DimChooserModel {

    @observable.ref menuModel = null;
    dimensionChooserModel = null;

    /**
     * @param c - DimensionChooserModel configuration.
     * @param {string[]|Object[]} c.dimensions - dimensions available for selection. The object
     *      form supports value, label, and leaf keys, where `leaf: true` indicates that the
     *      dimension does not support any further sub-groupings.
     * @param {string[]} [c.initialValue] - initial dimensions if history empty / not configured.
     *      If neither are specified, the first available dimension will be used as the value.
     * @param {string} [c.historyPreference] - preference key used to persist the user's most
     *      recently selected groupings for easy re-selection.
     */
    constructor({
                    dimensions,
                    initialValue,
                    historyPreference,
                }) {
        this.dimensionChooserModel = new DimensionChooserModel({
            dimensions,
            initialValue,
            historyPreference,
            maxHistoryLength: 5,
            maxDepth: 4
        });
        const itemModels = this.getItemModels();
        this.menuModel = new MenuModel({
            itemModels,
            xPos: 50,
            yPos: 100
        });


        this.addReaction({
            track: () => [
                this.dimensionChooserModel.value,
                this.dimensionChooserModel.pendingValue,
                this.dimensionChooserModel.showAddSelect,
                this.dimensionChooserModel.activeMode
            ],
            run: () => {
                this.menuModel.open();
                this.menuModel.itemModels = this.getItemModels();
            },
        });

    }


    getItemModels() {
        const menu = this.dimensionChooserModel.activeMode === 'history' ?
            this.renderHistoryMenu() :
            this.renderSelectMenu()

        return [{
            element: div(
                menu
            )
        }]
    }

    renderHistoryMenu() {
        const {dimensionChooserModel: model} = this,
            {history, dimensions} = model;
        const historyItems = history.map((value, i) => {
            const labels = value.map(h => dimensions[h].label);
            return {
                element: button({
                    minimal: true,
                    title: ` ${labels.map((it, i) => ' '.repeat(i) + '\u203a '.repeat(i ? 1 : 0) + it).join('\n')}`,
                    text: labels.join(' \u203a '),
                    key: `dim-history-${i}`,
                    onClick: () => {
                        model.setValue(value);
                    }
                })
            }
        });

        const historyMenu = buttonGroup({
            minimal: true,
            items: [
                // button({
                //     icon: Icon.x(),
                //     flex: 1,
                //     // onClick: () => model.closeMenu()
                // }),
                button({
                    icon: Icon.edit(),
                    flex: 2,
                    title: 'Add a new grouping',
                    onClick: () => model.showEditor()
                })
            ]
        });

        return div(
            ...historyItems,
            historyMenu
        )
    }

    renderSelectMenu() {
        const {dimensionChooserModel: model} = this,
            {pendingValue, dimensions, maxDepth, leafInPending} = model;
        const ret = pendingValue.map((dim, i) => {
            let options = model.dimOptionsForLevel(i);
            options = [dimensions[dim], ...options];
            return div(
                    select({
                        options,
                        value: dim,
                        width: 100,
                        onChange: (e) => model.addPendingDim(e.target.value, i)
                    }),
                    button({
                        icon: Icon.x({className: 'xh-red'}),
                        onClick: () => {
                            model.removePendingDim(dim);
                            model.setShowAddSelect(false);
                        }
                    })
                )
        });
        const atMaxDepth = (pendingValue.length === Math.min(maxDepth, size(dimensions)));
        if (!atMaxDepth && !leafInPending) ret.push(this.renderAddButton());
        return ret;
    }

    renderAddButton() {
        // can update to match dimension chooser add/select logic
        const {dimensionChooserModel: model} = this,
            {pendingValue, showAddSelect} = model,
            pendingCount = pendingValue.length,
            options = [{label: '', value: ''}, ...model.dimOptionsForLevel(pendingCount)];

        const ret = showAddSelect ?
            select({
                options: model.dimOptionsForLevel(pendingCount),
                onChange: (e) => model.addPendingDim(e.target.value, pendingCount)
            }) :
            button({
                text: 'Add grouping...',
                icon: Icon.add({className: 'xh-green'}),
                onClick: () => model.setShowAddSelect(true)
            });
        return ret
    }
}