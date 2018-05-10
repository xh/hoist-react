(function(window) {
    var hasNativePromiseSupport = window.Promise !== undefined && window.Promise !== null && Object.prototype.toString.call(window.Promise.resolve()) === '[object Promise]';
    var hasNativePromiseFinallySupport = hasNativePromiseSupport && window.Promise.prototype.finally !== undefined;

    if (!hasNativePromiseFinallySupport) {
        document.body.style.backgroundColor = '#d9d9d9';
        document.body.innerHTML = '<div style="margin:20px auto; font-family: sans-serif; width:400px">This browser is not supported.<br />Please use the Chrome browser to access this app.</div>';
        try {window.stop()} catch (e) {}
        try {document.execCommand('Stop')} catch (e) {}
    }
})(window);