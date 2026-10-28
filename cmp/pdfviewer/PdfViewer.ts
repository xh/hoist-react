/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {errorMessage} from '@xh/hoist/cmp/error';
import {box, div, placeholder, vbox} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/cmp/mask';
import {hoistCmp, HoistProps, LayoutProps, TestSupportProps, uses, XH} from '@xh/hoist/core';
import {pdfViewerToolbarImpl as desktopToolbarImpl} from '@xh/hoist/dynamics/desktop';
import {pdfViewerToolbarImpl as mobileToolbarImpl} from '@xh/hoist/dynamics/mobile';
import {Icon} from '@xh/hoist/icon';
import {
    getLayoutProps,
    useComposedRefs,
    useOnResize,
    useOnVisibleChange
} from '@xh/hoist/utils/react';
import {PdfViewerModel} from './PdfViewerModel';
import './PdfViewer.scss';

export interface PdfViewerProps extends HoistProps<PdfViewerModel>, LayoutProps, TestSupportProps {}

/**
 * Displays a PDF document with a built-in toolbar for page navigation, zoom, find, and
 * download. Pages render on demand as they scroll into view, with selectable text.
 *
 * Configure the document and toolbar via the backing {@link PdfViewerModel}.
 *
 * @see PdfViewerModel
 */
export const [PdfViewer, pdfViewer] = hoistCmp.withFactory<PdfViewerProps>({
    displayName: 'PdfViewer',
    model: uses(PdfViewerModel),
    className: 'xh-pdf-viewer',

    render({model, className, testId, ...props}, ref) {
        ref = useComposedRefs(
            ref,
            useOnResize(() => model.onResize(), {debounce: 100}),
            useOnVisibleChange(visible => visible && model.onResize())
        );

        // Default flex = 1 if no dimensions / flex specified.
        const layoutProps = getLayoutProps(props);
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 1;
        }

        const toolbarImpl = XH.isMobileApp ? mobileToolbarImpl : desktopToolbarImpl;

        return vbox({
            ...layoutProps,
            className,
            testId,
            ref,
            items: [
                model.toolbar && model.hasSource ? toolbarImpl({model}) : null,
                box({
                    className: 'xh-pdf-viewer__body',
                    flex: 1,
                    items: [
                        // pdf.js requires an absolutely positioned scroll container.
                        div({
                            className: 'xh-pdf-viewer__container',
                            ref: model.containerRef,
                            tabIndex: 0,
                            style: {visibility: model.hasDocument ? 'visible' : 'hidden'},
                            item: div({className: 'pdfViewer'})
                        }),
                        statusCmp(),
                        mask({bind: model.loadObserver, spinner: true})
                    ]
                })
            ]
        });
    }
});

const statusCmp = hoistCmp.factory<PdfViewerModel>(({model}) => {
    const {hasSource, lastLoadException, loadObserver, emptyText} = model;

    if (!hasSource) {
        return placeholder({
            className: 'xh-pdf-viewer__placeholder',
            items: [Icon.filePdf(), emptyText]
        });
    }

    if (lastLoadException && !loadObserver.isPending) {
        return errorMessage({
            className: 'xh-pdf-viewer__error',
            title: 'Unable to display document',
            error: lastLoadException,
            actionFn: () => model.refreshAsync()
        });
    }

    return null;
});
