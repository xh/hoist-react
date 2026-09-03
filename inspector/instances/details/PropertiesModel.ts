/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {persist, XH} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {compact, forIn} from 'lodash';
import {BasePropsModel} from './BasePropsModel';
import type {InstancesModel} from '../InstancesModel';

/**
 * Lists the properties (including getters) of the instances selected in the Instances grid,
 * grouped by instance and subject to the quick filters.
 *
 * @internal
 */
export class PropertiesModel extends BasePropsModel {
    override persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}.instances`};

    @bindable @persist quickFilters: string[] = [];
    get showUnderscoreProps() {
        return this.quickFilters?.includes('showUnderscoreProps');
    }
    get observablePropsOnly() {
        return this.quickFilters?.includes('observablePropsOnly');
    }
    get ownPropsOnly() {
        return this.quickFilters?.includes('ownPropsOnly');
    }

    constructor(parent: InstancesModel) {
        super(parent, false);
        makeObservable(this);

        const {gridModel} = this;

        this.addReaction(
            {
                track: () => parent.activeGridModel.selectedIds,
                run: ids => {
                    gridModel.emptyText = ids.length
                        ? 'No matching properties found.'
                        : 'Select an instance to view properties.';
                },
                delay: 300,
                fireImmediately: true
            },
            {
                // Collapse groups by default when comparing multiple instances.
                track: () => parent.activeGridModel.selectedIds.length > 1,
                run: multi => (multi ? gridModel.collapseAll() : gridModel.expandAll()),
                fireImmediately: true
            }
        );

        this.addAutorun({
            run: () => {
                const data = [];
                parent.selectedInstances.forEach(instance => {
                    forIn(this.getDescriptors(instance), (descriptor, property) => {
                        // Extract data from enumerable props and getters. Exclude prototype, as
                        // that renders as a confusing link to the superclass as if it were a
                        // distinct instance (which, you know, it kinda is but let's not go there).
                        if (property !== '__proto__' && (descriptor.enumerable || descriptor.get)) {
                            data.push(this.getRecData(instance, property, !!descriptor.get));
                        }
                    });
                });
                gridModel.loadData(compact(data));
            },
            delay: 300
        });
    }

    protected override shouldInclude(
        property: string,
        isOwnProperty: boolean,
        isObservable: boolean
    ) {
        const {ownPropsOnly, observablePropsOnly, showUnderscoreProps} = this;
        return (
            !(ownPropsOnly && !isOwnProperty) &&
            !(observablePropsOnly && !isObservable) &&
            (showUnderscoreProps || !property.startsWith('_'))
        );
    }

    private getDescriptors(instance) {
        let ret = Object.getOwnPropertyDescriptors(instance),
            proto = Object.getPrototypeOf(instance);

        if (proto) {
            ret = {...ret, ...this.getDescriptors(proto)};
        }

        return ret;
    }
}
