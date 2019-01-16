var r           =       require('request'),
    u           =       require('underscore')._,
    kue         =       require('kue'),
    ws          =       require('ws'),
    express     =       require('express');


var queue       =       kue.createQueue();






// start the UI
var app = express();
app.use( kue.app );
app.listen( 3000 );
console.log( 'UI started on port 3000' );