angular.module('devfuze_poker.controllers', [])

    .controller('IntroductionCtrl', function ($scope, $rootScope, socket, Team, User, $ionicPopup) {

        $scope.pickTeam = function(name, pass) {

            if (angular.isDefined(name) && angular.isDefined(pass)) {

                $rootScope.teamName = name;
                $rootScope.teamPass = pass;

                socket.emit('pick_team', {name: name, pass: pass}, function(status, name, pass) {
                    if (true === status) {
                        Team.save(name, pass);
                        $rootScope.goToState('introduction/user_details');
                        return true;
                    } else {
                        $ionicPopup.alert({
                            title: 'Team not exist',
                            template: 'Please create first.'
                        });
                    }
                });
            }
            return false;
        }

        $scope.pickUser = function(name, email) {

            if (angular.isDefined(name) && angular.isDefined(email)) {

                $rootScope.userName = name;
                $rootScope.userEmail = email;

                socket.emit('register_user', {name: name, email: email}, function(status, name, email) {
                    if (true === status) {
                        User.save(name, email)
                        $rootScope.goToState('app_tabs.dashboard');
                        return true;
                    }
                });
            }
            return false;
        }

        $scope.createTeam = function(name, pass) {

            if (angular.isDefined(name) && angular.isDefined(pass)) {

                $rootScope.teamName = name;
                $rootScope.teamPass = pass;

                socket.emit('register_team', {name: name, pass: pass}, function(status, name, pass) {
                    if (true === status) {
                        Team.save(name, pass);
                        $rootScope.goToState('introduction/user_details');
                        return true;
                    } else {
                        $ionicPopup.alert({
                            title: 'Team already exist',
                            template: 'Please log in or pick other name.'
                        });
                    }
                });
            }
            return false;
        }
    })

    .controller('AppCtrl', function ($scope, Team, User) {
    })

    .controller('DashboardCtrl', function ($scope) {
    })

    .controller('VoteCtrl', function ($scope, $rootScope, socket, $ionicSlideBoxDelegate, $timeout) {

        //$scope.voteStage = 'pending';
        //$scope.voteStages = ['pending', 'voted'];
        //
        //var changeVoteStage = function (stage) {
        //    if (angular.isDefined(stage) && $scope.voteStages.indexOf(stage) > -1) {
        //        $scope.voteStage = stage;
        //    }
        //}

        $scope.pickedPointsIndex = 0;
        $scope.confirmVote = function(pickedPointsIndex) {

            // save picked points
            $scope.pickedPointsIndex = pickedPointsIndex;

            $scope.currentVote = $rootScope.teamDetails.points[$scope.pickedPointsIndex];

            socket.emit('register_vote', $scope.currentVote.value, function(status) {
                if (true === status) {
                    // change stage
                    //changeVoteStage('voted');
                }
            });
        }

        $scope.changedMind = function() {
            socket.emit('deregister_vote', {}, function(status) {
                if (true === status) {
                    // change stage
                    //changeVoteStage('pending');
                }
            });
        }

        $scope.countProperties = function (obj) {
            var count = 0;

            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    ++count;
                }
            }

            return count;
        }

        $scope.currentVote = undefined;
        $scope.userHasVoted = false;

        $rootScope.$watch('teamDetails.votes', function() {
            var userHasVoted = $scope.userHasVoted;
            if (angular.isDefined($rootScope.teamDetails.votes[$rootScope.userEmail])) {
                // user has voted
                $scope.userHasVoted = true;

                // find value voted for
                for (var k in $rootScope.teamDetails.points) {
                    if ($rootScope.teamDetails.points[k].value == $rootScope.teamDetails.votes[$rootScope.userEmail]) {
                        $scope.currentVote = $rootScope.teamDetails.points[k];
                        break;
                    }
                }
            } else {
                $scope.userHasVoted = false;
            }
        });

        $rootScope.$watch('teamDetails', function() {
            $ionicSlideBoxDelegate.update();
        });
    })

    .controller('SessionActionsCtrl', function ($scope, $rootScope, socket, Team, User, $ionicPopup) {

        $scope.changeTeam = function() {
            socket.emit('deregister_user', {}, function(status) {
                if (true === status) {
                    $rootScope.goToState('introduction/pick_team');
                }
            });
        }

        $scope.changeUserDetails = function() {
            socket.emit('deregister_user', {}, function(status) {
                if (true === status) {
                    $rootScope.goToState('introduction/user_details');
                }
            });
        }

        $scope.resetDetails = function() {
            // A confirm dialog
            var confirmPopup = $ionicPopup.confirm({
                title: 'Resset settings?',
                template: 'We will be miss you!'
            });
            confirmPopup.then(function(res) {
                if (res) {
                    socket.emit('deregister_user', {}, function(status) {
                        if (true === status) {
                            $rootScope.teamName = undefined;
                            $rootScope.teamPass = undefined;
                            Team.save($rootScope.teamName, $rootScope.teamPass);

                            $rootScope.userName = undefined;
                            $rootScope.userEmail = undefined;
                            User.save($rootScope.userName, $rootScope.userEmail);

                            $rootScope.goToState('introduction/welcome');
                        }
                    });
                    return true;
                } else {
                    return false;
                }
            });
        }

        $scope.logOut = function() {
            // A confirm dialog
            var confirmPopup = $ionicPopup.confirm({
                title: 'Log Out?',
                template: 'We will be miss you!'
            });
            confirmPopup.then(function(res) {
                if (res) {
                    socket.emit('deregister_user', {}, function(status) {
                        if (true === status) {
                            $rootScope.goToState('introduction/welcome');
                        }
                    });
                    return true;
                } else {
                    return false;
                }
            });
        }
    })

    .controller('SettingsCtrl', function ($scope, User) {
        $scope.userDetails = User.load();

        $scope.save = function (userDetails) {
            User.save(userDetails.name, userDetails.email);
        }
    })

    .controller('AppTabsCtrl', function ($scope, $ionicSideMenuDelegate) {

        $scope.toggleLeft = function () {
            $ionicSideMenuDelegate.toggleLeft();
        };

        $scope.toggleRight = function () {
            $ionicSideMenuDelegate.toggleRight();
        };
    })

    .controller('TeamAdminCtrl', function ($scope, $rootScope, $ionicPopup, socket, $ionicSideMenuDelegate) {

        $scope.startNewVote = function() {
            // A confirm dialog
            var confirmPopup = $ionicPopup.confirm({
                title: 'Start new vote',
                template: 'Are you sure you want to start new vote? Existing vote will be ended.'
            });
            confirmPopup.then(function(res) {
                if (res) {
                    socket.emit('start_new_vote');
                    $rootScope.goToState('app_tabs.vote');
                    $ionicSideMenuDelegate.toggleRight();
                    return true;
                } else {
                    return false;
                }
            });
        }

        $scope.forceFinishVote = function() {
            // A confirm dialog
            var confirmPopup = $ionicPopup.confirm({
                title: 'Force finish vote',
                template: 'Not all members voted! Are you sure you want to finish existing vote?'
            });
            confirmPopup.then(function(res) {
                if (res) {
                    socket.emit('force_finish_vote');
                    $rootScope.goToState('app_tabs.vote');
                    $ionicSideMenuDelegate.toggleRight();
                } else {
                    return false;
                }
            });
        }

        $scope.discardVote = function() {
            // A confirm dialog
            var confirmPopup = $ionicPopup.confirm({
                title: 'Discard vote',
                template: 'Are you sure you want to end existing vote without counting points?'
            });
            confirmPopup.then(function(res) {
                if (res) {
                    socket.emit('discard_vote');
                    $rootScope.goToState('app_tabs.vote');
                    $ionicSideMenuDelegate.toggleRight();
                } else {
                    return false;
                }
            });
        }
    });


