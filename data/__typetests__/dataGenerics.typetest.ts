/* eslint-disable @typescript-eslint/no-unused-vars */
/*
 * Compile-time type assertions for data-layer generics. This file is type-checked by
 * `npx tsc --noEmit` and intentionally contains `@ts-expect-error` directives. It is not
 * executed and exports nothing at runtime.
 */
import {Store, StoreRecord} from '@xh/hoist/data';

interface Person {
    id: number;
    name: string;
    age: number;
}

declare function fetchPerson(id: number): void;

// --- Data shape is typed off the generic ---
const store = new Store<Person>({fields: ['name', 'age']});
const rec = store.records[0];
const _name: string = rec.data.name;
const _age: number = rec.data.age;

// --- Id derived from the interface's `id` prop ---
const _id: number = rec.id;
const _dataId: number = rec.data.id;
fetchPerson(rec.id); // flows into a typed service API with no cast

// @ts-expect-error - age is a number, not a string
const _bad: string = rec.data.age;

// @ts-expect-error - `nope` is not a field on Person
const _missing = rec.data.nope;

// --- Convention interface (no id): data is exactly the declared fields ---
// `id` is a top-level StoreRecord property, not a data field, so it is NOT on `data`.
interface Trade {
    sym: string;
}
const tradeStore = new Store<Trade, string>({fields: ['sym']});
const _sym: string = tradeStore.records[0].data.sym;
const _tradeId: string = tradeStore.records[0].id; // explicit Id generic -> typed
// @ts-expect-error - `id` is not a field on Trade; use record.id instead
const _tradeDataId = tradeStore.records[0].data.id;

// --- Untyped store: data is `any`, id is StoreRecordId (NOT any) ---
const loose = new Store({fields: ['x']});
const _anything: number = loose.records[0].data.whatever; // any -> ok
// @ts-expect-error - default id is StoreRecordId (string | number), not assignable to number
const _looseIdNum: number = loose.records[0].id;

// Zero-breakage: untyped store data remains freely castable (no {id} extension leaks in)
interface SomeAppType {
    name: string;
    count: number;
}
const _existingCastStillWorks = loose.records[0].data as SomeAppType;

// --- Covariance: typed store/record assignable to plain base ---
const _genericStore: Store = store;
const _genericRec: StoreRecord = rec;

// --- getValues() returns T & {id: Id} ---
const _values: Person & {id: number} = rec.getValues();

// --- Navigation preserves the type parameter ---
const _child: Person | undefined = rec.children[0]?.data;
