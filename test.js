import {GetWrikeToken} from './WrikeAuth.js';
import * as Wrike from './WrikeService.js';

// Event test
// read from json file


/*let file = fs.readFileSync('SNS_Payload.json', 'utf8');
let message = /
let event = JSON.parse(file);
event.Records[0].Sns.Message = event.Records[0].Sns.Message.replace('replaceWithMessage', JSON.stringify(message));
await index.handler(event);*/

// teste wrike

await GetWrikeToken();
let taskId = "IEABJD3YKQ4KSLDI";
let partentId = "IEABJD3YI44D5ZPM";
await Wrike.addTaksParentsAxios(taskId, partentId);