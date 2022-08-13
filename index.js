import * as LO from './LegalOneService.js';
import * as Wrike from './WrikeService.js';
import * as v from 'validate-cnj'

const regexDescriptionInfo = /Identificadores dos processos relacionados, separados por vírgula<\/b><br ?\/>(?<litigations>.*?)<br ?\/>/;
const regexLitigations = /(?<cnj>\d{7}-\d{2}.\d{4}.\d.\d{2}.\d{4}|.*?\d{20})|(?<folder>Proc-\d{7}\/\d+|Proc-\d{7})/g;

export async function handler(event) {
    let sns = event.Records[0].Sns;
    let message = sns.Message;
    let messageJson = JSON.parse(message);
    let taskId = messageJson[0].taskId;
    let response = await Wrike.getTask(taskId);
    if (response.success) {
    } else {
        console.log(response.message);
        let comment = `Não foi possível obter os dados da tarefa para rodar a automação de processos relacionados. Erro: ${response.message}`;
        response = await Wrike.createTaskComment(taskId, comment, true);
        if (!response.success) {
            console.log(response.message);
        }
    }
    let wrikeTask = response.wrikeTask;
    const relatedLitigations = regexDescriptionInfo.exec(wrikeTask.description).groups.litigations;
    if (relatedLitigations == null) {
        console.log("Não há processos relacionados.");
        return;
    }
    let litigations = relatedLitigations.matchAll(regexLitigations);
    let citedLitigations = [];
    for (const litigation of litigations) {
        let cl = {
            litigation: "",
            type: "",
            htmlDescription: [],
            isValid: true,
            taskId: taskId,
            errors: [],
            folderId: ""
        }
        if (litigation.groups.cnj != null) {
            cl.litigation = litigation.groups.cnj;
            cl.type = "cnj"
            let validate
            try {
                validate = v.Validate.load(cl.litigation);
            } catch (error) {
                cl.isValid = false;
                cl.htmlDescription.push(`<li><strong>❗ ${cl.litigation} - CNJ inválido.</strong></li>`);
            }
        } else if (litigation.groups.folder != null) {
            cl.litigation = litigation.groups.folder;
            cl.type = "folder";
        }
        citedLitigations.push(cl);
    }
    let validCitedLitigations = citedLitigations.filter(cl => cl.isValid);
    response = await LO.batchGetLitigationsByQuery(validCitedLitigations);
    // replace citedLitigations with the same citedLitigaiton.litigation on validCitedLitigations
    citedLitigations = citedLitigations.map(cl => {
        let validCl = validCitedLitigations.find(validCl => validCl.litigation == cl.litigation);
        if (validCl != null) {
            return validCl;
        } else {
            return cl;
        }
    });
    //Update citedLitigation folder description
    let methods = citedLitigations.map(cl => {
        if (cl.folderId != "") {
            let folderDescription = cl.htmlDescription.join("");
            return Wrike.updateFolderDescription(cl.folderId, folderDescription);
        }
    });
    let responses = await Promise.all(methods);


    // get all cited
    let newDescriptionInfo = "</ul>";

    wrikeTask.description = wrikeTask.description.replace(regexDescriptionInfo, `Identificadores dos processos relacionados, separados por vírgula<\/b><br \/>${newDescriptionInfo}<br \/>`);
    console.log(citedLitigations);


    // const results = async () => {
    //     return Promise.all(
    //         litigationData.map(async (litigation) => {
    //             litigation.participants = litigation.participants
    //                 ? (litigation.participants = await getLawsuitParticipants(
    //                     litigation.participants,
    //                     token
    //                 ))
    //                 : []
    //         })
    //     )
    // }
    // await Promise.resolve(results())
    // return {
    //     success: true,
    //     content: await createLitigationHTMLBlock(litigationData)
    // }
    // } else {
    //     return {success: false, content: 'Não encontrado.'}
    // }


    response = {
        statusCode: 200,
        body: JSON.stringify('Redirected'),
    };
    console.log(event)
    return response;
}
