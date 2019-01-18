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
     host       =       'https://login.eagleeyenetworks.com';

var curr_user   =       {},
    users       =       {},
    devices     =       [],
    cameras     =       [],
    bridges     =       [],
    auth_key    =       undefined;


var startup_items = [
    function() { een.login({'username': config.username, 'password': config.password}, postLogin, failure); },
    function() { een.getDeviceList({}, postGetDevices, failure); },
    function() { buildPollQuery(); }
];


function execute_next_step() {
    if(startup_items.length > 0)  { 
        startup_items.shift()();
    } else {
        // console.log("Error: execute_next_step ran out of startup_items items")
    }
}



/***************
*** Normal Handlers
***************/


function postLogin(data) { 
    console.log(data.statusCode + ': successfully logged-in');
    cookie_jar = een.export_cookie_jar();
    curr_user = data.body;
    execute_next_step();
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
    execute_next_step();
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

    console.log("calling een.subscribeWSPollStream");
    een.subscribeWSPollStream(obj, processWSMessage, processWSError);
    execute_next_step();
}


function processWSMessage(data) {
    // console.log("called form postSubscribe");
    console.log('WS message: ', data);
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


execute_next_step();




