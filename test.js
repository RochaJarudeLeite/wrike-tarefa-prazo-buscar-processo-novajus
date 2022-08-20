import fs from "fs";
import * as index from "./index.js";
import {GetWrikeToken} from './WrikeAuth.js';
import * as Wrike from './WrikeService.js';

// Event test
// read from json file


// let file = fs.readFileSync('SNS_Payload.json', 'utf8');
// let event = JSON.parse(file);
// await index.handler(event);

// teste wrike

let wrikeToken = await GetWrikeToken();
let taskId = "IEABJD3YKQ4KSLDI";
let partentId = "IEABJD3YI44D5ZPM";
let response = await Wrike.addTaksParentsAxios(taskId, partentId);