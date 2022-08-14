import * as LO from './LegalOneService.js';
import {GetLegalOneTokenExpirationDate} from './LegalOneAuth.js'
import * as Wrike from './WrikeService.js';
import * as v from 'validate-cnj'

const regexDescriptionInfo = /Processos Relacionados<\/b><br ?\/>(?<litigations>.*?)<br ?\/>/;
const regexLitigations = /(?<cnj>\d{7}-\d{2}.\d{4}.\d.\d{2}.\d{4}|.*?\d{20})|(?<folder>Proc-\d{7}\/\d+|Proc-\d{7})/g;

export async function handler(event) {
    let LOTokenMethod = GetLegalOneTokenExpirationDate();
    let sns = event.Records[0].Sns;
    let message = sns.Message;
    let messageJson = JSON.parse(message);
    console.log(messageJson);
    if (messageJson.eventType === 'TaskCreated') {
        response = {
            statusCode: 200,
            body: JSON.stringify('Skiped'),
        };
        return response;
    }
    let taskId = messageJson[0].taskId;
    let response = await Wrike.getTask(taskId);
    if (!response.success) {
        console.log(response.message);
        let comment = `Não foi possível obter os dados da tarefa para rodar a automação de processos relacionados. Erro: ${response.message}`;
        response = await Wrike.createTaskComment(taskId, comment, true);
        if (!response.success) {
            console.log(response.message);
        }
    }
    let wrikeTask = response.wrikeTask;
    let matches = regexDescriptionInfo.exec(wrikeTask.description);
    if (matches == null) {
        response = {
            statusCode: 200,
            body: JSON.stringify('Skiped'),
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
                cl.comments.push(`<li>❗ ${cl.litigation} - CNJ inválido.</li>`);
            }
        } else if (litigation.groups.folder != null) {
            cl.litigation = litigation.groups.folder;
            cl.type = "folder";
        }
        citedLitigations.push(cl);
    }
    let validCitedLitigations = citedLitigations.filter(cl => cl.isValid);
    await Promise.resolve(LOTokenMethod);
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
        if (cl.folderId !== "") {
            let folderDescription = cl.htmlDescription.join("");
            return Wrike.updateFolderDescription(cl.folderId, folderDescription);
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
        methods.push(Wrike.createTaskComment(taskId, newComment, false));
    }

    console.log(citedLitigations);
    let newTaskDescription = wrikeTask.description.replace(regexDescriptionInfo, `Processos Relacionados<\/b><br \/><ul>${newDescriptionInfo}<\/ul><\/b>`);
    methods.push(Wrike.updateTaskDescription(taskId, newTaskDescription));
    response = await Promise.all(methods);
    if (!response.success) {
        console.log(response.message);
    }

    response = {
        statusCode: 200,
        body: JSON.stringify('Done'),
    };
    return response;
}
