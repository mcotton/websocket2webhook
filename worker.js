
var request = require('request'),
    config =  require('./config');


exports.doSomething = function(job, done) {
    // this is where the magic happens
    // remember to call done()

    request.post({
        url: config.webhook_url,
        json: true,
        body: job.data
        }, function(err, res, body) {
            if (err) { console.log(err,res,body); }
            if (!err) {
                if(config.debug) console.log('Called webhook and received status code: ' + res.statusCode);
                switch(res.statusCode) {
                    case 200:
                        done();
                        break;
                    case 301:
                    case 302:
                    case 400:
                    case 401:
                    case 404:
                    case 500:
                    case 502:
                    case 503:
                    default:
                        done(new Error(res.statusCode));
                        break;
                }
                
            }
        });

};


exports.onComplete = function(job, result) {

};

exports.onFailedAttempt = function(job, errorMessage, doneAttempts) {

};

exports.onFailed = function(job, errorMessage) {
    
};

exports.onProgress = function(job, progress, data) {
    
};
