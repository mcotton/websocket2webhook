
var request = require('request'),
    config =  require('./config');


exports.doSomething = function(job, done) {
    // this is where the magic happens
    // remember to call done()

    if(config.debug) {
        console.log("pulling item off of queue...");
    }
    setTimeout(function() {
        done();
    }, 5000);

};


exports.onComplete = function(job, result) {
    if(config.debug) {
        console.log("...done");
    }

};

exports.onFailedAttempt = function(job, errorMessage, doneAttempts) {
    if(config.debug) {
        console.log("...failed attempt...");
    }

};

exports.onFailed = function(job, errorMessage) {
    if(config.debug) {
        console.log("...failed");
    }
    
};

exports.onProgress = function(job, progress, data) {
    if(config.debug) {
        console.log("...progress is happening...");
    }
    
};
