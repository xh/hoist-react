
import {Component} from 'react';
import {elemFactory} from 'hoist';
import {filler} from 'hoist/layout';
import {button, dialog, dialogBody, dialogFooter, dialogFooterActions} from 'hoist/kit/blueprint';


class ConfirmDialog extends Component {

    render() {
        return dialog({
            isOpen: this.props.needConfirm,
            isCloseButtonShown: false,
            title: 'Confirm',
            items: [
                dialogBody(this.props.warning),
                dialogFooter(
                    dialogFooterActions(this.getConfirmButtons())
                )
            ]
        });
    }

    getConfirmButtons() {
        return [
            filler(),
            button({
                text: 'Yes',
                onClick: this.props.onConfirm
            }),
            button({
                text: 'No',
                onClick: this.props.onReject
            }),
            filler()
        ];
    }
};

export const confirmDialog = elemFactory(ConfirmDialog);