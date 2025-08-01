import type {StoreRecord, StoreRecordId} from '@xh/hoist/data/StoreRecord';

/**
 * Object representing changes made to a Store's RecordSet in a single transaction.
 */
export interface Changelog extends RsTransaction {
    summaryRecords?: StoreRecord[];
}

/**
 * Object representing a transaction to be applied to a Store's RecordSet.
 */
export interface RsTransaction {
    add?: StoreRecord[];
    update?: StoreRecord[];
    remove?: StoreRecordId[];
}
