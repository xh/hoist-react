import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {hoistCmp, HoistModel, uses, useLocalModel, XH} from '@xh/hoist/core';
import {frame, div} from '@xh/hoist/cmp/layout';
import {isFinite} from 'lodash';
import {computed, observable, action, makeObservable} from '@xh/hoist/mobx';
import {gestureDetector} from '@xh/hoist/kit/onsen';
import {NavigatorModel} from '../NavigatorModel';
import './BackSwiper.scss';


/**
 * Wrap the Onsen Navigator model with drag gesture handling and a back swipe icon.
 *
 * @private
 */
export const backSwiper = hoistCmp.factory({
    model: uses(NavigatorModel),
    render({model, children}) {
        if (!model.swipeToGoBack) return frame(children);

        const impl = useLocalModel(() => new LocalModel(model));
        return frame(
            swipeIcon({model: impl}),
            gestureDetector({
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
        const {swipeProgress, swipeStarted, swipeComplete} = model,
            left = -40 + (swipeProgress * 60),
            className = classNames(
                'xh-navigator__swipe-indicator',
                swipeStarted ? 'xh-navigator__swipe-indicator--started' : null,
                swipeComplete ? 'xh-navigator__swipe-indicator--complete' : null
            );
        console.log(left);
        return div({
            className,
            style: {left},
            item: Icon.chevronLeft()
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

    constructor(navigatorModel) {
        super();
        makeObservable(this);
        this.navigatorModel = navigatorModel;
    }

    @action
    onDragStart = (e) => {
        this.swipeProgress = null;
        const {navigatorModel} = this,
            {gesture} = e.nativeEvent;

        if (gesture.direction !== 'right') return;

        // Determine if this gesture could be a potential navigation swipe.
        if (navigatorModel.stack.length < 2) return;

        // Prevent swipes from the left edge of the screen, to not conflict
        // with the native browser back gesture.
        if (gesture.startEvent.center.pageX < 20) return;

        // Loop through the touch targets to ensure it is safe to swipe
        for (let el = e.target; el && el !== document.body; el = el.parentNode) {
            // Don't conflict with grid header reordering.
            if (el.classList.contains('xh-grid-header')) {
                return;
            }
            // Ensure any left-scrolling element in the target path takes priority over swipe navigation.
            // We must check this at the start of the gesture, as scroll position changes throughout.
            if (el.scrollWidth > el.offsetWidth && el.scrollLeft > 0) {
                return;
            }
        }

        this.swipeProgress = 0;
        this.consumeEvent(e);
    }

    @action
    onDrag = (e) => {
        if (!this.swipeStarted) return;
        const {direction, deltaX} = e.gesture;

        // If the direction ever deviates, cancel the gesture
        if (direction !== 'right') {
            this.swipeProgress = null;
            return;
        }

        // Set normalised progress based on distance dragged
        this.swipeProgress = Math.clamp(deltaX / 150, 0, 1);
        this.consumeEvent(e);
    }

    @action
    onDragEnd = (e) => {
        if (!this.swipeStarted) return;
        if (this.swipeComplete) XH.popRoute();
        this.swipeProgress = null;
        this.consumeEvent(e);
    }

    consumeEvent(e) {
        e.preventDefault();
        e.stopPropagation();
    }
}