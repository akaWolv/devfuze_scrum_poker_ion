var app = require('express')();
var http = require('http').Server(app);
var http_lib = require('http');
var io = require('socket.io')(http);
var crypto = require('crypto');
// rooms which are currently available in chat

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var teams = {};
//,
//    disconnect_timers = {},
//    notify_status_change = {},
//    users_last_sockets = {};

io.on('connection', function (socket) {

    socket.picked_team = undefined;
    socket.user_name = undefined;
    socket.user_email = undefined;
    socket.admin_role = false;

    socket.on('pick_team', function (cmd, fn) {
        if (undefined != cmd.name && undefined != cmd.pass) {
            if (true === pickTeam(cmd.name, cmd.pass)) {

                infoLog('TEAM PICKED', {team: socket.picked_team});

                broadcastTeamDetails();

                'function' != typeof fn || fn(true, cmd.name, cmd.pass);

                return true;
            }
        }

        'function' != typeof fn || fn(false);
        return false;
    });

    socket.on('register_team', function (cmd, fn) {
        if (undefined != cmd.name && undefined != cmd.pass) {
            if (true === registerTeam(cmd.name, cmd.pass)) {

                broadcastTeamDetails();

                'function' != typeof fn || fn(true, cmd.name, cmd.pass);

                infoLog('TEAM CREATED', {team: socket.picked_team});

                return true;
            }
        }

        infoLog('TEAM NOT CREATED', {team: socket.picked_team});
        'function' != typeof fn || fn(false);
        return false;
    });

    socket.on('register_user', function (cmd, fn) {
        if (undefined != cmd.name && undefined != cmd.email) {
            if (true === registerUser(cmd.name, cmd.email)) {

                infoLog('USER REGISTERED', {name: cmd.name, email: cmd.email, team: socket.picked_team});

                broadcastTeamDetails();

                'function' != typeof fn || fn(true, cmd.name, cmd.email);

                return true;
            }
        }

        infoLog('USER NOT REGISTERED', {name: cmd.name, email: cmd.email, team: socket.picked_team});
        'function' != typeof fn || fn(false);
        return false;
    });

    socket.on('deregister_user', function (cmd, fn) {
        var status = deregisterUser();
        if (true === status) {
            infoLog('USER DEREGISTERED', {name: socket.user_name, email: socket.user_email, team: socket.picked_team});

            broadcastTeamDetails();
        }

        'function' != typeof fn || fn(status);
        return status;
    });

    socket.on('pick_team_and_register_user', function (cmd, fn) {
        infoLog('TRY TO REGISTER USER FROM SAVED DETAILS');

        var pickTeamStatus = false,
            registerUserStatus = false;

        if (undefined != cmd.team && undefined != cmd.team.name && undefined != cmd.team.pass) {
            pickTeamStatus = pickTeam(cmd.team.name, cmd.team.pass);

            if (true === pickTeamStatus && undefined != cmd.user && undefined != cmd.user.name && undefined != cmd.user.email) {
                registerUserStatus = registerUser(cmd.user.name, cmd.user.email);
            }
        }

        infoLog('REGISTERED USER FROM SAVED DETAILS');

        broadcastTeamDetails();

        'function' != typeof fn || fn(pickTeamStatus, registerUserStatus);
    });

    socket.on('get_team_details', function () {
        if (undefined != socket.picked_team && undefined != teams[socket.picked_team]) {
            var data_to_send = (JSON.parse(JSON.stringify(teams[socket.picked_team])));

            //if (data_to_send['admin_email'] == socket.user_email) {
            //    data_to_send['admin_role'] = true;
            //}
            //
            //delete data_to_send['pass'];
            //delete data_to_send['admin_email'];

            socket.emit('team_details', data_to_send);

            infoLog('TEAM DETAILS SEND');
            return true;
        }

        infoLog('TEAM DETAILS NOT SEND');
        return false;
    });

    socket.on('start_new_vote', function () {
        if (teams[socket.picked_team]['admin_email'] == socket.user_email) {

            if (true === changeVotingStatus('open', true)) {

                infoLog('NEW VOTE STARTED');

                broadcastTeamDetails();

                return true;
            }
        }
        infoLog('NEW VOTE NOT STARTED');
        return false;
    });

    socket.on('force_finish_vote', function () {
        if (teams[socket.picked_team]['admin_email'] == socket.user_email) {

            if (true === changeVotingStatus('finish', false)) {

                infoLog('VOTE FINISHED');

                broadcastTeamDetails();

                return true;
            }
        }
        infoLog('VOTE NOT FINISHED');
        return false;
    });

    socket.on('discard_vote', function () {
        if (teams[socket.picked_team]['admin_email'] == socket.user_email) {

            if (true === changeVotingStatus('inactive', true)) {

                infoLog('VOTE DISCARDED');

                broadcastTeamDetails();

                return true;
            }
        }
        infoLog('VOTE NOT DISCARDED');
        return false;
    });

    socket.on('register_vote', function (voteValue, fn) {
        if (undefined != voteValue) {
            var validVote = false;
            for (var k in teams[socket.picked_team].points) {
                if (teams[socket.picked_team].points[k].value == voteValue) {
                    validVote = true;
                    break;
                }
            }

            // save vote for user
            if (true === validVote) {
                // save vote
                teams[socket.picked_team].votes[socket.user_email] = voteValue;
                teams[socket.picked_team].number_of_votes_in_current_voting++;

                // check if everybody have voted
                if (teams[socket.picked_team].number_of_team_members == teams[socket.picked_team].number_of_votes_in_current_voting) {
                    changeVotingStatus('finished');
                }

                infoLog('VOTE REGISTERED');

                broadcastTeamDetails();

                'function' != typeof fn || fn(true);
                return true;
            }
        }

        infoLog('VOTE NOT REGISTERED');
        'function' != typeof fn || fn(false);
        return false;
    });

    socket.on('deregister_vote', function (cmd, fn) {
        if (undefined != teams[socket.picked_team].votes[socket.user_email]) {
            // remove vote
            delete teams[socket.picked_team].votes[socket.user_email];
            teams[socket.picked_team].number_of_votes_in_current_voting--;

            broadcastTeamDetails();

            'function' != typeof fn || fn(true);
            infoLog('VOTE DEREGISTERED');
            return true;
        }

        infoLog('VOTE NOT DEREGISTERED');
        'function' != typeof fn || fn(false);
        return false;
    });

    socket.on('disconnect', function() {
        var status = deregisterUser();
        if (true === status) {
            infoLog('USER DISCONNECTED', {name: socket.user_name, email: socket.user_email, team: socket.picked_team});

            broadcastTeamDetails();
        }

        'function' != typeof fn || fn(status);
        return status;
    });

    var broadcastTeamDetails = function () {
        if (undefined != socket.picked_team && undefined != teams[socket.picked_team]) {
            var data_to_send = (JSON.parse(JSON.stringify(teams[socket.picked_team])));

            //if (data_to_send['admin_email'] == socket.user_email) {
            //    data_to_send['admin_role'] = true;
            //}

            //delete data_to_send['pass'];
            //delete data_to_send['admin_email'];

            io.sockets.in(socket.picked_team).emit('team_details', data_to_send);

            infoLog('TEAM DETAILS BROADCASTED');
            return true;
        }

        infoLog('TEAM DETAILS NOT BROADCASTED');
        return false;
    }

    var changeVotingStatus = function (status, clearData) {
        clearData = undefined == clearData ? false : clearData;
        var votingStatuses = ['inactive', 'open', 'finished'];

        if (votingStatuses.indexOf(status) > -1) {
            teams[socket.picked_team]['voting_status'] = status;

            if (true == clearData) {
                // increment number of votings
                teams[socket.picked_team]['number_of_votings']++;
                teams[socket.picked_team]['votes'] = {};
                teams[socket.picked_team]['number_of_votes_in_current_voting'] = 0;
            }

            return true;
        }

        return false;
    }

    var registerTeam = function (name, pass) {
        if (undefined == teams[name]) {
            teams[name] = {
                name: name,
                pass: pass,
                admin_email: socket.user_email,
                voting_status: 'inactive',
                number_of_votings: 0,
                number_of_team_members: 0,
                members: {},
                points: [
                    {
                        value: '1'
                    },
                    {
                        value: '2'
                    },
                    {
                        value: '3'
                    },
                    {
                        value: '5'
                    },
                    {
                        value: '8'
                    },
                    {
                        value: '13'
                    },
                    {
                        value: '21'
                    },
                    {
                        value: 'BIG'
                    },
                    {
                        value: '?'
                    },
                    {
                        value: 'café'
                    }
                ],
                points_colors: {
                    '1' : '#feff4d',
                    '2' : '#ff8732',
                    '3' : '#ff6470',
                    '5' : '#ff7bb6',
                    '8' : '#ce81ff',
                    '13' : '#876fff',
                    '21' : '#76d6ff',
                    'BIG' : '#c6fff0',
                    '?' : '#c5ff4e',
                    'café' : '#db6f2e'
                },
                votes: {},
                number_of_votes_in_current_voting: 0
            };

            socket.admin_role = true;

            return pickTeam(name, pass)
        }

        return false;
    }

    var pickTeam = function (name, pass) {
        if (undefined != teams[name] && pass == teams[name]['pass']) {
            socket.join(name);
            socket.picked_team = name;

            if (true === socket.admin_role && true === teams[name]['admin_email']) {
                teams[name]['admin_email'] = socket.user_email;
            }

            return true;
        }

        return false;
    }

    var registerUser = function (name, email) {
        socket.user_name = name;
        socket.user_email = email;

        if (undefined == teams[socket.picked_team]['members'][socket.user_email]) {
            teams[socket.picked_team]['members'][socket.user_email] = {
                name: socket.user_name,
                email: socket.user_email,
                email_md5: crypto.createHash('md5').update(socket.user_email).digest('hex')
            };
            teams[socket.picked_team]['number_of_team_members']++;
        }

        if (true === socket.admin_role && undefined == teams[socket.picked_team]['admin_email']) {
            teams[socket.picked_team]['admin_email'] = socket.user_email;
        }

        return true;
    }

    var deregisterUser = function(){
        if (undefined != teams[socket.picked_team] && undefined != teams[socket.picked_team]['members'] && undefined != teams[socket.picked_team]['members'][socket.user_email]) {
            // admin cannot log out if there are other members
            if (teams[socket.picked_team]['admin_email'] != socket.user_email) {
                teams[socket.picked_team]['number_of_team_members']--;
                delete teams[socket.picked_team]['members'][socket.user_email];
                socket.leave(socket.picked_team);
                return true;
            }
        }
        return false;
    }

    var infoLog = function (log_name, log) {
        var info_log = {};
        info_log.pipe = socket.picked_pipe;
        info_log.client_id = socket.client.id;
        info_log.ip = socket.conn.remoteAddress;
        // merge two objects
        if (undefined != log && 'object' === typeof log) {
            for (var attrname in log) {
                info_log[attrname] = log[attrname];
            }
        }
        var logDate = new Date();
        logDate = logDate.toISOString().split('T').join(' ').split('Z').join('');
        console.log(logDate + '|' + log_name + '|' + JSON.stringify(info_log));
    }

    infoLog('JOIN');
});

http.listen(3003, function () {
    console.log('listening on *:3003');
});