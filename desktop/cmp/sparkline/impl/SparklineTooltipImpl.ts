/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import type {HTMLAttributes, ReactElement, Ref} from 'react';
import {useEffect, useRef, useState} from 'react';

/** Props for the element that shows the tooltip, to spread onto it. */
export type SparklineTooltipTargetProps = HTMLAttributes<HTMLElement> & {ref?: Ref<HTMLElement>};

interface SparklineTooltipImplProps extends HoistProps {
    /** Builds the content. Called only once the sparkline has been hovered. */
    getContent: () => ReactElement | string;

    /** Renders the sparkline itself, with props the tooltip needs on it. */
    renderTarget: (targetProps: SparklineTooltipTargetProps) => ReactElement;
}

/** Matches the Blueprint Tooltip default, so the first open feels like every later one. */
const HOVER_OPEN_DELAY = 100;

/**
 * Desktop implementation of a Sparkline's tooltip, shown in a Blueprint tooltip.
 *
 * Sparklines often render in every row of a grid, so this mounts no tooltip until the pointer
 * first rests on the sparkline. Until then it renders the sparkline with two mouse handlers. On
 * the first hover it swaps in a Blueprint tooltip, opened, which then handles later hovers itself.
 * @internal
 */
export const sparklineTooltipImpl = hoistCmp.factory<SparklineTooltipImplProps>({
    displayName: 'SparklineTooltip',
    model: false,
    observer: false,

    render({getContent, renderTarget}) {
        const [armed, setArmed] = useState(false),
            timer = useRef<number>(null),
            latestGetContent = useRef(getContent),
            // Content built to decide whether to arm, reused by the first armed render.
            probed = useRef<ReactElement | string>(null),
            cancel = () => window.clearTimeout(timer.current);

        latestGetContent.current = getContent;
        useEffect(() => cancel, []);

        if (!armed) {
            return renderTarget({
                onMouseEnter: () => {
                    cancel();
                    timer.current = window.setTimeout(() => {
                        // Stay unarmed while there is nothing to show, so a later hover tries again.
                        probed.current = contentOf(latestGetContent.current);
                        if (probed.current != null) setArmed(true);
                    }, HOVER_OPEN_DELAY);
                },
                onMouseLeave: cancel
            });
        }

        const content = probed.current ?? contentOf(getContent);
        probed.current = null;

        // Once armed, stay mounted even if the content goes empty. Blueprint then shows no tooltip,
        // and a remount would open it again while the pointer is elsewhere.
        return bpTooltip({
            content,
            defaultIsOpen: true,
            openOnTargetFocus: false,
            renderTarget: ({isOpen, ...targetProps}) => renderTarget(targetProps)
        });
    }
});

function contentOf(getContent: () => ReactElement | string): ReactElement | string {
    const content = getContent();
    return content === '' ? null : content;
}
