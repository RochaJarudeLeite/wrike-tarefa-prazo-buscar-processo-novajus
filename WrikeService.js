import {wrikeToken} from './WrikeAuth.js'
import FormData from 'form-data';
import fetch from 'node-fetch'
import axios from "axios";


let tempLitigationFolderId = "IEABJD3YI44HKA7O";
let novajusIdCustomFieldId = "IEABJD3YJUADBUZU";


async function getTask(taskId) {
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "wrikeTask": data[0]};
            } else {
                return {"success": true, "wrikeTask": null};
            }
        } else {
            return {"success": false, "message": "Erro ao obter dados da tarefa."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function addTaksParents(citedLitigation) {
    let taskId = citedLitigation.taskId;
    let parentId = citedLitigation.wrikeFolderId
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}?addParents=["${parentId}"]`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            } else {
                citedLitigation.errors.push("Erro ao adicionar tarefa pai.");
                return {"success": false, "message": "Erro ao adicionar etiqueta na pasta."};
            }
        } else {
            citedLitigation.errors.push("Erro ao adicionar tarefa pai.");
            return {"success": false, "message": "Erro ao adicionar etiqueta na pasta."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function updateTaskDescription(taskId, newDescription) {
    // form data payload
    let formData = new FormData();
    formData.append('description', newDescription);
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + wrikeToken,
            ...formData.getHeaders()
        },
        data: formData
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}`
    try {
        const response = await axios(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = response.data;
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            }
        } else {
            return {"success": false, "message": "Erro ao atualizar a descrição da tarefa."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro ao atualizar a descrição da tarefa: " + error};
    }
}

async function updateFolderDescription(citedLitigation, newDescription) {
    let folderId = citedLitigation.wrikeFolderId;
    // form data payload
    let formData = new FormData();
    formData.append('description', newDescription);
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + wrikeToken,
            ...formData.getHeaders()
        },
        data: formData
    }
    let url = `https://www.wrike.com/api/v4/folders/${folderId}`
    try {
        const response = await axios(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = response.data;
            let data = body.data;
            if (data.length > 0) {
                if (data[0].scope === "RbFolder") {
                    await restoreIfDeletedFolder(citedLitigation);
                }
                return {"success": true};
            }
        } else {
            let message = `Erro ao atualizar a descrição da pasta ${folderId}.`;
            citedLitigation.errors.push(`<li>${message}</li>`);
            return {"success": false, "message": message};
        }
    } catch (error) {
        let message = `Erro ao atualizar a descrição da pasta ${folderId}`;
        citedLitigation.errors.push(`<li>${message}</li>`);
        return {"success": false, "message": `${message}: ${error}`};
    }
}

async function restoreIfDeletedFolder(citedLitigation) {
    let folderId = citedLitigation.wrikeFolderId;
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/folders/${folderId}?restore=true`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            }
        } else {
            let message = `Erro ao restaurar a pasta ${folderId}.`;
            citedLitigation.errors.push(`<li>${message}</li>`);
            return {"success": false, "message": message};
        }
    } catch (error) {
        let message = `Erro ao restaurar a pasta ${folderId}`;
        citedLitigation.errors.push(`<li>${message}</li>`);
        return {"success": false, "message": `${message}: ${error}`};
    }
}

async function GetFolder(citedLitigation) {
    let folderId = citedLitigation.wrikeFolderId;
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/folders/${folderId}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            citedLitigation.folderTitle = data[0].title;
            if (data.length > 0) {
                return {"success": true, "data": data[0]};
            }
        } else {
            let message = `Erro ao obter os dados da pasta ${folderId}.`;
            return {"success": false, "message": message};
        }
    } catch (error) {
        let message = `Erro ao obter os dados da pasta ${folderId}.`;
        return {"success": false, "message": `${message}: ${error}`};
    }
}

async function createTaskComment(taskId, comment, isPlainText = false) {
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}/comments?text=${comment}&plainText=${isPlainText}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            }
        } else {
            return {"success": false, "message": "Erro criar comentário na tarefa."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro criar comentário na tarefa: " + error};
    }
}

async function searchFolder(folderTitle) {
    folderTitle = folderTitle.replaceAll('/', '_');
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let url = `https://www.wrike.com/api/v4/ediscovery_search?scopes=["folder","project"]&terms=["${folderTitle}"]`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "id": data[0].id};
            } else {
                return {"success": true, "id": null};
            }
        } else {
            return {"success": false, "message": "Erro ao obter dados."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function createFolder(folderTitle, novajusId) {
    folderTitle = folderTitle.replaceAll('/', '_');
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + wrikeToken
        }
    }
    let newCustomField = {"id": novajusIdCustomFieldId, "value": `${novajusId}`};
    let newCustomFields = [newCustomField];
    let url = `https://www.wrike.com/api/v4/folders/${tempLitigationFolderId}/folders?title=${folderTitle}&customFields=${JSON.stringify(newCustomFields)}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status === 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "id": data[0].id};
            }
        } else {
            return {"success": false, "message": "Erro ao criar pasta."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro ao criar pasta: " + error};
    }
}

async function updateFolderNovajusIdCustomField(citedLitigation) {
    let folderId = citedLitigation.wrikeFolderId;
    let novajusId = citedLitigation.novajusId;
    let folderData = await GetFolder(citedLitigation);
    if (folderData.success) {
        let newCustomField = {"id": novajusIdCustomFieldId, "value": `${novajusId}`};
        // replace folderData.customField with id of novajusIdCustomField with newCustomField
        let customFields = folderData.data.customFields;
        let index = customFields.findIndex(x => x.id === novajusIdCustomFieldId);
        if (index > -1) {
            customFields[index] = newCustomField;
        } else {
            customFields.push(newCustomField);
        }
        let config = {
            method: 'put',
            headers: {
                Authorization: 'Bearer ' + wrikeToken
            }
        }
        let url = `https://www.wrike.com/api/v4/folders/${folderId}?customFields=${JSON.stringify(customFields)}`
        try {
            const response = await fetch(url, config).then((response) => {
                return response
            })
            if (response.status === 200) {
                let body = await response.json();
                let data = body.data;
                if (data.length > 0) {
                    return {"success": true, "id": data[0].id};
                }
            } else {
                return {"success": false, "message": `Erro ao atualizar o Novajus Id da pasta ${folderData.title}.`};
            }
        } catch (error) {
            return {
                "success": false,
                "message": `Erro ao atualizar o Novajus Id da pasta ${folderData.title}. Erro: ${error}`
            };
        }
        return {
            "success": false,
            "message": `Erro ao atualizar o Novajus Id da pasta id ${folderId}. Erro: ${folderData.message}`
        };
    }
}

async function updateTaskParentFolder(citedLitigation,) {
    let folderTitle = citedLitigation.folderTitle
    try {
        let folderId = "";
        let response = await searchFolder(folderTitle);
        if (response.success && response.id == null) {
            response = await createFolder(folderTitle, citedLitigation.novajusId);
            if (response.success) {
                folderId = response.id;
                citedLitigation.wrikeFolderId = folderId;
                response = await addTaksParents(citedLitigation);
                if (!response.success) {
                    citedLitigation.errors.push(`<li>Não foi possível Incluir/Criar a pasta relacionada: ${response.message}</li>`)
                }
            }
        } else if (response.success && response.id != null) {
            folderId = response.id;
            citedLitigation.wrikeFolderId = folderId;
            response = await addTaksParents(citedLitigation);
            if (!response.success) {
                citedLitigation.errors.push(`<li>Não foi possível Incluir/Criar a pasta relacionada: ${response.message}</li>`)
            }
            response = await updateFolderNovajusIdCustomField(citedLitigation);
            if (!response.success) {
                citedLitigation.errors.push(`<li>Não foi possível adicionar o id do novajus na pasta indicada: ${response.message}</li>`)
            }
        }
    } catch (error) {
        citedLitigation.errors.push(`<li>Não foi possível incluir Incluir/Criar a pasta relacionada: ${error}</li>`)
    }
}

export {
    getTask,
    searchFolder,
    createFolder,
    updateTaskDescription,
    createTaskComment,
    updateTaskParentFolder,
    updateFolderDescription,
    restoreIfDeletedFolder
}
