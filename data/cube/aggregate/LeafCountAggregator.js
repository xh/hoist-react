/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class LeafCountAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let count = 0;

        this.forEachLeaf(rows, row => {
            // TODO: Do we care about null values? Or are we counting Records? If we care about null, what about false?
            // Example grouping: State -> Stores -> Employees... Employees has an 'isManager' flag... If I want to count the number of managers in a state, I'd want to exclude false as well as null
            // But that doesn't help us in the case where you'd want the total number of employees in a state, which is a true count of Leaves,
            count++;
        });

        return count;
    }

    replace(rows, currAgg, update) {
        return currAgg; // TODO: Under the impression that the rows count never changes with updates, therefore the changes in values does not effect the count of leaves. Correct?
    }
}