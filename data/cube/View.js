/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Primary interface for consuming grouped and aggregated data from the cube.
 *
 * This object will fire the following events against itself:
 *
 *      'dataloaded'  -- all records and info may have been changed.
 *      'recordsupdated' -- provides an array of RecordUpdate made to records.
 *      'infoupdated' -- all info for this cube may have changed.
 */
Ext.define('XH.cube.View', {
    mixins: [Ext.mixin.Observable],

    // Immutable
    cube: null,

    // Current State
    _query: null,
    _boundStore: null,

    _records: [],   // top-level record(s)
    _leafMap: {},   // all leaf records by id
    _aggMap: {},    // all aggregate records by id

    /**
     * Create this object.
     *
     * @param cube, source XH.cube.Cube for this view.
     * @param query, XH.query.Query to be used to construct this view (or config to create same).
     * @param connect, boolean.  Should this view receive updates when its source Cube changes?
     * @param listeners, map of listeners.  See Observable.addListener.
     * @param boundStore, Ext.data.TreeStore, or Ext.data.Store.  An optional store to bind to this view.
     *      If provided, this store will automatically be updated when this view changes.
     */
    constructor({cube, query, connect = false, listeners = null, boundStore = null}) {
        this.mixins.observable.constructor.call(this);
        this.cube = cube;
        this.setQuery(query);
        this.setBoundStore(boundStore);

        // Add listeners late to avoid spurious changes during construction.
        if (listeners) {
            this.addListener(listeners);
        }

        // Connect late to avoid connecting if an exception thrown.
        if (connect) {
            this.cube.connect(this);
        }
    },

    //--------------------
    // Main Public API
    //--------------------
    /**
     * Return current state of view as a collection of anonymous json nodes.
     *
     * Main entry point.
     */
    getDataAsync() {
        return XH.resolve(this.getRecordsAsData(this._records, true));
    },

    /**
     * Return current state of view as a collection of anonymous json nodes.
     *
     * See async version of this method, which is non-blocking, and the preferred
     * method for getting this data.
     *
     * TODO: Can we remove?  This would be inappropriate for server-side implementations.
     */
    getData() {
        return this.getRecordsAsData(this._records, true);
    },

    getQuery() {
        return this._query;
    },

    setQuery(query) {
        if (query != this._query) {
            const Query = XH.cube.Query;
            if (Ext.getClass(query) != Query) {
                query.cube = this.cube;
                query = new Query(query);
            }
            this._query = query;
            this.loadRecordsFromCube();
        }
    },

    updateQuery(params) {
        const newQuery = this.getQuery().clone(params);
        this.setQuery(newQuery);
    },

    getBoundStore() {
        return this._boundStore;
    },

    setBoundStore(store) {
        if (store != this._boundStore) {
            this._boundStore = store;
            this.loadBoundStore();
        }
    },

    disconnect() {
        this.cube.disconnect(this);
    },

    isConnected() {
        return this.cube.isConnected(this);
    },

    getInfo() {
        return this.cube.getInfo();
    },

    getDimensionValues() {
        const leaves = Ext.Object.getValues(this._leafMap),
            fields = this._query.getFieldsAsList(),
            ret = [];

        fields.forEach(f => {
            if (f.isDimension) {
                const vals = [];
                leaves.forEach(rec => {
                    const lVal = rec.get(f.name);
                    if (lVal != null && !vals.includes(lVal)) {
                        vals.push(lVal);
                    }
                });

                ret.push({
                    name: f.name,
                    displayName: f.displayName,
                    values: vals
                });
            }
        });

        return ret;
    },

    //-----------------------
    // Entry point for cube
    //-----------------------
    noteCubeLoaded() {
        this.loadRecordsFromCube();
    },

    noteCubeUpdated(recordUpdates, infoUpdated) {
        const appliedUpdates = {},
            changes = recordUpdates.filter(it => it.type == 'CHANGE'),
            adds = recordUpdates.filter(it => it.type == 'ADD');

        this.applyChanges(changes, appliedUpdates);
        this.applyAdds(adds, appliedUpdates);

        if (!Ext.Object.isEmpty(appliedUpdates)) {
            const updates = Ext.Object.getValues(appliedUpdates);
            this.updateBoundStore(updates);
            this.fireEvent('recordsupdated', updates);
        }

        if (infoUpdated) {
            this.fireEvent('infoupdated');
        }
    },

    //------------------------
    // Implementation
    //------------------------
    loadRecordsFromCube() {
        const AggregateRecord = XH.cube.record.AggregateRecord,
            q = this._query,
            dimensions = q.dimensions;

        this._records = null;
        this._aggMap = {};
        this._leafMap = {};

        // Create the new structure
        const sourceRecords = Ext.Object.getValues(this.cube.getRecords()),
            newLeaves = this.createLeaves(sourceRecords);
        this._records = this.groupAndInsertLeaves(newLeaves, dimensions, [], []);
        if (q.includeRoot) {
            this._records = [new AggregateRecord(q.fields, this.getRootId(), this._records, null, 'Total')];
        }

        // Broadcast any changes
        this.loadBoundStore();
        this.fireEvent('dataloaded');
    },

    destroy() {
        this.disconnect();
        this._boundStore = null;
        this.mixins.observable.destroy.call(this);
    },

    /**
     * Add new source records to this view.
     *
     * @param sourceRecords, records from underlying cube.
     * @return Array, newly added leaves associated with inserted records.
     */
    createLeaves(sourceRecords) {
        const Record = XH.cube.record.Record,
            q = this._query,
            filters = q.filters,
            fields = q.fields;

        // 0) Filter source records
        if (!Ext.isEmpty(filters)) {
            sourceRecords = sourceRecords.filter(rec => {
                return filters.every(f => f.matches(rec));
            });
        }

        // 1) Create and store cloned leaves.
        const ret = sourceRecords.map(r => new Record(fields, r.data));
        ret.forEach(r => this._leafMap[r.getId()] = r);

        return ret;
    },

    /**
     * Incorporate a set of new leaf records, along a set of (remaining) dimensions.
     * This is called recursively, so that the lowest level grouping is applied first.

     * @param leaves, new leaf records to be incorporated into the tree
     * @param dimensions, remaining dimensions to group on
     * @param aggsAdded, Array of added aggregates by this operation.  For population by this method.
     * @param aggsToUpdate, Array of existing aggregates which will need to be updated as a result
     *          of this operation.  For population by this method.
     * @param parentId, id of the parent node these leaves are to be inserted at.
     *
     * @return Array, records to be added at this level to accommodate the leaf insertion.
     */
    groupAndInsertLeaves(leaves, dimensions, aggsAdded, aggsToUpdate, parentId = this.getRootId()) {
        if (Ext.isEmpty(dimensions)) return leaves;

        const AggregateRecord = XH.cube.record.AggregateRecord,
            ValueFilter = XH.cube.filter.ValueFilter,
            fields = this._query.fields,
            dim = dimensions[0],
            groups = Ext.Array.toValueMap(leaves, (it) => it.get(dim.name), this, 1),
            ret = [];

        Ext.Object.each(groups, (val, groupLeaves) => {
            const id = parentId + XH.cube.Cube.RECORD_ID_DELIMITER + ValueFilter.encode(dim.name, val);

            const newChildren = this.groupAndInsertLeaves(groupLeaves, dimensions.slice(1), aggsAdded, aggsToUpdate, id);
            let rec = this._aggMap[id];
            if (rec) {
                rec.children = rec.children.concat(newChildren);
                newChildren.forEach(it => it.parent = rec);
                aggsToUpdate.push(rec);
            } else {
                rec = new AggregateRecord(fields, id, newChildren, dim, val);
                aggsAdded.push(rec);
                this._aggMap[id] = rec;
                ret.push(rec);
            }
        });

        return ret;
    },

    /**
     * Update all aggregates associated with a new set of leaves.
     *
     * This method will ensure that any aggregate parents of new leaves will be updated
     * These updates will be applied in the correct order, and in a way to avoid
     * recomputing aggregates multiple times.
     *
     * @param adds, Array of RecordAdd objects associated with source cube
     * @param appliedUpdates, map of RecordUpdate that have occurred during this batch.
     */
    applyAdds(adds, appliedUpdates) {
        const RecordRefresh = XH.cube.update.RecordRefresh,
            RecordAdd = XH.cube.update.RecordAdd,
            q = this._query;

        // 0) Generate and add the new leaves
        const cubeRecs = adds.map(it => it.record),
            newLeaves = this.createLeaves(cubeRecs);

        if (!newLeaves.length) return;

        // 1) Insert the new leaves into the tree
        const aggsAdded = [],
            aggsToUpdate = [],
            recs = this._records,
            newRecs = this.groupAndInsertLeaves(newLeaves, q.dimensions, aggsAdded, aggsToUpdate);
        if (q.includeRoot) {
            const root = recs[0];
            root.children = root.children.concat(newRecs);
            newRecs.forEach(it => it.parent = root);
        } else {
            this._records = recs.concat(newRecs);
        }

        // 2) Update records that need to be updated. This ordering is correct (bottom up)
        aggsToUpdate.forEach(r => r.computeAggregates());

        // 3) Generate change records.  Note the ordering of the events:
        //      'add' trumps 'refresh'.  Downstream clients don't even know about these records yet
        aggsToUpdate.forEach(r => {
            appliedUpdates[r.getId()] = new RecordRefresh(r);
        });

        newLeaves.forEach(r => {
            appliedUpdates[r.getId()] = new RecordAdd(r);
        });

        aggsAdded.forEach(r => {
            appliedUpdates[r.getId()] = new RecordAdd(r);
        });
    },

    /**
     * Apply a collection of changes to existing leaf records
     *
     * @param changes, Array of RecordChange related to source cube.
     * @param appliedUpdates, map of RecordUpdate that have occurred during this batch.
     */
    applyChanges(changes, appliedUpdates) {
        const RecordChange = XH.cube.update.RecordChange;
        changes.forEach(change => {
            const rec = this._leafMap[change.record.getId()];
            if (rec) {
                const fieldChanges = change.fieldChanges.filter(it => rec.fields[it.field.name]);
                if (fieldChanges.length) {
                    const change = new RecordChange(rec, fieldChanges);
                    rec.processChange(change, appliedUpdates);
                }
            }
        });
    },

    /**
     * Update store to correspond to a set of updates.

     * @param updates, Array of updates that occurred during this batch.
     */
    updateBoundStore(updates) {
        if (!this._boundStore) return;

        const store = this._boundStore,
            isTreeStore = store.isTreeStore,
            adds = updates.filter(it => it.type == 'ADD'),
            edits = updates.filter(it => it.type != 'ADD');

        let storeAddCount = 0,
            storeEditCount = 0;

        // Apply the changes in bulk, with events suspended.
        const startTime = Date.now();
        XH.bulkUpdateStore(store, () => {
            // 1) Add records to store first.  Skip adding any record with a parent not already in the store.
            //    It's part of an entirely new subtree that will be added in bulk
            const rootAdds = adds.filter(add => {
                const rec = add.record;
                return !rec.parent || store.getById(rec.parent.data.id);
            });

            rootAdds.forEach(add => {
                const rec = add.record;
                const dataRecords = this.getRecordsAsData([rec], isTreeStore),
                    dataRecord = dataRecords.length ? dataRecords[0] : null;

                if (dataRecord) {
                    if (isTreeStore) {
                        if (rec.parent) {
                            const parent = this.findRecord(store, rec.parent.data.id);
                            parent.appendChild(dataRecord);
                        } else {
                            store.getRoot().appendChild(dataRecord);
                        }
                    } else {
                        store.add(dataRecord);
                    }
                    storeAddCount++;
                }
            });

            // 2) Apply edits (minimally) using set()
            const editFlags = {dirty: false};
            edits.forEach(edit => {
                const rec = edit.record,
                    storeRec = this.findRecord(store, rec.getId());

                if (!storeRec) return;

                storeRec.beginEdit();
                switch (edit.type) {
                    case 'CHANGE':
                        edit.fieldChanges.forEach(it => {
                            const name = it.field.name;
                            storeRec.set(name, rec.get(name), editFlags);
                        });
                        break;
                    case 'REFRESH':
                        rec.eachField(name => {
                            storeRec.set(name, rec.get(name), editFlags);
                        });
                        break;
                }
                storeEditCount++;
                storeRec.endEdit();
            });
        });
        const elapsed = Date.now() - startTime;
        if (console.debug) console.debug(`Updated store: ${storeEditCount} edits | ${storeAddCount} adds | ${elapsed}ms`);
    },

    loadBoundStore() {
        const q = this._query,
            store = this._boundStore;

        if (store) {
            const startTime = Date.now();
            XH.bulkUpdateStore(store, () => {
                if (store.isTreeStore) {
                    const data = this.getRecordsAsData(this._records, true);
                    store.loadNodes(q.includeRoot ? data[0] : data);
                } else {
                    const data = this.getRecordsAsData(this._records, false);
                    store.loadData(data);
                }
            });

            const elapsed = Date.now() - startTime;
            if (console.debug) console.debug(`Loaded store: ${elapsed}ms`);
        }
    },


    getRecordsAsData(records, includeChildren) {
        const q = this._query,
            lockFn = this.cube._lockFn;

        if (!records.length || (!q.includeLeaves && records[0].isLeaf)) {
            return [];
        }

        return records.map(rec => {
            let data = Ext.clone(rec.data),
                dim = rec.dim,
                children = rec.children;

            if (includeChildren && children) {
                // Potentially Lock children
                if (lockFn && lockFn(rec)) {
                    data.locked = true;
                    children = [];
                } else if (children.length == 1) {
                    // ... or drill past single child if it is an identical 'child' dimension.
                    const childRec = children[0],
                        childDim = childRec.dim;

                    if (dim && childDim && childDim.parentDimension == dim.name &&
                        childRec.get(childDim.name) == rec.get(dim.name)) {
                        children = childRec.children;
                    }
                }

                // 1) serialize to store data recursively
                const childrenAsData = this.getRecordsAsData(children, includeChildren);
                if (childrenAsData.length) {
                    data.children = childrenAsData;
                }
            }
            data.leaf = !data.children;
            data.xhDimension = dim ? dim.name : null;
            return data;
        });
    },

    getRootId() {
        return this._query.filtersAsString();
    },

    findRecord(store, id) {
        let ret = store.getById(id);
        // need to find root, even if store.rootVisible false,
        if (!ret && store.isTreeStore) {
            const root = store.getRoot();
            if (root.getId() == id) {
                ret = root;
            }
        }
        return ret;
    }
});