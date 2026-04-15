/*
 * Phase 0 spike — runtime validator.
 * Exercises the gate criteria from plan §Phase 0 step 5:
 *   - observable is reactive
 *   - setXxx() exists and is action-wrapped
 *   - fields are accessor-style (non-enumerable) under TC39 semantics
 */
import {autorun, configure, isAction, isObservableProp} from 'mobx';
import {SpikeModel, SpikeSubclass} from './model';

// Match hoist-react's MobX configuration.
configure({enforceActions: 'observed'});

let failed = 0;
function check(cond: boolean, label: string) {
    if (cond) {
        console.log(`  ok — ${label}`);
    } else {
        console.log(`  FAIL — ${label}`);
        failed++;
    }
}

console.log('\n=== Gate 1: @observable accessor is reactive ===');
{
    const m = new SpikeModel();
    let fireCount = 0,
        lastSeen = -1;
    const dispose = autorun(() => {
        lastSeen = m.count;
        fireCount++;
    });
    check(fireCount === 1, 'autorun fires immediately on subscribe');
    check(lastSeen === 0, 'initial value observed (0)');

    m.increment();
    check(fireCount === 2, 'autorun fires on @action mutation');
    check(m.count === 1, 'increment advanced count to 1');
    check(m.doubled === 2, '@computed derivation works (doubled === 2)');
    dispose();
}

console.log('\n=== Gate 2: @bindable installs action-wrapped setXxx on prototype ===');
{
    const m = new SpikeModel();
    const setName = (m as any).setName;
    check(typeof setName === 'function', 'setName exists');
    check(isAction(setName), 'setName is a MobX action');
    check(!Object.prototype.hasOwnProperty.call(m, 'setName'), 'setName lives on prototype, not instance');

    let fireCount = 0,
        lastName = '';
    const dispose = autorun(() => {
        lastName = m.name;
        fireCount++;
    });
    check(fireCount === 1, 'autorun fires immediately');
    (m as any).setName('hello');
    check(fireCount === 2, 'setter triggered reaction');
    check(lastName === 'hello', 'value propagated through setter');
    dispose();
}

console.log('\n=== Gate 3: @bindable.ref variant ===');
{
    const m = new SpikeModel();
    const setPayload = (m as any).setPayload;
    check(typeof setPayload === 'function', 'setPayload exists');
    check(isAction(setPayload), 'setPayload is a MobX action');

    let fireCount = 0;
    const dispose = autorun(() => {
        void m.payload;
        fireCount++;
    });
    (m as any).setPayload({x: 1});
    check(fireCount === 2, 'ref setter triggered reaction');
    dispose();
}

console.log('\n=== Gate 4: isObservableProp reports decorated fields ===');
{
    const m = new SpikeModel();
    check(isObservableProp(m, 'count'), 'count is observable');
    check(isObservableProp(m, 'name'), 'name (@bindable) is observable');
    check(isObservableProp(m, 'payload'), 'payload (@bindable.ref) is observable');
    check(isObservableProp(m, 'items'), 'items is observable');
}

console.log('\n=== Gate 5: Enumerability change (accessor fields are NOT enumerable) ===');
{
    const m = new SpikeModel();
    const keys = Object.keys(m);
    check(
        !keys.includes('count') && !keys.includes('name'),
        'accessor fields do NOT appear in Object.keys (R1 confirmed)'
    );
    // But property access works — confirms the accessor pair is in place on the prototype.
    check(m.count === 0 && m.name === '', 'accessor-fields readable via normal access');
}

console.log('\n=== Gate 6: Subclass with its own @observable accessor ===');
{
    const s = new SpikeSubclass();
    let fireCount = 0,
        lastExtra = '';
    const dispose = autorun(() => {
        lastExtra = s.extra;
        fireCount++;
    });
    check(fireCount === 1, 'subclass autorun fires immediately');
    // Subclass must still have working @bindable from parent.
    check(typeof (s as any).setName === 'function', 'subclass inherits setName()');
    // Mutate subclass-own observable via @action (simulate via runInAction equivalent).
    check(isObservableProp(s, 'extra'), 'subclass @observable accessor is observable');
    dispose();
    void lastExtra;
}

console.log('\n=== Summary ===');
if (failed) {
    console.log(`${failed} check(s) FAILED — revisit reference implementation before Phase 1.`);
    process.exit(1);
} else {
    console.log('All gates passed — Phase 0 validated. Proceed to Phase 1.');
}
