/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {HoistBase, HoistService, HoistModel} from '../';
import {isNil} from 'lodash';
import type {Cube, Store, View} from '@xh/hoist/data';
import {observableShallow, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {useEffect} from 'react';

/**
 * Generic singleton object for cataloging global models and services.
 *
 * Everything is held weakly, so cataloging an object never keeps it in memory. One that is never
 * destroyed is still collected once nothing else references it.
 * @internal
 */
class InstanceManager {
    readonly services = new IterableWeakSet<HoistService>();

    readonly models = new IterableWeakSet<HoistModel>();

    readonly stores = new IterableWeakSet<Store>();

    readonly cubes = new IterableWeakSet<Cube>();

    readonly views = new IterableWeakSet<View>();

    private modelsByTestId: Map<string, HoistModel> = new Map();
    private testSupportedModels = new Set([
        'GridModel',
        'DataViewModel',
        'FormModel',
        'TabModel',
        'ViewManagerModel'
    ]);

    registerModel(m: HoistModel) {
        wait().thenAction(() => this.models.add(m));
    }

    unregisterModel(m: HoistModel) {
        wait().thenAction(() => this.models.delete(m));
    }

    registerService(s: HoistService) {
        wait().thenAction(() => this.services.add(s));
    }

    registerStore(s: Store) {
        wait().thenAction(() => this.stores.add(s));
    }

    unregisterStore(s: Store) {
        wait().thenAction(() => this.stores.delete(s));
    }

    registerCube(c: Cube) {
        wait().thenAction(() => this.cubes.add(c));
    }

    unregisterCube(c: Cube) {
        wait().thenAction(() => this.cubes.delete(c));
    }

    registerView(v: View) {
        wait().thenAction(() => this.views.add(v));
    }

    unregisterView(v: View) {
        wait().thenAction(() => this.views.delete(v));
    }

    registerModelWithTestId(testId: string, m: HoistModel) {
        if (
            isNil(testId) ||
            isNil(m) ||
            !m.isHoistModel ||
            !this.testSupportedModels.has(m.constructor.name) ||
            this.modelsByTestId.has(testId)
        )
            return;
        this.modelsByTestId.set(testId, m);
    }

    unregisterModelWithTestId(testId: string) {
        this.modelsByTestId.delete(testId);
    }

    getModelByTestId(testId: string): HoistModel {
        return this.modelsByTestId.get(testId);
    }

    useTestIdRegistration(testId: string, model: HoistModel) {
        useEffect(() => {
            this.registerModelWithTestId(testId, model);
            return () => this.unregisterModelWithTestId(testId);
        }, [testId, model]);
    }
}

/**
 * An observable, insertion-ordered collection that holds its members weakly. Members are dropped
 * when deleted, or when garbage collected.
 */
class IterableWeakSet<T extends HoistBase> {
    @observableShallow private accessor refs: Map<string, WeakRef<T>> = new Map();

    // Called with a member's xhId after the member is garbage collected.
    private registry = new FinalizationRegistry<string>(xhId => {
        runInAction(() => this.refs.delete(xhId));
    });

    /** Number of members, including any collected but not yet finalized. */
    get size(): number {
        return this.refs.size;
    }

    add(member: T) {
        const {xhId} = member,
            ref = new WeakRef(member);
        this.registry.register(member, xhId, ref);
        this.refs.set(xhId, ref);
    }

    delete(member: T) {
        const {xhId} = member,
            ref = this.refs.get(xhId);
        if (!ref) return;
        this.registry.unregister(ref);
        this.refs.delete(xhId);
    }

    *[Symbol.iterator](): Iterator<T> {
        for (const ref of this.refs.values()) {
            const member = ref.deref();
            if (member) yield member;
        }
    }
}

export const instanceManager = new InstanceManager();
