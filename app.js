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
    devices     =       {},
    cameras     =       {},
    bridges     =       {};


var starting_lineup = [
    function() { een.login({'username': config.username, 'password': config.password}, postLogin, failure); },
    function() { een.getDeviceList({}, postGetDevices, failure); }
];


function execute_next_step() {
    if(starting_lineup.length > 0)  { 
        starting_lineup.shift()();
    } else {
        console.log("Error: execute_next_step ran out of starting_lineup items")
    }
}


function postLogin(data) { 
    console.log(data.statusCode + ': successfully logged-in');
    cookie_jar = een.export_cookie_jar();
    curr_user = data.body;
    execute_next_step();
}


function postGetDevices(data) {
    console.log(data.statusCode + ': successfully got device list');
    devices = data.body;
    u.each(devices, function(item) {
        if(item[3] === 'camera') {
            cameras.push(item);
        } else if (item[3] === 'bridge') {
            bridges.push(item);
        }
    });
    execute_next_step();
}


function failure(data) {
    console.log(data.statusCode + ': failure handler');
}




// start the UI
var app = express();
app.use( kue.app );
app.listen( 3000 );
console.log( 'UI started on port 3000' );


execute_next_step();




