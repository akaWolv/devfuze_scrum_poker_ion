angular.module('devfuze_poker.services', [])

.factory('Team', function() {
    return {
        load: function() {
            var details = window.localStorage['team_details'];
            if (details) {
                return angular.fromJson(details);
            }
            return {name : undefined, pass: undefined};
        },
        save: function(name, pass) {
            window.localStorage['team_details'] = angular.toJson({name : name, pass: pass});
        }
    }
})
.factory('User', function() {
    return {
        load: function() {
            var details = window.localStorage['user_details'];
            if (details) {
                return angular.fromJson(details);
            }
            return {name : undefined, email: undefined};
        },
        save: function(name, email) {
            window.localStorage['user_details'] = angular.toJson({name : name, email: email});
        }
    }
})

.factory('socket', function ($rootScope, $location, $timeout, $window) {
    var socket_host = $location.host() + ':3003';

    if ('undefined' === typeof io) {
        $rootScope.error_notification = {
            show: true,
            text: 'Socket went away :( refreshing in 5 seconds...'
        };

        $rootScope.socket_available = false;

        $timeout(function(){ $window.location.reload() }, 5000);

        return false;
    }

    $rootScope.socket_available = true;

    var failures = 0,
        socket = io.connect(socket_host);

    socket.on('connect_error', function () {
        failures += 1;
        $rootScope.error_notification = {
            show: true,
            text:   'Socket went away :( ' +
            'reconnecting... '
            //+
            //(failures > 1 ? failures : '')
        }
    });

    socket.on('connect', function () {
        // reset failures
        failures = 0;
        // hide error blend
        $rootScope.error_notification.show = false;
        //// check if user is registered
        //if (angular.isDefined($rootScope.ConnectionData.picked_team) || angular.isDefined($rootScope.ConnectionData.user_email)) {
        //    // check if user is registered
        //    socket.emit('who am i');
        //}
    });

    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {

            socket.emit(eventName, data, callback);

            //socket.emit(eventName, data, function () {
            //    var args = arguments;
            //    $rootScope.$apply(function () {
            //        if (callback) {
            //            callback.apply(socket, args);
            //        }
            //    });
            //});
        }
    };
});