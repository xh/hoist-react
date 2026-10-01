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
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {select, textInput} from '@xh/hoist/mobile/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/mobile/cmp/toolbar';
import '@xh/hoist/mobile/register';
import {isString} from 'lodash';
import type {ReactNode} from 'react';

/**
 * Mobile implementation of the PdfViewer toolbar.
 *
 * Note that this module is installed by the mobile AppContainer and must not import
 * PdfViewerModel at runtime, which would bring pdf.js into every app's build.
 *
 * @internal
 */
export const pdfViewerToolbarImpl = hoistCmp.factory<PdfViewerModel>({
    model: uses((m: HoistModel) => m['isPdfViewerModel']),

    render({model}) {
        return toolbar({
            className: 'xh-pdf-viewer__toolbar',
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
            return button({
                key,
                icon: Icon.rotateRight(),
                disabled: !model.hasDocument,
                onClick: () => model.rotate()
            });
        case 'download':
            return button({
                key,
                icon: Icon.download(),
                disabled: !model.hasDocument,
                onClick: () => model.downloadAsync().catchDefault()
            });
        case '-':
            return toolbarSep({key});
        case 'filler':
            return filler({key});
        default:
            return item;
    }
}

const pageNav = hoistCmp.factory<PdfViewerModel>(({model}) =>
    fragment(
        button({
            icon: Icon.chevronLeft(),
            disabled: !model.canGoPrevious,
            onClick: () => model.previousPage()
        }),
        span({
            className: 'xh-pdf-viewer__page-count',
            item: model.hasDocument ? `${model.pageNumber} / ${model.pageCount}` : null
        }),
        button({
            icon: Icon.chevronRight(),
            disabled: !model.canGoNext,
            onClick: () => model.nextPage()
        })
    )
);

const zoom = hoistCmp.factory<PdfViewerModel>(({model}) =>
    select({
        width: 110,
        value: model.scale,
        options: getZoomOptions(model),
        enableFilter: false,
        disabled: !model.hasDocument,
        onChange: v => model.setScale(v)
    })
);

const find = hoistCmp.factory<PdfViewerModel>(({model}) => {
    const {findQuery, findMatchCount, findMatchNumber, hasDocument} = model;
    return fragment(
        textInput({
            bind: 'findQuery',
            flex: 1,
            placeholder: 'Find...',
            enableClear: true,
            commitOnChange: true,
            disabled: !hasDocument
        }),
        span({
            className: 'xh-pdf-viewer__find-count',
            item: `${findMatchNumber} / ${findMatchCount}`,
            omit: !findQuery
        }),
        button({
            icon: Icon.arrowDown(),
            disabled: !findMatchCount,
            onClick: () => model.findNext(),
            omit: !findQuery
        })
    );
});
