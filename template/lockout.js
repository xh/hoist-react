(function(W) {
    var D = document, PRM = W.Promise,
        hasPromise = PRM !== undefined && 
            PRM !== null && 
            Object.prototype.toString.call(PRM.resolve()) === '[object Promise]' &&
            PRM.prototype.finally !== undefined;

    if (!hasPromise) {
        D.body.style.backgroundColor = '#d9d9d9';
        D.body.innerHTML = '<div style="margin:20px auto; font-family: sans-serif; width:400px; text-align:center;">This browser is not supported.<br />Please use the Chrome browser to access this app.</div>';
        try {W.stop()} catch (e) {}
        try {D.execCommand('Stop')} catch (e) {}
    }
})(window);