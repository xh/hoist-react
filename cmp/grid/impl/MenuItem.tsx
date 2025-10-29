import React from 'react';
import {useGridMenuItem} from 'ag-grid-react';

export default ({text, icon, subMenu, shortcut}) => {
    useGridMenuItem({
        configureDefaults: () => true
    });

    return (
        <div>
            <span className="ag-menu-option-part ag-menu-option-icon" role="presentation">
                {icon}
            </span>
            <span className="ag-menu-option-part ag-menu-option-text">{text}</span>
            <span className="ag-menu-option-part ag-menu-option-shortcut">{shortcut}</span>
            <span className="ag-menu-option-part ag-menu-option-popup-pointer">
                {subMenu && (
                    <span
                        className="ag-icon ag-icon-small-right"
                        unselectable="on"
                        role="presentation"
                    ></span>
                )}
            </span>
        </div>
    );
};
