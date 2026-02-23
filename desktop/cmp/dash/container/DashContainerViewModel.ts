import {DashContainerViewSpec, DashViewModel} from '@xh/hoist/desktop/cmp/dash';
import {DashViewConfig} from '../DashViewModel';

/**
 * Model for a content item within a DashContainer.
 */
export class DashContainerViewModel extends DashViewModel<DashContainerViewSpec> {
    hostNode: HTMLElement = this.createHostNode();

    constructor(cfg: DashViewConfig<DashContainerViewSpec>) {
        super(cfg);
        this.addReaction({
            track: () => this.viewRef.current,
            run: elem => {
                if (elem) {
                    elem.appendChild(this.hostNode);
                    window.dispatchEvent(new Event('resize'));
                }
            },
            debounce: 0
        });
    }

    override destroy() {
        this.hostNode.remove();
        super.destroy();
    }

    //------------------
    // Implementation
    //------------------
    /**
     * @returns Empty div set to inherit all styling from its parent
     */
    private createHostNode(): HTMLElement {
        const hostNode = document.createElement('div');
        hostNode.style.all = 'inherit';
        hostNode.classList.add('xh-dash-tab__content');
        return hostNode;
    }
}
