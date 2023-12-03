const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const dbConnectionString = 'mongodb://127.0.0.1:27017';

// Connect to MongoDB
mongoose.connect(dbConnectionString);

var eventId = 'jeff';
var heatDateTime;
var heatStart = false;
var heatId;
var raceDateTime;
var raceStarted = false;

const GateDataSchema = new mongoose.Schema({
    position: Number,
    lap: Number,
    gate: Number,
    time: Number
});

const GateData = mongoose.model('GateData', GateDataSchema);

const RaceDataSchema = new mongoose.Schema({
    pilotName: String,
    //finishTime: Number,
    finished: Boolean,
    colour: String,
    gateData: Array,
    heatDateTime: Number,
    heatId: String,
    eventId: String
});

const RaceData = mongoose.model('RaceData', RaceDataSchema);

// const EventDataSchema = new mongoose.Schema({
//     eventId: String,
//     pilots: Array
// });

// const EventData = mongoose.model('EventData', EventDataSchema);

// const HeatDataSchema = new mongoose.Schema({
//     heatDateTime: Number,
//     heatId: String,
//     eventId: String
// });

// const HeatData = mongoose.model('HeatData', HeatDataSchema);

// const PilotDataSchema = new mongoose.Schema({
//     pilotName: String
// });

// const PilotData = mongoose.model('PilotData', PilotDataSchema);


// seed leader board, collate rooms, call pilots per group, run 3 races = 1 heat, change group, repeat... all groups run 3 heats, shuffle by points, repeat
// finish time, number pilots per heat -> assign fastest pilot points = number of pilots, down to 1, repeat for 3 heats * 2, the heat of 4 races

app.use(bodyParser.json());

app.post('/heatstart', async (req, res) => {
    heatDateTime = Date.now();
    heatStart = true;
    // TODO: heat start per colour group

});

app.post('/racestatus', async (req, res) => {
    if (req.body.racestatus == 'start') {
        raceDateTime = Date.now();
        raceStarted = true;
    }
    else if (req.body.racestatus == 'race finished') {
        raceStarted = false;
    }
});

var pilots = {};

app.post('/racedata', async (req, res) => {
    var raceData = req.body;

    for (let pilotName of Object.keys(raceData["racedata"])) {

        let pilotRace = raceData["racedata"][pilotName];

        var data;

        if (pilots.hasOwnProperty(pilotName)) {
            data = pilots[pilotName];
            
            if (data.gateData[data.gateData.length - 1].time == pilotRace.time){
                continue;
            }

            data.gateData.push({
                position: pilotRace.position,
                lap: pilotRace.lap,
                gate: pilotRace.gate,
                time: pilotRace.time
            });
        } 
        else{
            data = new RaceData();
            data.pilotName = pilotName;
            data.colour = pilotRace.colour;
            data.heatId = heatId;
            data.eventId = eventId;
            data.heatDateTime = heatDateTime
            data.gateData = [{
                position: pilotRace.position,
                lap: pilotRace.lap,
                gate: pilotRace.gate,
                time: pilotRace.time
            }];

            pilots[pilotName] = data;
        }

        if (data.finished == null || data.finished === undefined) {
            data.finished = false;
        }

        await data.save();
        io.emit('raceDataUpdate', data);
    }

    res.send('Data received and saved');
});

// Serve the HTML file for the graph
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
