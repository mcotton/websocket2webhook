## Websocket to Webhook ##

###Introduction###
This is an example of subscribing to the [Eagle Eye Video API](https://een.com) in order to monitor status of cameras and bridges.  This example uses [websocket polling](https://apidocs.eagleeyenetworks.com/apidocs/#websocket-polling).  It will look for events the user cares about and store them inside of a queue.  The workers pull items off the queue and send them as webhooks.

###Requirements###
This example is written in Node.js and uses Redis but there is nothing special about this combination and could be replicated in another technology.

###Installation###
- clone this repo
- run `npm install`
- create `config.js` with your credentials
- edit `worker.js` with any additional programming

###Configuration###
You will need to add valid Eagle Eye crendentials in order to use this.  Please add them into `config.js`.  An example version of it is included below for reference.

```
module.exports = {

        // credentials for the app to use
        'username': <email>,
        'password': <password>,
        'api_key': <api_key>,

        // where to save the auth file
        'cookie_path': './cookie.json',

        // port for the Kue UI
        'port': 3000,

        // how many workers should we spawn
        'number_of_workers': 1,

        // what events should we listen for
        'listen_for_recordings': false,
        'listen_for_camera_on': true,
        'listen_for_streaming': true,
        'listen_for_registered': true,

        // turn on and off specific logging
        'debug': false,
        'info': true


    }
```

###Customization###
The primary area to add your own customizations is in `worker.js`.  The `doSomething` hook that runs on every item enqueued.  It is very important that you call `done()` when you are finished processesing each item.

There are hooks provided for all the queue events (complete, failed, failed attempt, progress).  You can add your own logic to if you want to be notified of failed webhooks or if you want to keep additional logging.
