//import settings from './appsettings.json' assert {type: "json"};
import * as index from './index.js';
import fs from 'fs';

// Teste folder regex
// let folder = 'Proc-2020010'
// let teste = folder.match(reProcFolder).groups['folder']
// console.log(teste);


// TJAC 0001803-66.2021.8.01.0070
// TRF1 1010438-89.2021.4.01.3000
// TJRO 7011084-18.2022.8.22.0001
// TJAM 0001003-29.2014.8.04.3100

// let cnj = "7048583-07.2020.8.22.0001"

// let validate;
// try {
//   validate = Validate.load(cnj);
// } catch (error) {
//   console.log('Error:' + error);
//   return { success: false, content: 'Erro: ' + error }
// }
// let test = validate.generate();
// const courtNumber = validate.justice + validate.number;
// const court = settings.Courts[courtNumber];
// LaswsuitService.DownloadLawsuit(cnj,"1",court)


// Test get Legal One Token
// let test = await getLegalOneToken()
// console.log(test)

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


let file = fs.readFileSync('SNS_Payload.json', 'utf8');
let event = JSON.parse(file);
await index.handler(event);