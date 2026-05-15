/*
 * Phase 0 spike — test model exercising the decorator patterns that the migration relies on.
 */
import {action, computed, makeObservable, observable} from 'mobx';
import {bindable} from './bindable';

export class SpikeModel {
    // Plain @observable accessor — MobX's native TC39 path.
    @observable accessor count: number = 0;

    // @observable.ref accessor — also native MobX.
    @observable.ref accessor items: number[] = [];

    // Custom @bindable accessor — should get an action-wrapped setCount()... err, setName() setter.
    @bindable accessor name: string = '';

    // Custom @bindable.ref accessor — reference equality, action-wrapped setter.
    @bindable.ref accessor payload: {x: number} = {x: 0};

    // Plain @computed — should not need `accessor`.
    @computed
    get doubled(): number {
        return this.count * 2;
    }

    // Plain @action — should not need `accessor`.
    @action
    increment(): void {
        this.count += 1;
    }
}

// Subclass to verify @bindable setter survives inheritance and that accessor fields compose.
export class SpikeSubclass extends SpikeModel {
    @observable accessor extra: string = 'child';
}

// Silence unused-import warning in the compile-only sanity check.
export const _unused = makeObservable;
