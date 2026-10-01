/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {filler, fragment, span} from '@xh/hoist/cmp/layout';
import {getZoomOptions} from '@xh/hoist/cmp/pdfviewer/impl/ZoomOptions';
import type {PdfViewerModel} from '@xh/hoist/cmp/pdfviewer/PdfViewerModel';
import type {PdfViewerToolbarItem} from '@xh/hoist/cmp/pdfviewer/Types';
import {hoistCmp, HoistModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {isString} from 'lodash';
import type {ReactNode} from 'react';

/**
 * Desktop implementation of the PdfViewer toolbar.
 *
 * Note that this module is installed by the desktop AppContainer and must not import
 * PdfViewerModel at runtime, which would bring pdf.js into every app's build.
 *
 * @internal
 */
export const pdfViewerToolbarImpl = hoistCmp.factory<PdfViewerModel>({
    model: uses((m: HoistModel) => m['isPdfViewerModel']),

    render({model}) {
        return toolbar({
            className: 'xh-pdf-viewer__toolbar',
            compact: true,
            items: model.toolbar.map((item, idx) => renderItem(item, idx, model))
        });
    }
});

function renderItem(item: PdfViewerToolbarItem, key: number, model: PdfViewerModel): ReactNode {
    if (!isString(item)) return item;
    switch (item) {
        case 'pageNav':
            return pageNav({key, model});
        case 'zoom':
            return zoom({key, model});
        case 'find':
            return find({key, model});
        case 'rotate':
            return rotate({key, model});
        case 'download':
            return download({key, model});
        case '-':
            return toolbarSep({key});
        case 'filler':
            return filler({key});
        default:
            return item;
    }
}

const pageNav = hoistCmp.factory<PdfViewerModel>(({model}) => {
    const {pageNumber, pageCount, hasDocument} = model;
    return fragment(
        button({
            icon: Icon.chevronLeft(),
            title: 'Previous page',
            disabled: !model.canGoPrevious,
            onClick: () => model.previousPage()
        }),
        numberInput({
            className: 'xh-pdf-viewer__page-input',
            width: 50,
            value: hasDocument ? pageNumber : null,
            disabled: !hasDocument,
            selectOnFocus: true,
            onCommit: v => model.goToPage(v)
        }),
        span({className: 'xh-pdf-viewer__page-count', item: `/ ${pageCount}`}),
        button({
            icon: Icon.chevronRight(),
            title: 'Next page',
            disabled: !model.canGoNext,
            onClick: () => model.nextPage()
        })
    );
});

const zoom = hoistCmp.factory<PdfViewerModel>(({model}) => {
    const disabled = !model.hasDocument;
    return fragment(
        button({
            icon: Icon.zoomOut(),
            title: 'Zoom out',
            disabled,
            onClick: () => model.zoomOut()
        }),
        select({
            width: 115,
            value: model.scale,
            options: getZoomOptions(model),
            enableFilter: false,
            hideSelectedOptionCheck: true,
            disabled,
            onChange: v => model.setScale(v)
        }),
        button({
            icon: Icon.zoomIn(),
            title: 'Zoom in',
            disabled,
            onClick: () => model.zoomIn()
        })
    );
});

const find = hoistCmp.factory<PdfViewerModel>(({model}) => {
    const {findQuery, findMatchCount, findMatchNumber, hasDocument} = model;
    return fragment(
        textInput({
            bind: 'findQuery',
            width: 180,
            placeholder: 'Find...',
            leftIcon: Icon.search(),
            enableClear: true,
            commitOnChange: true,
            disabled: !hasDocument,
            onKeyDown: e => {
                if (e.key !== 'Enter') return;
                if (e.shiftKey) {
                    model.findPrevious();
                } else {
                    model.findNext();
                }
            }
        }),
        span({
            className: 'xh-pdf-viewer__find-count',
            item: findMatchCount
                ? `${findMatchNumber} / ${findMatchCount}`
                : span({className: 'xh-text-color-muted', item: 'No results'}),
            omit: !findQuery
        }),
        button({
            icon: Icon.arrowUp(),
            title: 'Find previous (shift+enter)',
            disabled: !findMatchCount,
            onClick: () => model.findPrevious(),
            omit: !findQuery
        }),
        button({
            icon: Icon.arrowDown(),
            title: 'Find next (enter)',
            disabled: !findMatchCount,
            onClick: () => model.findNext(),
            omit: !findQuery
        })
    );
});

const rotate = hoistCmp.factory<PdfViewerModel>(({model}) =>
    button({
        icon: Icon.rotateRight(),
        title: 'Rotate clockwise',
        disabled: !model.hasDocument,
        onClick: () => model.rotate()
    })
);

const download = hoistCmp.factory<PdfViewerModel>(({model}) =>
    button({
        icon: Icon.download(),
        title: 'Download',
        disabled: !model.hasDocument,
        onClick: () => model.downloadAsync().catchDefault()
    })
);
