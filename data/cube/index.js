import {
    Aggregator,
    Max,
    Min,
    Null,
    Single,
    Sum,
    SumStrict,
    Unique
} from '@xh/hoist/data/cube/aggregate';

import {
    Filter,
    NoMatchFilter,
    ValueFilter
} from '@xh/hoist/data/cube/filter';

import {
    AggregateRecord,
    Record
} from '@xh/hoist/data/cube/record';

import {
    FieldChange,
    RecordAdd,
    RecordChange,
    RecordRefresh,
    RecordUpdate
} from '@xh/hoist/data/cube/update';

import {Cube} from './Cube';
import {Field} from './Field';
import {Query} from './Query';
import {View} from './View';


export const cube = {
    aggregate: {
        Aggregator,
        Max,
        Min,
        Null,
        Single,
        Sum,
        SumStrict,
        Unique
    },
    filter: {
        Filter,
        NoMatchFilter,
        ValueFilter
    },
    record: {
        AggregateRecord,
        Record
    },
    update: {
        FieldChange,
        RecordChange,
        RecordAdd,
        RecordRefresh,
        RecordUpdate
    },
    Cube,
    Field,
    Query,
    View
};