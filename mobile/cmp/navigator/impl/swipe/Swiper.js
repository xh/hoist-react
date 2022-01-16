import {hoistCmp, HoistModel, uses, useLocalModel, XH} from '@xh/hoist/core';
import {computed, observable, action, makeObservable} from '@xh/hoist/mobx';
import {frame} from '@xh/hoist/cmp/layout';
import {gestureDetector} from '@xh/hoist/kit/onsen';
import {isFinite} from 'lodash';
import {consumeEvent} from '@xh/hoist/utils/js';

import './Swiper.scss';
import {NavigatorModel} from '../../NavigatorModel';
import {refreshIndicator} from './RefreshIndicator';
import {backIndicator} from './BackIndicator';

/**
 * Wrap the Onsen Navigator with drag gesture handling.
 *
 * @private
 */
export const swiper = hoistCmp.factory({
    model: uses(NavigatorModel),
    render({children}) {
        const impl = useLocalModel(LocalModel);
        return frame(
            refreshIndicator({model: impl}),
            backIndicator({model: impl}),
            gestureDetector({
                onDragStart: impl.onDragStart,
                onDrag: impl.onDrag,
                onDragEnd: impl.onDragEnd,
                item: children
            })
        );
    }
});

class LocalModel extends HoistModel {

    navigatorModel;
    @observable backProgress = null;
    @observable refreshProgress = null;

    @computed get backStarted()         {return isFinite(this.backProgress)}
    @computed get backCompleted()       {return this.backProgress === 1}
    @action backStart()                 {this.backProgress = 0}
    @action backEnd()                   {this.backProgress = null}

    @computed get refreshStarted()      {return isFinite(this.refreshProgress)}
    @computed get refreshCompleted()    {return this.refreshProgress === 1}
    @action refreshStart()              {this.refreshProgress = 0}
    @action refreshEnd()                {this.refreshProgress = null}

    onLinked() {
        makeObservable(this);
        this.navigatorModel = this.lookupModel(NavigatorModel);
    }

    @action
    onDragStart = (e) => {
        const {navigatorModel} = this,
            {direction} = e.nativeEvent.gesture;

        this.refreshEnd();
        this.backEnd();

        // Back
        // Check we have a page to nav to and avoid conflict with browser back
        if (
            direction === 'right' &&
            navigatorModel.swipeToGoBack &&
            navigatorModel.stack.length >= 2 &&
            e.nativeEvent.gesture.startEvent.center.pageX > 20 &&
            !this.isDraggingChild(e, 'right')
        ) {
            this.backStart();
            consumeEvent(e);
            return;
        }

        // Refresh
        if (
            direction === 'down' &&
            navigatorModel.pullDownToRefresh &&
            !this.isDraggingChild(e, 'down')
        ) {
            this.refreshStart();
            consumeEvent(e);
            return;
        }
    }

    @action
    onDrag = (e) => {
        const {direction, deltaX, deltaY} = e.gesture;

        // For either gesture we set normalised progress based on distance dragged, or kill it

        // Back
        if (this.backStarted) {
            if (direction !== 'right') {
                this.backEnd();
                return;
            }
            this.backProgress = Math.clamp(deltaX / 150, 0, 1);
            consumeEvent(e);
            return;
        }

        // Refresh
        if (this.refreshStarted) {
            if (direction !== 'down') {
                this.refreshEnd();
                return;
            }
            this.refreshProgress = Math.clamp(deltaY / 150, 0, 1);
            consumeEvent(e);
            return;
        }
    }

    @action
    onDragEnd = (e) => {
        // Back
        if (this.backStarted) {
            if (this.backCompleted) XH.popRoute();
            this.backEnd();
            consumeEvent(e);
        }

        // Refresh
        if (this.refreshStarted) {
            if (this.refreshCompleted) XH.refreshAppAsync();
            this.refreshEnd();
            consumeEvent(e);
        }
    }

    isDraggingChild(e, dir) {
        // Loop through the touch targets to ensure it is safe to swipe
        for (let el = e.target; el && el !== document.body; el = el.parentNode) {

            // Don't conflict with grid header reordering or chart dragging.
            if (el.classList.contains('xh-grid-header') ||
                el.classList.contains('xh-chart')) {
                return true;
            }

            // Ensure any scrolling element in the target path takes priority over swipe navigation.
            if (dir === 'right' && el.scrollWidth > el.offsetWidth && el.scrollLeft > 0 ||
                dir === 'down' && el.scrollHeight > el.offsetHeight && el.scrollTop > 0) {
                return true;
            }
        }
        return false;
    }
}