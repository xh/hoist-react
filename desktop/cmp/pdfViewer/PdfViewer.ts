import {fragment, hspacer} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {PdfViewerModel} from '@xh/hoist/desktop/cmp/pdfViewer/PdfViewerModel';
import {elementFactory, hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {numberInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {Document, Page} from 'react-pdf';
import {spinner} from '@xh/hoist/cmp/spinner';
import './PdfViewer.scss';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

const document = elementFactory(Document);
const page = elementFactory(Page);

export const pdfViewer = hoistCmp.factory({
    model: uses(PdfViewerModel),
    render({model}) {
        return panel({
            items: [
                toolbar({
                    items: [pageNavigator()]
                }),
                document({
                    file: model.document,
                    onLoadSuccess: pdfData => model.onDocumentLoadSuccess(pdfData),
                    items: [
                        page({
                            pageNumber: model.currentPage,
                            loading: spinner()
                        })
                    ]
                })
            ]
        });
    }
});

const pageNavigator = hoistCmp.factory({
    model: uses(PdfViewerModel),
    render({model}) {
        return fragment(
            button({
                icon: Icon.arrowLeft(),
                onClick: () => model.toPrevPage(),
                disabled: model.currentPage === 1
            }),
            numberInput({
                value: model.currentPage,
                onChange: newPage => model.setPage(newPage),
                className: getClassName('page-input'),
                min: 1,
                max: model.pageCount
            }),
            hspacer(5),
            `/ ${model.pageCount}`,
            button({
                icon: Icon.arrowRight(),
                onClick: () => model.toNextPage(),
                disabled: model.currentPage === model.pageCount
            })
        );
    }
});

const getClassName = (subClass: string): string => {
    return `xh-pdf-viewer__${subClass}`;
};
