import {GetWrikeToken} from './WrikeAuth.js'
import fetch from 'node-fetch'

const token = await GetWrikeToken()
let tempLitigationFolderId = "IEABJD3YI44HKA7O";


async function getTask(taskId) {
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status == 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "wrikeTask": data[0]};
            } else {
                return {"success": true, "wrikeTask": null};
            }
        } else {
            return {"success": false, "message": "Erro ao obter dados."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function addTaksParents(taskId, parentId) {
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}?addParents=["${parentId}"]`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status == 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            } else {
                return {"success": false, "message": "Erro ao obter dados."};
            }
        } else {
            return {"success": false, "message": "Erro ao obter dados."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function updateTaskDescription(taskId, newDescription) {
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}?description=["${newDescription}"]`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status == 200) {
            let body = await response.json();
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

async function updateFolderDescription(folderId, newDescription) {
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/folders/${folderId}?description=${newDescription}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status == 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true};
            }
        } else {
            let message = `Erro ao atualizar a descrição da pasta ${folderId}.`;
            return {"success": false, "message": message};
        }
    } catch (error) {
        let message = `Erro ao atualizar a descrição da pasta ${folderId}`;
        return {"success": false, "message": `${message}: ${error}`};
    }
}

async function createTaskComment(taskId, comment, isPlainText = false) {
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}/comments?text=${comment}&plainText=${isPlainText}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status == 200) {
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
    folderTitle.replaceAll('/', '_');
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/ediscovery_search?scopes=["folder","project"]&terms=["${folderTitle}"]`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status == 200) {
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

async function createFolder(folderTitle) {
    folderTitle.replaceAll('/', '_');
    let config = {
        method: 'post',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/folders/${tempLitigationFolderId}/folders?title=${folderTitle}`
    try {
        const response = await fetch(url, config).then((response) => {
            return response
        })
        if (response.status == 200) {
            let body = await response.json();
            let data = body.data;
            if (data.length > 0) {
                return {"success": true, "id": data[0].id};
            }
        } else {
            return {"success": false, "message": "Erro ao obter dados."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro: " + error};
    }
}

async function updateTaskParentFolder(citedLitigation, folderTitle) {
    try {
        let folderId = "";
        let response = await searchFolder(folderTitle);
        if (response.success && response.id == null) {
            response = await createFolder(folderTitle);
            if (response.success) {
                folderId = response.id;
                citedLitigation.folderId = folderId;
                response = await addTaksParents(citedLitigation.taskId, folderId.id);
                if (!response.success) {
                    citedLitigation.errors.push(`<li>Não foi possível incluir Incluir/Criar a pasta relacionada: ${response.message}</li>`)
                }
            }
        } else if (response.success && response.id != null) {
            folderId = response.id;
            citedLitigation.folderId = folderId;
            response = await addTaksParents(citedLitigation.taskId, folderId);
            if (!response.success) {
                citedLitigation.errors.push(`<li>Não foi possível incluir Incluir/Criar a pasta relacionada: ${response.message}</li>`)
            }
        }
    } catch (error) {
        citedLitigation.errors.push(`<li>Não foi possível incluir Incluir/Criar a pasta relacionada: ${error}</li>`)
    }
}

async function appendError(citedLitigation, message) {
    //push new item to citedLitigation.details, between tha last and penultimate
    citedLitigation.htmlDescription.splice(
        citedLitigation.htmlDescription.length - 1,
        0,
        `<div>Não foi possível incluir Incluir/Criar a pasta relacionada: ${message}</div>`
    );
}

export {
    getTask,
    searchFolder,
    createFolder,
    updateTaskDescription,
    createTaskComment,
    updateTaskParentFolder,
    updateFolderDescription
}
