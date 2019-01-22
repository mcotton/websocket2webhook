
exports.onComplete = function(job, result) {

};

exports.onFailedAttempt = function(job, errorMessage, doneAttempts) {

};

exports.onFailed = function(job, errorMessage) {
    
};

exports.onProgress = function(job, progress, data) {
    
};

exports.doSomething = function(job, done) {
    // this is where the magic happens
    console.log("*** Called from exports.doSomething ***")
    setTimeout(done, 3000);
};
