import VelocidroneClient  from "./VelocidroneClient.js";
import * as http from 'http'

import fs from "node:fs";

const RACEDATAKEYNAME = 'racedata';
const RACESTATUSKEYNAME = 'racestatus';
const RACEACTIONKEYNAME = 'raceaction';

async function message(data){
    
    var d = data.toString();
    
    if (d.length == 0) return

    if (JSON.parse(d)["racedata"] == null) return;

    await postMessage('/racedata', data);

}

async function postMessage (url, data) {
    // Convert data to a JSON string
    var res = await fetch('http://127.0.0.1:3000/racedata', {
        method: 'POST',
        body: data.toString(),
        headers: {
            'Content-Type': 'application/json'
        }
      });


}

await VelocidroneClient.initialise("settings.json", message);

// fs.readFile("D:\\Code\\VelocidroneWebSocketConsumer\\V1data-test.txt",  "utf16le", async (err, data) => {
//     let dataRows = data.split(/\r?\n/);
//     for (let row in dataRows)
//     {
//         var d = dataRows[row].toString().trim();
        
//         if (d.length == 0) continue;

//         if (JSON.parse(d)["racedata"] == null) continue;

//         await postMessage('/racedata', d);
//     }

// });
