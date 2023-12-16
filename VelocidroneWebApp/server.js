const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const settings = require('./settings.json');

var eventId = 'jeff';
var heatDateTime;
var heatStart = false;
var heatId;
var raceDateTime;
var raceStarted = false;

var pilots = {};

const RaceDataSchema = new mongoose.Schema({
    pilotName: String,
    finished: Boolean,
    colour: String,
    gateData: Array,
    heatDateTime: Number,
    heatId: String,
    eventId: String
});

const RaceData = mongoose.model('RaceData', RaceDataSchema);

mongoose.connect(settings.mongodb);

// seed leader board, collate rooms, call pilots per group, run 3 races = 1 heat, change group, repeat... all groups run 3 heats, shuffle by points, repeat
// finish time, number pilots per heat -> assign fastest pilot points = number of pilots, down to 1, repeat for 3 heats * 2, the heat of 4 races

app.use(bodyParser.json());

app.post('createevent', async (req, res) => {
    // check user logged in 

    // create new event
});

app.post('/heatstart', async (req, res) => {
    heatDateTime = Date.now();
    heatStart = true;
    // TODO: heat start per colour group

});

app.post('/racestatus', async (req, res) => {
    if (req.body.racestatus.raceAction == 'start') {
        raceDateTime = Date.now();
        raceStarted = true;        
    }
    else if (req.body.racestatus == 'race finished') {
        raceStarted = false;
    }
    
    io.emit('raceStatus', req.body.racestatus.raceAction);
    res.send('Data received and saved');
});

app.post('/racedata', async (req, res) => {
    console.log(req.body);
    var raceData = req.body;

    for (let pilotName of Object.keys(raceData["racedata"])) {

        let pilotRace = raceData["racedata"][pilotName];

        var data;

        if (pilots.hasOwnProperty(pilotName)) {
            data = pilots[pilotName];
            
            if (data.gateData[data.gateData.length - 1].time == pilotRace.time){
                continue;
            }
            
            data.gateData.push(createGateData(pilotRace));
        } 
        else{
            data = new RaceData();
            data.pilotName = pilotName;
            data.colour = "#" + pilotRace.colour;
            data.heatId = heatId;
            data.eventId = eventId;
            data.heatDateTime = heatDateTime
            data.gateData = [createGateData(pilotRace)];

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

app.get('/event', (req, res) => {
    res.sendFile(__dirname + '/event.html');
});

app.get('/historical', (req, res) => {
    res.sendFile(__dirname + '/historical.html');
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('a user connected');
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});

app.get('/current-finish-times', async (req, res) => {
    try {
        const raceData = await RaceData.find({}); // Adjust query as needed

        var pilots = [];

        // Logic to extract latest finish times
        for(var p in raceData) {
            var data = raceData[p];

            var pilot = pilots.find((e) => e.pilotName === data.pilotName);

            if (pilot === undefined){
                pilots.push({pilotName: data.pilotName, times: [data.gateData[data.gateData.length - 1].time]})
            }
            else {
                pilots[pilots.indexOf(pilot)].times.push(data.gateData[data.gateData.length - 1].time)
            }
        }

        res.json(pilots);
    } catch (error) {
        res.status(500).send("Error fetching finish times");
    }
});

app.get('/historical-data/:pilotName', async (req, res) => {
    try {
        const pilotName = req.params.pilotName;
        const historicalData = await RaceData.find({ pilotName: pilotName });
        res.json(historicalData.map(createHistoricData));
    } catch (error) {
        res.status(500).send("Error fetching historical data");
    }
});

function createHistoricData(data) {
    return {
        pilotName: data.pilotName,
        eventId: data.eventId,
        raceTime: data.gateData[data.gateData.length - 1].time
    }
}

function createGateData(pilotRace) {
    return {
        position: pilotRace.position,
        lap: pilotRace.lap,
        gate: pilotRace.gate,
        time: pilotRace.time
    }
}
