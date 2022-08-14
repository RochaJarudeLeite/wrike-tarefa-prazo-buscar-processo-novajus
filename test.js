import {getLegalOneToken} from './LegalOneAuth.js'


// Test get Legal One Token
let test = await getLegalOneToken()

// Test Get Lawsuit By CNJ
// let payload = await LO.getLitigationsByQuery("2125610-46.2020.8.26.0000")
// if (payload.success) {
//     LO.savePayloadData(payload.content)
//     console.log(payload.content)
// }

// Test Wrike Folder and Create Search
// let payload = await Wrike.searchFolder("Proc-1002334");
// if (payload.success && payload.id == null) {
//     payload = await Wrike.createFolder("Proc-1002334");
//     if (payload.success) {
//         console.log(payload.id)
//     }
// }
// console.log(payload);


// Event test
// read from json file


// let file = fs.readFileSync('SNS_Payload.json', 'utf8');
// let event = JSON.parse(file);
// await index.handler(event);

