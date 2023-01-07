/**
 * Virex Sampleshare
 * File: router.js
 * Description: routing for NSSF server
 * Author: Michal Visnovsky
 * Date: 1.5.2022
 *
 * This code is provided to the community under the two-clause BSD license as
 * follows:
 *
 * Copyright (C) 2023 ESET
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {exists, getFileSize, getHeaders, serverObj, userObj} from "./includes.js";
import fs from "fs";
import db from "mariadb";
import {dbConn} from "./server.js";


export default async function router(req, res, logger) {
    // initialize
    const sql = await db.createConnection(dbConn)
    const sObj = new serverObj(req, sql, logger);
    sObj.virex_currentUser = await userObj.get_user(sObj.sql, sObj.uri_user, res);
    if(sObj.virex_currentUser.error !== "") {
        res.status(400).json(sObj.virex_currentUser.error)
        return
    }
    sObj.virex_init();
    // switch operations
    if (req.query['from']) {
        switch (sObj.uri_action) {
            case "getlist":
                await serveGetList(req, res, sObj);
                break;
            case "getmetadata":
                await serveGetMetadata(req, res, sObj);
                break;
            case "geturls":
                await serveGetUrls(req, res, sObj);
                break;
        }
    }
    else {
        switch (sObj.uri_action){
            case "get_supported_compression":
                await serveGetComp(req, res, sObj);
                break;
            case "get_supported_hashes":
                await serveGetHash(req, res, sObj);
                break;
            case "getfile_by_list":
                await serveGetByList(req, res, sObj);
                break;
            case "getfile":
                await serveGetFile(req, res, sObj);
                break;
        }
    }
    await sql.end()
}

// gets list of samples from server
async function serveGetList(req, res, sObj) {
    if (req.query['clean'] && (req.query["clean"] === "true")) {
        if (!sObj.virex_currentUser.rights_clean) {
            sObj.logger.error(`serveGetList failed (insufficient permissions) user: ${this.uri_user}`)
            process.exit(-1);
        }
    }
    const tempfile = await sObj.getList(req.query["hashalgo"])
    let encrypted = '';
    encrypted = await sObj.encrypt(tempfile, sObj.virex_currentUser.key_name)
    exists(encrypted, (res) => {
        if (!res) {
            sObj.logger.error(`serveGetList failed (encryption) file: ${encrypted}`)
            process.exit(-1);
        }
    })
    fs.readFile(encrypted, {'encoding': "binary"}, (e, result) => {
        if (e) {
            sObj.logger.error(`serveGetList failed (read) file: ${encrypted}`)
            process.exit(-1);
        }
        if (sObj.verify_gpg(result)) {
            res.writeHead(200, getHeaders("hashlist.gpg", getFileSize(encrypted)));
            const src = fs.createReadStream(encrypted);
            src.pipe(res)
            sObj.logger.info(`serveGetList success file: ${encrypted} - ${getFileSize(encrypted)}`)
            fs.unlink(encrypted, () => {})
        } else {
            sObj.logger.error(`serveGetList failed (encryption) file: ${encrypted}`)
        }
    })
    fs.unlink(tempfile, () => {})
}

// gets metadata from server
async function serveGetMetadata(req, res, sObj) {
    const metadata = await sObj.getMetadata();
    await sObj.encryptBuffer(metadata, sObj.virex_currentUser.key_name, 'metadata.txt', (result) => {
        if (sObj.verify_gpg(result)) {
            res.writeHead(200, getHeaders("hashlist.gpg", result.length));
            res.end(result);
        } else {
            sObj.logger.error(`serveGetMetadata failed (read) user: ${sObj.uri_user}`)
            res.status(404).end();
        }
    });
}

// fetches urls from server
async function serveGetUrls(req, res, sObj) {
    let urls = "";
    if (!sObj.virex_currentUser.rights_urls) {
        sObj.logger.error(`serveGetUrls failed (insufficient permissions) user: ${sObj.uri_user}`)
        return;
    } else {
        const sqlRes = await sObj.sql.query(`SELECT url_url
                                             FROM urls_url
                                             WHERE ${sObj.virex_ExtraConditions['urls']}
                                             LIMIT 0,400000`)
        sqlRes.rows.forEach((row) => {
            urls += `${row.url_url}\n`
        })
        if (urls.trim() === "") {
            return
        }
    }

    await sObj.encryptBuffer(urls, sObj.virex_currentUser.key_name, 'urls.txt', (result) => {
        if (sObj.verify_gpg(result)) {
            res.writeHead(200, getHeaders("urls.gpg", result.length));
            res.end(result);
        } else {
            sObj.logger.error(`serveGetUrls failed (encryption) user: ${sObj.uri_user}`)
        }
    })
}

// get compressions
function serveGetComp(req, res, sObj) {
    res.end(sObj.getComp());
}

// get hashes
function serveGetHash(req, res, sObj) {
    res.end(sObj.getHash());
}

// get single file
async function serveGetFile(req, res, sObj) {
    const hash = (req.query[sObj.uri_hash_type])
    const sample = await sObj.getSample(hash)
    if (sample) {
        await sObj.handleSample(res, sample)
        sObj.logger.info(`serveGetFile success file: ${sample} - ${getFileSize(sample)}`)
    } else {
        res.status(404).end('Unable to retrieve sample');
    }
}

// get files by list
async function serveGetByList(req, res, sObj) {
    const hashlist = (req.query['md5list'] !== "" ? req.query['md5list'] : req.query['hashlist']);
    sObj.uri_hash_type = (req.query['uri_hash_type'] === "sha256" ? "sha256" : "md5");
    res.writeHead(200, getHeaders(`block.gpg`));

    const arr = hashlist.split(':')
    if (arr[arr.length - 1] === "") arr[arr.length - 1].pop()
    for(let i = 0; i < arr.length; i++){
        if (arr[i] !== "") {
            arr[i] = arr[i].toUpperCase()
            const sample = await sObj.getSample(arr[i])
            if(sample){
                await sObj.handleSample(res, sample)
            }
        }
    }
}