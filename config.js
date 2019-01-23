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
