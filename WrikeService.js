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

async function addTaksParents(citedLitigation, parentId) {
    let taskId = citedLitigation.taskId;
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
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let url = `https://www.wrike.com/api/v4/tasks/${taskId}?description=${newDescription}`
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
            return {"success": false, "message": "Erro ao atualizar a descrição da tarefa."};
        }
    } catch (error) {
        return {"success": false, "message": "Erro ao atualizar a descrição da tarefa: " + error};
    }
}

async function updateFolderDescription(citedLitigation, newDescription) {
    let folderId = citedLitigation.folderId;
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
        if (response.status === 200) {
            let body = await response.json();
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
    let folderId = citedLitigation.folderId;
    let config = {
        method: 'put',
        headers: {
            Authorization: 'Bearer ' + token
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

async function GetFolder(folderId) {
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + token
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
            Authorization: 'Bearer ' + token
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
            Authorization: 'Bearer ' + token
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

async function createFolder(folderTitle) {
    folderTitle = folderTitle.replaceAll('/', '_');
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
        if (response.status === 200) {
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
                response = await addTaksParents(citedLitigation, folderId);
                if (!response.success) {
                    citedLitigation.errors.push(`<li>Não foi possível Incluir/Criar a pasta relacionada: ${response.message}</li>`)
                }
            }
        } else if (response.success && response.id != null) {
            folderId = response.id;
            citedLitigation.folderId = folderId;
            response = await addTaksParents(citedLitigation, folderId);
            if (!response.success) {
                citedLitigation.errors.push(`<li>Não foi possível Incluir/Criar a pasta relacionada: ${response.message}</li>`)
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
