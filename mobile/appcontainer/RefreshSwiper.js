import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {hoistCmp, HoistModel, uses, useLocalModel, XH} from '@xh/hoist/core';
import {frame, div} from '@xh/hoist/cmp/layout';
import {isFinite} from 'lodash';
import {computed, observable, action, makeObservable} from '@xh/hoist/mobx';
import {gestureDetector} from '@xh/hoist/kit/onsen';
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import './RefreshSwiper.scss';


/**
 * Wrap the Application content with drag gesture handling and a refresh icon.
 *
 * @private
 */
export const refreshSwiper = hoistCmp.factory({
    model: uses(AppContainerModel),
    render({model, children}) {
        const impl = useLocalModel(() => new LocalModel(model));
        return frame(
            swipeIcon({model: impl}),
            gestureDetector({
                style: {display: 'flex', width: '100%', height: '100%'},
                onDragStart: impl.onDragStart,
                onDrag: impl.onDrag,
                onDragEnd: impl.onDragEnd,
                item: children
            })
        );
    }
});

const swipeIcon = hoistCmp.factory(
    ({model}) => {
        if (!model.swipeStarted) return null;

        const {swipeProgress, swipeComplete} = model,
            top = -40 + (swipeProgress * 150),
            degrees = Math.floor(swipeProgress * 360),
            className = classNames(
                'xh-refresh__swipe-indicator',
                'xh-refresh__swipe-indicator--started',
                swipeComplete ? 'xh-refresh__swipe-indicator--complete' : null
            );

        return div({
            className,
            style: {
                top,
                transform: `translate(-50%) rotate(${degrees}deg)`
            },
            item: Icon.refresh()
        });
    }
);

class LocalModel extends HoistModel {

    @observable swipeProgress = null;

    @computed
    get swipeStarted() {
        return isFinite(this.swipeProgress);
    }

    @computed
    get swipeComplete() {
        return this.swipeProgress === 1;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    onDragStart = (e) => {
        this.swipeProgress = null;

        // Loop through the touch targets to ensure it is safe to swipe
        for (let el = e.target; el && el !== document.body; el = el.parentNode) {
            // Don't conflict with grid header reordering.
            if (el.classList.contains('xh-grid-header')) {
                return;
            }
            // Ensure any up-scrolling element in the target path takes priority over swipe navigation.
            // We must check this at the start of the gesture, as scroll position changes throughout.
            if (el.scrollHeight > el.offsetHeight && el.scrollTop > 0) {
                return;
            }
        }

        this.swipeProgress = 0;
        this.consumeEvent(e);
    }

    @action
    onDrag = (e) => {
        if (!this.swipeStarted) return;
        const {direction, deltaY} = e.gesture;

        // If the direction ever deviates, cancel the gesture
        if (direction !== 'down') {
            this.swipeProgress = null;
            return;
        }

        // Set normalised progress based on distance dragged
        this.swipeProgress = Math.clamp(deltaY / 150, 0, 1);
        this.consumeEvent(e);
    }

    @action
    onDragEnd = (e) => {
        if (!this.swipeStarted) return;
        if (this.swipeComplete) {
            XH.refreshAppAsync().finally(() => {
                this.swipeProgress = null;
            });
        }
        this.consumeEvent(e);
    }

    consumeEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }
}