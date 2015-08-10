// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('DevfuzePoker', ['ionic', 'devfuze_poker.controllers', 'devfuze_poker.services'])

    .run(function ($ionicPlatform, $rootScope, $state, socket, Team, User) {

        $rootScope.goToState = function(toState) {
            $state.go(toState);
        }

        $rootScope.teamAdminRole = false;

        var teamDetails = Team.load();
        $rootScope.teamName = teamDetails.name;
        $rootScope.teamPass = teamDetails.pass;

        var userDetails = User.load();
        $rootScope.userName = userDetails.name;
        $rootScope.userEmail = userDetails.email;

        var tryConnectBySavedDetails = function() {
            var connected_to_team = false,
                user_registered = false;

            if (
                angular.isDefined(teamDetails.name)
                && angular.isDefined(teamDetails.pass)
                && angular.isDefined(userDetails.name)
                && angular.isDefined(userDetails.email)
            ) {
                socket.emit(
                    'pick_team_and_register_user',
                    {
                        team: {name: teamDetails.name, pass: teamDetails.pass},
                        user: {name: userDetails.name, email: userDetails.email}
                    },
                    function (statusTeam, statusUser) {

                        connected_to_team = statusTeam,
                        user_registered = statusUser;

                        switch (false) {
                            case connected_to_team:
                                // if not connected to team
                                $rootScope.goToState('introduction/pick_team');
                                break;
                            case user_registered:
                                // if there was a problem with user
                                $rootScope.goToState('introduction/user_details');
                                break;
                            default:
                                // fully logged
                                $rootScope.goToState('app_tabs.dashboard');
                                break;
                        }
                    }
                );
            } else {
                // register to the beginning
                $rootScope.goToState('introduction/welcome');
            }
        };

        $rootScope.teamDetails = {
            name: name,
            admin_email: name,
            voting_status: 'inactive',
            number_of_votings: 0,
            number_of_team_members: 0,
            members: {},
            points: {},
            votes: {},
            points_colors: {},
            number_of_votes_in_current_voting : 0
        };

        var registerWatchers = function() {
            socket.on('team_details', function(details){
                console.log(details);
                $rootScope.teamDetails = details;

                //if (angular.isDefined($rootScope.teamDetails.admin_role) && true === $rootScope.teamDetails.admin_role) {
                //    $rootScope.teamAdminRole = true;
                //}

                if ($rootScope.teamDetails.admin_email == $rootScope.userEmail) {
                    $rootScope.teamAdminRole = true;
                }
            });
        }

        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                cordova.plugins.Keyboard.disableScroll(true);
            }

            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleLightContent();
            }

            tryConnectBySavedDetails();

            registerWatchers();

            socket.emit('get_team_details');
        });

        $rootScope.error_notification = {
            show : false,
            text : ''
        }
        $rootScope.$watchCollection('error_notification', function(newValue) {
            angular.isUndefined(newValue) || false === newValue.show || console.log('show: ' + newValue.text + ', text: ' + newValue.text);
        });
    })

    .config(function ($stateProvider, $urlRouterProvider) {

        // Ionic uses AngularUI Router which uses the concept of states
        // Learn more here: https://github.com/angular-ui/ui-router
        // Set up the various states which the app can be in.
        // Each state's controller can be found in controllers.js
        $stateProvider

            // introduction

            .state('introduction/welcome', {
                url: '/welcome', // @todo: introduction/
                cache: false,
                templateUrl: 'templates/introduction/welcome.html',
                controller: 'IntroductionCtrl'
            })

            .state('introduction/pick_team', {
                url: '/pick_team',
                cache: false,
                templateUrl: 'templates/introduction/pick_team.html',
                controller: 'IntroductionCtrl'
            })

            .state('introduction/user_details', {
                url: '/user_details',
                cache: false,
                templateUrl: 'templates/introduction/user_details.html',
                controller: 'IntroductionCtrl'
            })


            // setup an abstract state for the tabs directive
            .state('app_tabs', {
                url: '/app_tabs',
                cache: false,
                abstract: true,
                templateUrl: 'templates/app_tabs/app_tabs.html'
            })

            // Each tab has its own nav history stack:
            .state('app_tabs.dashboard', {
                url: '/dashboard',
                cache: false,
                views: {
                    'tab-dashboard': {
                        templateUrl: 'templates/app_tabs/app_tabs-dashboard.html',
                        controller: 'DashboardCtrl'
                    }
                }
            })
            .state('app_tabs.vote', {
                url: '/vote',
                cache: false,
                views: {
                    'tab-vote': {
                        templateUrl: 'templates/app_tabs/app_tabs-vote.html',
                        controller: 'VoteCtrl'
                    }
                }
            })
            .state('app_tabs.team_members', {
                url: '/team_members',
                cache: false,
                views: {
                    'tab-team_members': {
                        templateUrl: 'templates/app_tabs/app_tabs-team_members.html'
                    }
                }
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/welcome');
    });
