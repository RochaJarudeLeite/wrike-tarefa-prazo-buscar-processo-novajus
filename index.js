import * as LO from './LegalOneService.js';
import {GetLegalOneToken} from './LegalOneAuth.js'
import {GetWrikeToken} from './WrikeAuth.js'
import * as Wrike from './WrikeService.js';
import * as v from 'validate-cnj'

const regexDescriptionInfo = /Processos Relacionados<\/b>(<br \/>)?(<br \/>)?(?<litigations>[0-9P].*?)<br \/><br \/>/;
const regexLitigations = /(?<cnj>\d{7}-\d{2}.\d{4}.\d.\d{2}.\d{4}|.*?\d{20})|(?<folder>Proc-\d{7}\/\d+|Proc-\d{7})/g;

export async function handler(event) {
    let validEventType = 'TaskCreated';
    let sns = event.Records[0].Sns;
    let message = sns.Message;
    let messageJson = JSON.parse(message);
    console.log(messageJson);
    if (messageJson[0].eventType !== validEventType) {
        console.log("Skipped");
        let response = {
            statusCode: 200,
            body: JSON.stringify('Skipped'),
        };
        return response;
    }
    let wrikeToken = await GetWrikeToken();
    if (wrikeToken == null) {
        console.log("No Wrike Token found");
        let response = {
            statusCode: 200,
            body: JSON.stringify('No Wrike Token found'),
        };
        return response;
    }
    let taskId = messageJson[0].taskId;
    let response = await Wrike.getTask(taskId);
    if (!response.success) {
        let comment = `🤖 RJL-Bot: Não foi possível obter os dados da tarefa para rodar a automação. Erro: ${response.message}`;
        response = await Wrike.createTaskComment(taskId, comment, true);
        if (!response.success) {
            console.log(response.message);
        }
        let response = {
            statusCode: 200,
            body: JSON.stringify('No Wrike Token found'),
        };
        return response;
    }
    let legalOneTokePromise = GetLegalOneToken();
    let wrikeTask = response.wrikeTask;
    let matches = regexDescriptionInfo.exec(wrikeTask.description);
    if (matches == null) {
        console.log("Skipped");
        response = {
            statusCode: 200,
            body: JSON.stringify('Skipped'),
        };
        return response;
    }
    const relatedLitigations = matches.groups.litigations;
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
            comments: [],
            folderId: null,
            folderTitle: null,
            novajusId: null
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
                cl.comments.push(`<li>❗ ${cl.litigation} - CNJ inválido.</li>`);
            }
        } else if (litigation.groups.folder != null) {
            cl.litigation = litigation.groups.folder;
            cl.type = "folder";
        }
        citedLitigations.push(cl);
    }
    let validCitedLitigations = citedLitigations.filter(cl => cl.isValid);
    let legalOneToken = await legalOneTokePromise;
    if (legalOneToken == null) {
        let comment = `🤖 RJL-Bot: Automação falou ao obter o token do Novajus. Erro: ${response.message}`;
        response = await Wrike.createTaskComment(taskId, comment, true);
        if (!response.success) {
            console.log(response.message);
        }
        let response = {
            statusCode: 200,
            body: JSON.stringify('No Legal One Token found'),
        };
        return response;
    }
    response = await LO.batchGetLitigationsByQuery(validCitedLitigations);
    // replace citedLitigations with the same citedLitigaiton.litigation on validCitedLitigations
    citedLitigations = citedLitigations.map(cl => {
        let validCl = validCitedLitigations.find(validCl => validCl.litigation === cl.litigation);
        if (validCl != null) {
            return validCl;
        } else {
            return cl;
        }
    });
    //Update citedLitigation folder description
    let methods = citedLitigations.map(cl => {
        if (cl.wrikeFolderId !== null) {
            let folderDescription = cl.htmlDescription.join("");
            return Wrike.updateFolderDescription(cl, folderDescription);
        }
    });


    let newDescriptionInfo = "";
    // for each citedLitigation, get the htmlDescription and add it to the newDescriptionInfo
    for (const citedLitigation of citedLitigations) {
        newDescriptionInfo += citedLitigation.htmlDescription.join("");
    }

    let newComment = "";
    // for each citedLitigation, get the comment and add it to the newDescriptionInfo
    for (const citedLitigation of citedLitigations) {
        if (citedLitigation.comments.length > 0 && citedLitigation.errors.length > 0) {
            newComment += `<h5>${citedLitigation.litigation}</h5>`;
        }
        if (citedLitigation.comments.length > 0) {
            newComment += `<p>Detalhes</p>`;
            for (const comment of citedLitigation.comments) {
                newComment += `<li>${citedLitigation.comments.join("")}</li>`;
            }
        }
        if (citedLitigation.errors.length > 0) {
            newComment += `<p>Erros</p>`;
            for (const error of citedLitigation.errors) {
                newComment += `<li>${citedLitigation.errors.join("")}</li>`;
            }
        }
    }

    //Create task comment
    if (newComment !== "") {
        newComment = '🤖 RJL-Bot: ' + newComment;
        methods.push(Wrike.createTaskComment(taskId, newComment, false));
    }
    let newTaskDescription = wrikeTask.description.replace(regexDescriptionInfo, `Processos Relacionados<\/b><br \/><ul>${newDescriptionInfo}<\/ul>`);
    methods.push(Wrike.updateTaskDescription(taskId, newTaskDescription));
    response = await Promise.all(methods);
    if (!response.success) {
        console.log(response.message);
    }
    let comment = `🤖 RJL-Bot: Descrição atualizada e pasta(s) vinculada(s): ${citedLitigations.map(x => x.folderTitle).join(', ')}.`;
    response = await Wrike.createTaskComment(taskId, comment, false);
    if (!response.success) {
        console.log(response.message);
    }

    response = {
        statusCode: 200,
        body: JSON.stringify('Done'),
    };
    return response;
}
