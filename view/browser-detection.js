(function(window) {
    var validBrowser = window.Promise !== undefined && window.Promise !== null && Object.prototype.toString.call(window.Promise.resolve()) === '[object Promise]';
    if (!validBrowser) {
        document.body.style.backgroundColor = '#d9d9d9';
        document.body.innerHTML = '<div style="margin:20px auto; font-family: sans-serif; width:400px">This browser is not supported.<br />Please use the Chrome browser to access this app.</div>';
        try {window.stop()} catch (e) {document.execCommand('Stop')}
    }
})(window);