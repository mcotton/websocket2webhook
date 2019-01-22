var r           =       require('request'),
    u           =       require('underscore')._,
    kue         =       require('kue'),
    ws          =       require('ws'),
    express     =       require('express');


var queue       =       kue.createQueue();

var cookie_jar  =       r.jar();

var  out        =       console.log,
     config     =       require('./config'),
     een        =       require('./een'),
     worker     =       require('./worker'),
     host       =       'https://login.eagleeyenetworks.com';

var curr_user   =       {},
    users       =       {},
    devices     =       [],
    deviceStatus =      {},
    cameras     =       [],
    bridges     =       [],
    auth_key    =       undefined;


var startup_items = [
    function() { een.login({'username': config.username, 'password': config.password}, postLogin, failure); },
    function() { een.getDeviceList({}, postGetDevices, failure); },
    function() { buildPollQuery(); }
];


function executeNextStep() {
    if(startup_items.length > 0)  { 
        startup_items.shift()();
    } else {
        // console.log("Error: executeNextStep ran out of startup_items items")
    }
}


/***************
*** Setting up the kue
****************/


function createNewJob(type, opts) {
    var job = queue.create(type, opts).ttl(10000).save( function(err) {
        if ( err ) { console.log("Error creating job ", err); }
        if ( !err ) {
            //console.log("Successfully create job: " + job.id);
        }
    })


    job.on('complete', function(result){
        //console.log('Job completed with data ', result);
        worker.onComplete(job, result);

    }).on('failed attempt', function(errorMessage, doneAttempts){
      console.log('Job failed attempt ', job.id);
      worker.onFailedAttempt(job, errorMessage, doneAttempts);

    }).on('failed', function(errorMessage){
      console.log('Job failed ', job.id);
      worker.onFailed(job, errorMessage);

    }).on('progress', function(progress, data){
      console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );
      worker.onProgress(job, progress, data);
    });
}


queue.on('job enqueue', function(id, type){
  //console.log( 'Job %s got queued of type %s', id, type );

}).on('job complete', function(id, result){
  // kue.Job.get(id, function(err, job){
  //   if (err) return;
  //   job.remove(function(err){
  //     if (err) throw err;
  //     //console.log('removed completed job #%d', job.id);
  //   });
  // });

}).on( 'error', function( err ) {
  console.log( 'Kue: Oops... ', err );
});


// Graceful Shutdown
process.once( 'SIGTERM', function ( sig ) {
  queue.shutdown( 5000, function(err) {
    console.log( 'Kue shutdown: ', err || '' );
    process.exit( 0 );
  });
});

process.once( 'SIGINT', function ( sig ) {
  queue.shutdown( 5000, function(err) {
    console.log( 'Kue shutdown: ', err || '' );
    process.exit( 0 );
  });
});

process.once( 'uncaughtException', function(err){
  console.error( 'Something bad happened: ', err );
  queue.shutdown( 5000, function(err2){
    console.error( 'Kue shutdown result: ', err2 || 'OK' );
    process.exit( 0 );
  });
});


/**************
*** Process the job
**************/

queue.process('status', 1, function(job, done) {
    worker.doSomething(job, done);
});



/***************
*** Normal Handlers
***************/


function postLogin(data) { 
    console.log(data.statusCode + ': successfully logged-in');
    cookie_jar = een.export_cookie_jar();
    curr_user = data.body;
    executeNextStep();
}


function postGetDevices(data) {
    console.log(data.statusCode + ': successfully got device list');
    devices = JSON.parse(data.body);
    
    u.each(devices, function(item) {
        if(item[3] === 'camera') {
            cameras.push(item);
        } else if (item[3] === 'bridge') {
            bridges.push(item);
        }
    });
    executeNextStep();
}


function buildPollQuery() {
    var obj = { 'poll': { 'cameras': {} }, 'data': {} };

    u.each(u.filter(cameras, function(item) { return item[5] === 'ATTD' } ), function(item) {
        obj.poll.cameras[item[1]] = { "resource": ["status"] };
    });

    ee_cookie = een.cookie_jar._jar.store['idx']['eagleeyenetworks.com']['/']['videobank_sessionid'];
    auth_key = ee_cookie.toString().match(/videobank_sessionid=(c\d*~\w*;)/)[1];

    obj.data.auth_key = auth_key;
    obj.data.active_brand_subdomain = curr_user['active_brand_subdomain'];
    obj.data.active_account_id = curr_user['active_account_id'];

    //console.log("calling een.subscribeWSPollStream");
    een.subscribeWSPollStream(obj, processWSMessage, processWSError);
    console.log('Subscribing to WS Poll Stream')
    executeNextStep();
}


function processWSMessage(data) {
    // console.log("called form postSubscribe");
    //console.log('WS message: ', data);
    compareDeviceStatus(JSON.parse(data));

}


function compareDeviceStatus(data) {
    //console.log('Calling compareDeviceStatus');
    var message = data.data;
    var statusText = '';

    for (var item in message) {

        if(deviceStatus[item] == undefined) {
            //console.log('deviceStatus[item] is undefined ', item);
            deviceStatus[item] = message[item]['status'];
            return
        }

        var oldStatus = deviceStatus[item];
        var newStatus = message[item]['status'];

        // console.log("oldStatus: ", oldStatus);
        // console.log("newStatus: ", newStatus);

        if(oldStatus != newStatus) {
            //console.log(item + ' status has changed...', oldStatus, newStatus);

            var oldStatusObj = parseStatus(item, oldStatus);
            var newStatusObj = parseStatus(item, newStatus);

            if(newStatusObj['invalid']) {
                // ignore this update that are marked as invalid
                //console.log('  -> status update marked as invalid', oldStatusObj);
            } else {

                newStatusObj['title'] = undefined;

                // if(oldStatusObj['recording'] != newStatusObj['recording']) {
                //     //console.log('recording has changed');
                //     newStatusObj['title'] = newStatusObj['recording'] ? item + " is now recording" : item + " has stopped recording";
                //     createNewJob('status', newStatusObj);
                // } else {
                //     //console.log("Recording: ", oldStatusObj['recording'], newStatusObj['recording']);
                // }

                if(oldStatusObj['camera_on'] != newStatusObj['camera_on']) {
                    newStatusObj['title'] =  newStatusObj['camera_on'] ? item + " is now on" : item + " has turned off";
                    createNewJob('status', newStatusObj);
                }

                if(oldStatusObj['streaming'] != newStatusObj['streaming']) {
                    newStatusObj['title'] =  newStatusObj['streaming'] ? item + " is now streaming" : item + " has stoped streaming";
                    createNewJob('status', newStatusObj);
                }

                if(oldStatusObj['registered'] != newStatusObj['registered']) {
                    newStatusObj['title'] =  newStatusObj['registered'] ? item + " is now registered" : item + " is no longer registered";
                    createNewJob('status', newStatusObj);
                }

                if(newStatusObj['title']) {
                    console.log(newStatusObj['title']);
                }

                //createNewJob('status', newStatusObj);
            }

            // update the status for the next status change
            deviceStatus[item] = message[item]['status'];

        } else {
            // do nothing
            console.log("do nothing ", oldStatus, newStatus);
        }
        
    }

}


function parseStatus(item, status) {
    var status_bits = []
    var status_bit_length = 21;

    for(var i = 0; i < status_bit_length; i++) {
      status_bits.push((parseInt(status) & (1 << status_bit_length - i - 1)) ? true : false);  
    }

    status_bits.reverse();

    var first_thirteen_invalid = status_bits[13] ? true : false;

    var invalid = (status_bits[16]) ? true : false;

    var returned_obj = {
            // cameraStatusDisplayType = 2
                'device': item,
                'status': status,
                'invalid': invalid,
                'camera_on': !(invalid) ? status_bits[17] : false,
                'streaming': !(invalid) ? status_bits[18] : false,
                'recording': !(invalid) ? status_bits[19] : false,
                'registered': !(invalid) ? status_bits[20] : false
            };
    //.console.log("finished parseStatus");
    return returned_obj;
    
}



/***************
*** Error Handlers
***************/

function failure(data) {
    console.log(data);
}

function processWSError(data) {
    console.log("Error from processWSError: ", data);
}




// start the UI
var app = express();
app.use( kue.app );
app.listen( 3000 );
console.log( 'UI started on port 3000' );


executeNextStep();




