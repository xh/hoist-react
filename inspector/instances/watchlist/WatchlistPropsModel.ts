/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {compact} from 'lodash';
import {BasePropsModel} from '../details/BasePropsModel';
import type {InstancesModel} from '../InstancesModel';

/**
 * Starred properties across all live instances, grouped by instance. Unaffected by the current
 * selection or the Properties quick filters.
 *
 * @internal
 */
export class WatchlistPropsModel extends BasePropsModel {
    constructor(parent: InstancesModel) {
        super(parent, true);

        this.addAutorun({
            run: () => {
                const {watchlistModel} = parent,
                    data = watchlistModel.props.flatMap(it =>
                        watchlistModel
                            .resolveInstances(it.instanceKey)
                            .map(inst => this.getRecData(inst, it.property, it.isGetter))
                    );
                this.gridModel.loadData(compact(data));
            },
            delay: 300
        });
    }
}
