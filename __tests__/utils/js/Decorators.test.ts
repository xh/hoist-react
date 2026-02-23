import {
    abstract,
    computeOnce,
    debounced,
    enumerable,
    sharePendingPromise
} from '@xh/hoist/utils/js/Decorators';

describe('computeOnce', () => {
    it('computes a method exactly once and caches the result', () => {
        class Counter {
            callCount = 0;

            @computeOnce
            getValue() {
                return ++this.callCount;
            }
        }
        const c = new Counter();
        expect(c.getValue()).toBe(1);
        expect(c.getValue()).toBe(1); // cached — not re-computed
        expect(c.callCount).toBe(1);
    });

    it('caches per instance, not per class', () => {
        class Stamp {
            constructor(public id: number) {}

            @computeOnce
            getLabel() {
                return `label-${this.id}`;
            }
        }
        const a = new Stamp(1);
        const b = new Stamp(2);
        expect(a.getLabel()).toBe('label-1');
        expect(b.getLabel()).toBe('label-2');
    });

    it('works on getters', () => {
        class Item {
            callCount = 0;

            @computeOnce
            get doubled() {
                this.callCount++;
                return 84;
            }
        }
        const item = new Item();
        void item.doubled;
        void item.doubled;
        expect(item.doubled).toBe(84);
        expect(item.callCount).toBe(1);
    });
});

describe('debounced', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('collapses rapid calls into a single execution', () => {
        class Worker {
            callCount = 0;

            @debounced(100)
            doWork() {
                this.callCount++;
            }
        }
        const w = new Worker();
        w.doWork();
        w.doWork();
        w.doWork();
        jest.advanceTimersByTime(100);
        expect(w.callCount).toBe(1);
    });

    it('creates independent debounced functions per instance', () => {
        class Worker {
            callCount = 0;

            @debounced(100)
            doWork() {
                this.callCount++;
            }
        }
        const a = new Worker();
        const b = new Worker();
        a.doWork();
        b.doWork();
        jest.advanceTimersByTime(100);
        expect(a.callCount).toBe(1);
        expect(b.callCount).toBe(1);
    });
});

describe('abstract', () => {
    it('throws mentioning the method and class name when invoked', () => {
        class Base {
            @abstract
            doSomething() {}
        }
        const b = new Base();
        expect(() => b.doSomething()).toThrow('doSomething');
        expect(() => b.doSomething()).toThrow('Base');
    });

    it('allows a subclass to provide its own implementation', () => {
        class Base {
            @abstract
            compute(): number {
                return 0;
            }
        }
        class Child extends Base {
            override compute() {
                return 42;
            }
        }
        expect(new Child().compute()).toBe(42);
    });
});

describe('enumerable', () => {
    it('makes a getter enumerable', () => {
        class Item {
            @enumerable
            get name() {
                return 'test';
            }
        }
        const desc = Object.getOwnPropertyDescriptor(Item.prototype, 'name');
        expect(desc.enumerable).toBe(true);
    });
});

describe('sharePendingPromise', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('returns the same pending promise for identical concurrent calls', () => {
        class Svc {
            @sharePendingPromise
            fetch(id: string) {
                return new Promise(resolve => setTimeout(() => resolve(id), 100));
            }
        }
        const svc = new Svc();
        const p1 = svc.fetch('x');
        const p2 = svc.fetch('x');
        expect(p1).toBe(p2);
    });

    it('creates separate promises for calls with different arguments', () => {
        class Svc {
            @sharePendingPromise
            fetch(id: string) {
                return new Promise(resolve => setTimeout(() => resolve(id), 100));
            }
        }
        const svc = new Svc();
        const p1 = svc.fetch('a');
        const p2 = svc.fetch('b');
        expect(p1).not.toBe(p2);
    });

    it('allows a new call after the shared promise settles', async () => {
        class Svc {
            @sharePendingPromise
            fetch(id: string) {
                return new Promise(resolve => setTimeout(() => resolve(id), 100));
            }
        }
        const svc = new Svc();
        const p1 = svc.fetch('x');
        jest.advanceTimersByTime(100);
        await p1;

        // After settlement the cache entry is removed, so a new call creates a fresh promise.
        const p2 = svc.fetch('x');
        expect(p2).not.toBe(p1);
    });
});
