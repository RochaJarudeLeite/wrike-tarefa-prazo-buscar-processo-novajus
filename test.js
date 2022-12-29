import { GetWrikeToken } from "./WrikeAuth.js";
import * as Wrike from "./WrikeService.js";
import fs from "fs";
import * as index from "./index.js";

// Event test
// read from json file

let file = fs.readFileSync("SNS_Payload.json", "utf8");
let message = [
  {
    taskId: "IEABJD3YKQ6U6ETX",
    webhookId: "IEABJD3YJAABGBDL",
    eventAuthorId: "KUAJ6WWJ",
    eventType: "TaskCreated",
    lastUpdatedDate: "2022-12-29T13:28:00Z"
  }
];

let event = JSON.parse(file);
event.Records[0].Sns.Message = event.Records[0].Sns.Message.replace(
  "replaceWithMessage",
  JSON.stringify(message)
);
await index.handler(event);

// teste wrike

// await GetWrikeToken();
// let taskId = "IEABJD3YKQ4KSLDI";
// let partentId = "IEABJD3YI44D5ZPM";
// await Wrike.addTaksParentsAxios(taskId, partentId);
