import {getLegalOneToken} from './LegalOneAuth.js'
import fetch from 'node-fetch'
import fs from 'fs'
import * as v from 'validate-cnj'
import {updateTaskParentFolder} from "./WrikeService.js";

const reCNJ = /(?<cnj>\d{7}-\d{2}.\d{4}.\d.\d{2}.\d{4}|.*?\d{20})(?<grau>\s[\d\w]+)?/
const reProcFolder = /(?<folder>Proc-\d{7}\/\d+|Proc-\d{7})/

const money = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
})

const novajusStatuses = {
    1: 'Ativo',
    2: 'Suspenso',
    3: 'Baixado',
    4: 'Arquivado'
}

const litigationTypes = {
    Lawsuit: 'Processo',
    Appeal: 'Recurso',
    ProceduralIssue: 'Incidente'
}

const esferaTypes = {
    Judicial: 'Judicial',
    Administrative: 'Administrativo',
    Arbitral: 'Arbitral'
}

async function getLitigationsByQuery(citedLitigation) {
    let query = citedLitigation.litigation;
    let queryType = await checkQueryType(query)
    switch (queryType.type) {
        case 'identifierNumber':
            return await getLitigationsByCNJOrFolder(citedLitigation, queryType.value, queryType.type)
        case 'folder':
            return await getLitigationsByCNJOrFolder(citedLitigation, queryType.value, queryType.type)
        default:
            if (query.startsWith('Proc')) {
                return {success: false, content: `${query}: Pasta inválida?.`}
            }
            return {success: false, content: `${query}: CNJ inválido.`}
    }
}

async function getLitigationsByCNJOrFolder(
    citedLitigation,
    value,
    filter,
    retry = 0,
    forceToken = false
) {
    let token = await getLegalOneToken(forceToken)
    let config = {
        method: 'get',
        headers: {
            Authorization: 'Bearer ' + token
        }
    }
    let odataFilter = `${filter} eq \'${value}\'`
    let url = `https://api.thomsonreuters.com/legalone/v1/api/rest/Litigations?$filter=${odataFilter}&$expand=participants`
    try {
        const response = await fetch(url, config).then((response) => {
            if (!response.ok) {
                if (retry < 3) {
                    return getLitigationsByCNJOrFolder(
                        citedLitigation,
                        value,
                        filter,
                        retry + 1,
                        (forceToken = true)
                    )
                }
            }
            return response
        })
        if (response.status === 200) {
            let body = await response.json()
            if (body.value.length > 0) {
                let litigationData = []
                for (let i = 0; i < body.value.length; i++) {
                    const litigation = body.value[i]
                    litigationData.push({
                        id: litigation.id,
                        litigationType: litigation.litigationType,
                        status: litigation.statusId
                            ? novajusStatuses[litigation.statusId]
                            : 'Não Indicado',
                        distributionDate: new Date(
                            litigation.distributionDate
                        ).toLocaleDateString('pt-BR'),
                        title: litigation.title,
                        type: litigation.type,
                        actionType: '--',
                        folder: litigation.folder,
                        cnj: litigation.identifierNumber
                            ? litigation.identifierNumber
                            : null,
                        otherNumber: litigation.otherNumber ? litigation.otherNumber : null,
                        actionTypeId: litigation.actionTypeId,
                        state: '--',
                        city: '--',
                        stateId: litigation.stateId,
                        cityId: litigation.cityId,
                        levelId: litigation.levelId,
                        courtId: litigation.courtId,
                        jurisdictionId: litigation.jurisdictionId,
                        monetaryAmount: money.format(litigation.monetaryAmount)
                            ? money.format(litigation.monetaryAmount)
                            : 'Não Indicado',
                        participants: litigation.participants ? litigation.participants : [],
                        updates: (await getTheLatestThreeLitigationUpdates(litigation.id)).content,
                    })
                }
                let results = async () => {
                    return Promise.all(
                        litigationData.map(async (litigation) => {
                            litigation.participants = litigation.participants
                                ? (litigation.participants = await getLawsuitParticipants(
                                    litigation.participants,
                                    token
                                ))
                                : []
                        })
                    )
                }
                await Promise.resolve(results())
                let methods = [];
                citedLitigation.htmlDescription = await createLitigationHTMLBlock(litigationData);
                let folderTitle = litigationData.length === 1 ? litigationData[0].folder : null;
                if (folderTitle != null) {
                    citedLitigation.novajusId = litigationData[0].id;
                    citedLitigation.folderTitle = folderTitle;
                    methods.push(await updateTaskParentFolder(citedLitigation))
                } else {
                    citedLitigation.comments.push(`Múltiplos processos encontrados. Inclua/crie as etiquetas de pastas manualmente.`)
                }
                let response = await Promise.all(methods);
                if (!response.success) {
                    console.log(response.message);
                }
                return {
                    success: true,
                    content: "Litigations found!"
                }
            } else {
                citedLitigation.htmlDescription.push(`<li><strong>❗ ${cl.litigation} - Não Encontrado.</strong></li>`)
                return {success: false, content: 'Não encontrado.'}
            }
        } else if (response.status === 401) {
            if (retry < 3) {
                return getLitigationsByCNJOrFolder(
                    value,
                    filter,
                    retry + 1,
                    (forceToken = true)
                )
            }
        } else {
            citedLitigation.htmlDescription.push(`<li><strong>❗ ${cl.litigation} - Não Encontrado.</strong></li>`)
            return {success: false, content: 'Não encontrado.'}
        }
    } catch (error) {
        if (retry < 3) {
            return getLitigationsByCNJOrFolder(value, filter, retry + 1)
        } else {
            return {success: false, content: 'Erro: ' + error}
        }
    }
}

async function createLitigationHTMLBlock(litigationData) {
    let payload = [];
    let idx = 0;
    litigationData.forEach((litigation) => {
        idx += 1;
        let header
        if (litigation.cnj) {
            header = `${litigation.folder} - ${litigation.cnj}`
        } else if (litigation.otherNumber) {
            header = `${litigation.folder} - ${litigation.otherNumber}`
        } else {
            header = `${litigation.folder}`
        }

        let clientePrincipal
        litigation.participants.forEach((p) => {
            if (p.type === 'Customer' && p.main) {
                clientePrincipal = p.name
            }
        })

        let contrarioPrincipal
        litigation.participants.forEach((p) => {
            if (p.type === 'OtherParty' && p.main) {
                contrarioPrincipal = p.name
            }
        })

        //add header
        payload.push(`<li style="margin-bottom: 10px" id="item-${idx}"><strong>${header}</strong>`);
        payload.push(`<div style="margin-left: 10px">`);
        //add Main Info
        payload.push(`<div><strong>Tipo: </strong>${esferaTypes[litigation.type]}/${litigationTypes[litigation.litigationType]} / <strong>Título: </strong>${litigation.title}</div>`)
        //add Participant Info
        payload.push(`<div><strong>Cliente Principal: </strong>${clientePrincipal} / <strong>Contrário Principal: </strong>${contrarioPrincipal}</div>`);

        //add Novajus e Incluir links
        payload.push(`<div>`);
        payload.push(`<a href="https://rj.novajus.com.br/processos/processos/details/${litigation.id}" style="margin-right: 4px">Novajus</a> `);
        // litigation updates
        if (litigation.updates.length > 0) {
            for (let i = 0; i < litigation.updates.length; i++) {
                payload.push(litigation.updates[i]);
            }
        }
        //close divs
        payload.push("</div>");
        payload.push("</div>");
        payload.push("</li>");
    })
    return payload
}

// Get Lawsuit Participants
async function getLawsuitParticipants(
    lawsuitParticipants,
    token = null,
    retry = 3
) {
    if (lawsuitParticipants.length > 0) {
        if (token == null) {
            token = await getLegalOneToken()
        }
        let config = {
            method: 'get',
            headers: {
                Authorization: 'Bearer ' + token
            }
        }
        let participantsInfo = []
        try {
            const results = async () => {
                return Promise.all(
                    lawsuitParticipants.map(async (p) => {
                        if (p.type === 'Customer' || p.type === 'OtherParty') {
                            const response = await fetch(
                                `https://api.thomsonreuters.com/legalone/v1/api/rest/contacts/${p.contactId}`,
                                config
                            ).then((response) => {
                                if (!response.ok) {
                                    if (retry < 3) {
                                        return getLawsuitParticipants(
                                            lawsuitParticipants,
                                            token,
                                            retry + 1
                                        )
                                    }
                                }
                                return response
                            })
                            let body = await response.json()
                            participantsInfo.push({
                                type: p.type,
                                main: p.isMainParticipant,
                                name: body.name,
                                contactId: p.contactId,
                                identificationNumber: body.identificationNumber
                            })
                        }
                    })
                )
            }
            await Promise.resolve(results())
            return participantsInfo
        } catch (error) {
            return ['❌']
        }
    } else {
        return {success: false, content: []}
    }
}

//Get Action Type
async function getActionType(actionTypeId, token = null, retry = 3) {
    if (actionTypeId != null) {
        try {
            if (token == null) {
                token = await getLegalOneToken()
            }
            let config = {
                method: 'get',
                headers: {
                    Authorization: 'Bearer ' + token
                }
            }
            const response = await fetch(
                `https://api.thomsonreuters.com/legalone/v1/api/rest/LitigationActionAppealProceduralIssueTypes/${actionTypeId}`,
                config
            ).then((response) => {
                if (!response.ok) {
                    if (retry < 3) {
                        return getActionType(actionTypeId, token, retry + 1)
                    }
                }
                return response
            })
            let body = await response.json()
            return body.name
        } catch (error) {
            ;('❌')
        }
    } else {
        return 'Não Indicado'
    }
}

//Get State
async function getState(stateId, token = null, retry = 3) {
    if (stateId != null) {
        try {
            if (token == null) {
                token = await getLegalOneToken()
            }
            let config = {
                method: 'get',
                headers: {
                    Authorization: 'Bearer ' + token
                }
            }
            const response = await fetch(
                `https://api.thomsonreuters.com/legalone/v1/api/rest/States/${stateId}`,
                config
            ).then((response) => {
                if (!response.ok) {
                    if (retry < 3) {
                        return getState(stateId, token, retry + 1)
                    }
                }
                return response
            })
            let body = await response.json()
            return body.name
        } catch (error) {
            ;('❌')
        }
    } else {
        return 'Não Indicado'
    }
}

//Get the latest three Litigation Updates
async function getTheLatestThreeLitigationUpdates(litigationId, token = null, retry = 3) {
    if (litigationId != null) {
        try {
            if (token == null) {
                token = await getLegalOneToken()
            }
            let config = {
                method: 'get',
                headers: {
                    Authorization: 'Bearer ' + token
                }
            }
            const response = await fetch(
                `https://api.thomsonreuters.com/legalone/v1/api/rest/Updates?$orderby=creationDate desc&$top=3&$filter=relationships/any(d:d/linkId eq ${litigationId}) and typeId eq 363`,
                config
            ).then((response) => {
                if (!response.status !== 200) {
                    if (retry < 3) {
                        return getTheLatestThreeLitigationUpdates(litigationId, token, retry + 1)
                    }
                }
                return response
            })
            let body = await response.json()
            let updatesBlocks = await createLitigationsUpdateHTMLBlock(body.value);
            return {success: true, content: updatesBlocks}
        } catch (error) {
            return {success: false, content: [`<ul><li>❌ + ${error}</ul></li>`]}
        }
    } else {
        return {success: false, content: [`<ul><li>'Litigation Id não indicado'</ul></li>`]}
    }
}


async function createLitigationsUpdateHTMLBlock(litigationsUpdates){
    if (litigationsUpdates.length > 0) {
        let htmlBlock = []
        htmlBlock.push("<ul>")
        litigationsUpdates.forEach(update => {
            htmlBlock.push(`<li>${update.description}</li>`)
        })
        htmlBlock.push("</ul>")
        return htmlBlock
    } else {
        return []
    }
}

async function getLawsuitRemainingData(lawsuitData, token = null) {
    try {
        let methods = [
            (lawsuitData.state = await getState(lawsuitData.stateId, token)),
            (lawsuitData.city = await getCity(lawsuitData.cityId, token)),
            (lawsuitData.actionType = await getActionType(
                lawsuitData.actionTypeId,
                token
            ))
        ]
        let results = async () => {
            return Promise.all(methods)
        }
        await Promise.resolve(results())
        return lawsuitData
    } catch (error) {
        return {success: false, content: 'Erro: ' + error}
    }
}

async function savePayloadData(payload) {
    const jsonPayload = JSON.stringify(payload)
    let payloadFile = `payloadData.json`
    fs.writeFile(payloadFile, jsonPayload, function (err) {
        if (err) return console.log(err)
    })
}

async function saveLawsuitData(lawsuitData) {
    const jsonLawsuitData = JSON.stringify(lawsuitData)
    let lawsuitDataFile = `lawsuitData.json`
    fs.writeFile(lawsuitDataFile, jsonLawsuitData, function (err) {
        if (err) return console.log(err)
    })
}

async function checkQueryType(query) {
    if (query.match(reProcFolder)) {
        let folder = query.match(reProcFolder).groups['folder']
        return {type: 'folder', value: folder}
    } else if (query.match(reCNJ)) {
        let cnj = query.match(reCNJ).groups['cnj']
        let validate
        validate = v.Validate.load(cnj)
        return {type: 'identifierNumber', value: validate.generate()}
    } else {
        return {type: 'invalid', value: {queryType: 'invalid', value: query}}
    }
}

async function batchGetLitigationsByQuery(citedLitigations) {
    try {
        let methods = [];
        let cl;
        for (cl of citedLitigations) {
            methods.push(getLitigationsByQuery(cl));
        }
        let results = async () => {
            return Promise.all(methods)
        }
        await Promise.resolve(results())
    } catch (error) {
        console.log("Error:" + error)
    }
}

export {
    getLitigationsByQuery,
    getLawsuitParticipants,
    getLawsuitRemainingData,
    saveLawsuitData,
    savePayloadData,
    checkQueryType,
    createLitigationHTMLBlock,
    batchGetLitigationsByQuery
}
