/**
 * Virex Sampleshare
 * File: includes.js
 * Description: main methods for NSSF server
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

import sqlstr from "sqlstring"
import externalUsers from "./external_users.js"
import {tempnam} from "tempnam";
import * as fs from "fs";
import exec from "await-exec"
import {createGzip} from "zlib"
import {pipeline} from "stream"
import {promisify} from "util"
import path from "path";
import {CLEAN_ROOT, DIRTY_ROOT, GNU_PATH} from "./server.js";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const VIREX_TEMP_PATH = path.resolve(__dirname, './tmp'); //

// Tables
const CLEAN_TABLE = "samples_clean_scl";
const DIRTY_TABLE = "samples_detected_sde";

// Change the following defines to add support for more compression methods (zlib,zip,rar)
const COMPRESSION_SUPPORTED = ['zlib']

// Change the following defines to add/remove support for hashes (md5,sha,sha256)
const HASH_SUPPORTED = ['md5', 'sha256']

// helper functions
function formatDate(date) {
    if(date){
        return date.getFullYear() + '-' + ((date.getMonth() + 1) < 10 ? '0' : '') + (date.getMonth() + 1) + '-' + date.getDate();
    }
    else
        return null
}

function mkdir(path) {
    const stats = fs.lstatSync(path);
    if (!stats.isDirectory()) {
        fs.mkdirSync(path, '0755');
    }
    return path;
}

function formatTime(date) {
    try {
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    catch (e) {
        console.log(e)
        return null
    }
}

function parseDate (date){
    try {
        const year = date.substring(0, 4);
        const month = date.substring(4, 6) - 1; // months are zero-based in JavaScript
        const day = date.substring(6, 8);
        const hour = date.substring(8, 10);
        console.log(hour)
        const minute = date.substring(10, 12);
        const second = date.substring(12, 14);

        return new Date(year, month, day, hour, minute, second);
    }
    catch (e) {
        console.log(e)
        return null
    }
}

export function exists(path, callback) {
    fs.readFile(path, (err) => {
        if (err) {
            callback(err.code !== 'ENOENT');
        } else callback(true)
    })
}

export function asc2hex(str) {
    var arr1 = [];
    for (var n = 0, l = str.length; n < l; n++) {
        var hex = Number(str.charCodeAt(n)).toString(16);
        arr1.push(hex);
    }
    return arr1.join('');
}

export function bin2hex(s) {
    // http://kevin.vanzonneveld.net
    // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    let i, f = 0,
        a = [];
    s += '';
    f = s.length;
    for (i = 0; i < f; i++) {
        a[i] = s.charCodeAt(i).toString(16).replace(/^([\da-f])$/, "0$1");
    }
    return a.join('');
}

export function getFileSize(path) {
    return fs.statSync(path).size;
}

export function getHeaders(filename, size = null) {
    return {
        'Pragma': 'public',
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename=${filename}`,
        'Content-transfer-encoding': 'binary',
        'Content-length': (size ? size : undefined)
    }
}

const pipe = promisify(pipeline);

// user object class
export class userObj {
    ip_address;
    key_name;
    active;
    approved;
    user_id;
    uuid;
    vendor_id;
    limitation_date;
    rights_clean;
    rights_urls;
    userRightsMask;
    error = "";

    constructor(res) {
        if (res[0]) {
            const row = res[0]
            this.ip_address = row.ip_usr ? row.ip_usr : null;
            this.user_id = row.id_usr;
            this.uuid = row.uuid_usr;
            this.key_name = row.pgp_key_name_usr;
            this.limitation_date = formatDate(row.limitation_date_usr);

            if (row.status_usr === 2) {
                this.active = 1;
                this.approved = 1;
            } else {
                this.active = 0;
                this.approved = 0;
            }
            this.vendor_id = row.company_usr;
            this.rights_clean = row.rights_clean_usr;
            this.rights_urls = row.rights_url_usr;

            if (this.ip_address === undefined){
                this.error = "User-object empty"
            }
            if (this.active === 0){
                this.error = "Account not activated"
            }
            if (this.approved === 0){
                this.error = "Account not approved"
            }
        }else{
            this.error = "User not found"
        }
    }

    static async get_user(sql, uri_user) {
        let querry = `SELECT *
                      FROM external_users_usr
                      WHERE name_usr = ${sqlstr.escape(uri_user)}
                      LIMIT 1`
        const res = await sql.query(querry)
            .catch(e => console.error(e.stack))
        let uObj = new userObj(res);
        uObj.userRightsMask = await externalUsers.getGroupsMaskUserSql(uObj.uuid, sql);
        return uObj;
    }
}


// server object class
export class serverObj {

    host_ip;
    sample;
    filename;
    logger;
    sql;
    uri_utc_from;
    uri_utc_to;
    uri_user;
    uri_action;
    uri_compression;
    uri_hash_type;
    cleanfile;
    vars_dirty_root;
    vars_cleanfiles_root;
    vars_table_cleanfiles;
    vars_table_samples;
    localtime_from;
    localtime_to;
    virex_currentUser;
    virex_DetectionPrefix;
    virex_DetectionSufix;
    virex_CurrentList = false;
    virex_ExtraConditions = [];

    constructor(req, sql, logger) {
        this.host_ip = req.headers['x-forwarded-for']
        this.sql = sql
        this.logger = logger
        const date = new Date();

        // parse all query params
        this.uri_utc_from = req.query['from'] ? req.query['from'] : formatTime(new Date(Date.UTC(2011, 10, 1, 0, 0, 1)));
        this.uri_utc_to = req.query['to'] ? req.query['to'] : formatTime(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 2, 1, 1, 1)));//('Y-m-d H:i:s', mktime(1, 1, 1, date('m'), date('d') + 2, date('Y')));
        this.uri_user = req.query['user'] ? req.query['user'] : '';
        this.uri_action = req.query['action'] ? req.query['action'] : '';
        this.uri_compression = req.query['compression'] ? req.query['compression'] : '';
        this.uri_hash_type = req.query['hash_type'] ? req.query['hash_type'] : '';

        this.logger.info(`Api call ${this.uri_action}, user ${this.uri_user}, from ${this.uri_utc_from} to ${this.uri_utc_to}`)

        this.virex_DetectionPrefix = req.query['detection_prefix'] ? req.query['detection_prefix'] : '';
        this.virex_DetectionSufix = req.query['detection_sufix'] ? req.query['detection_sufix'] : '';

        this.localtime_from = new Date(this.uri_utc_from);
        if (Object.prototype.toString.call(this.localtime_from) === "[object Date]") {
            if (isNaN(this.localtime_from.getTime())) {
                this.localtime_from = parseDate(this.uri_utc_from)
            }
        }
        this.localtime_to = new Date(this.uri_utc_to);
        if (Object.prototype.toString.call(this.localtime_to) === "[object Date]") {
            if (isNaN(this.localtime_to.getTime())) {
                this.localtime_to = parseDate(this.uri_utc_to)
            }
        }

        this.cleanfile = req.query['clean'] && (req.query["clean"] === "true");

        this.vars_dirty_root = DIRTY_ROOT;
        this.vars_cleanfiles_root = CLEAN_ROOT;
        this.vars_table_cleanfiles = CLEAN_TABLE;
        this.vars_table_samples = DIRTY_TABLE;

        if (this.uri_hash_type === "") {
            if (req.query['md5'] && (req.query["md5"] !== null))
                this.uri_hash_type = "md5";
            else if (req.query['sha1'] && (req.query["sha1"] !== null))
                this.uri_hash_type = "sha1";
            else if (req.query['sha256'] && (req.query["sha256"] !== null))
                this.uri_hash_type = "sha256";
            else
                this.uri_hash_type = "md5"; // Default to MD5
        }

        if (!(HASH_SUPPORTED.includes(this.uri_hash_type))) {
            return this.logger.error("ERROR! =>" + this.uri_hash_type + " not supported")
        }
    }

    virex_init() {
        const limitDate = this.virex_currentUser.limitation_date + ' 00:00:01'
        const limitDate_from = (limitDate > formatTime(this.localtime_from)) ? limitDate : formatTime(this.localtime_from);
        const limitDate_to = (limitDate > formatTime(this.localtime_to)) ? limitDate : formatTime(this.localtime_to);

        // set conditions
        this.virex_ExtraConditions = {
            'clean': "samples_clean_scl.added_when_scl >= '" + limitDate_from + "' AND samples_clean_scl.added_when_scl <= '" + limitDate_to + "' AND enabled_scl = 1 ",
            'detected': "samples_detected_sde.added_when_sde >= '" + limitDate_from + "' AND samples_detected_sde.added_when_sde <= '" + limitDate_to + "' AND enabled_sde = 1 ",
            'urls': "urls_url.added_when_url >= '" + limitDate_from + "' AND urls_url.added_when_url <= '" + limitDate_to + "' AND enabled_url = 1 "
        }

        if (!this.virex_currentUser.rights_clean) {
            this.virex_ExtraConditions['clean'] = "0 ";
        }
        if (this.virex_DetectionPrefix) {
            this.virex_ExtraConditions['detected'] += ' AND name_pfx="' + this.virex_DetectionPrefix + '"';
        }
        if (this.virex_DetectionSufix) {
            this.virex_ExtraConditions['detected'] += ' AND detection_sufix_sde LIKE "' + this.virex_DetectionSufix + '%"';
        }
    }

    async encrypt(sample, key) {
        const homedir = mkdir(GNU_PATH); // win path
        let tempfile = tempnam(VIREX_TEMP_PATH, 'sample');
        const encrypted = tempfile + '.gpg';
        fs.copyFileSync(sample, tempfile);
        await exec(`gpg --batch --no-tty --homedir=${homedir} --always-trust --no-secmem-warning -e -r ${key} ${tempfile}`)
        fs.unlink(tempfile, () => {
        })
        return encrypted;
    }

    async encryptBuffer(buffer, key, filename = "buffer.txt", callback) {
        const path = mkdir(GNU_PATH);
        const tempfile = `${VIREX_TEMP_PATH}/${filename}`;
        const encrypted = tempfile + '.gpg';
        fs.open(tempfile, 'w', (e, fd) => {
            if (e) {
                this.logger.error(`Error opening file ${e}`)
                return
            }
            fs.write(fd, buffer, (e) => {
                if (e) {
                    this.logger.error(`Error opening file ${e}`)
                    fs.close(fd, () => {
                    })
                    return
                }
                fs.close(fd, () => {
                })
            })
        })
        key = key.match(/[a-zA-Z0-9-_.]+@[a-zA-Z0-9-_.]+/g);
        await exec(`gpg --batch --no-tty --homedir=${path} --always-trust --no-secmem-warning -e -r ${key} ${tempfile}`)
        fs.unlink(tempfile, () => {
        })

        exists(encrypted, (res) => {
            if (!res) {
                this.logger.error(`Encryption failed ${encrypted}`)
                process.exit(-1);
            }
        })
        fs.readFile(encrypted, {'encoding': "binary"}, (e, result) => {
            if (e) {
                this.logger.error(`File read failed ${encrypted}`)
                process.exit(-1);
            }
            fs.unlink(encrypted, () => {})
            callback(result)
        })
    }

    virex_add_file_to_list(md5, size) {
        if (this.virex_CurrentList) {
            this.sql.query(`INSERT INTO user_files_usf (idusl_usf, md5_usf, date_usf, count_usf, uuidusr_usf,
                                                        file_size_usf, is_detected)
                            VALUES (${this.virex_CurrentList}, '${md5}', NOW(), 0, '${this.virex_currentUser.uuid}',
                                    '${size}', ${this.cleanfile !== true ? 1 : 0})`)
        }
    }

    async virex_register_list_download(number, type = 'Detected') {
        if (!number) return;
        let start_interval = formatDate(this.localtime_from);
        let end_interval = formatDate(this.localtime_to);
        await this.sql.query("INSERT INTO user_lists_usl (date_usl, uuidusr_usl, text_usl, number_of_files_usl, start_interval_usl, end_interval_usl, list_type_usl)" +
            ` VALUES ('${formatTime(new Date())}', '${this.virex_currentUser.uuid}', '${this.virex_DetectionPrefix}/${this.virex_DetectionSufix}',` +
            `'${number}', '${start_interval}', '${end_interval}', '${type}')`);
        let res = await this.sql.query('SELECT LAST_INSERT_ID() as idusr');
        this.virex_CurrentList = parseInt(res[0].idusr);
        this.sql.query(`INSERT INTO permanent_statistics_user_psu (date_psu, hour_psu, uuidusr_psu, files_number_psu,
                                                                   files_size_psu, files_in_list_count_psu)
                        VALUES (CURRENT_DATE, extract(hour from NOW()), '${this.virex_currentUser.uuid}', 0, 0,
                                ${number})
                        ON DUPLICATE KEY UPDATE files_in_list_count_psu=files_in_list_count_psu + ${number}`);
    }

    async virexRegisterFileDownload(md5, fsize, vendor) {
        const user = this.virex_currentUser
        const detected = this.cleanfile !== true ? 1 : 0
        md5 = md5.toUpperCase()
        let stats = await this.sql.query(`SELECT *
                                          FROM user_files_usf
                                          WHERE uuidusr_usf = '${user.uuid}'
                                            AND idusl_usf IS NOT NULL
                                            AND md5_usf = '${md5}'
                                          ORDER BY idusl_usf DESC, date_usf DESC
                                          LIMIT 1`)
        stats = stats[0];
        if (stats) {
            if (stats.date_usf == new Date()) {
                this.sql.query(`UPDATE user_files_usf
                                SET count_usf=count_usf + 1
                                WHERE id_usf = ${stats.id_usf}`)
            } else {
                if (stats.idusl_usf)
                    this.sql.query(`INSERT INTO user_files_usf (idusl_usf, md5_usf, date_usf, count_usf, uuidusr_usf,
                                                                file_size_usf, is_detected, vendor)
                                    VALUES (${stats.idusl_usf}, '${md5}', NOW(), 1, '${user.uuid}', ${fsize},
                                            ${detected}, '${vendor}')`)
                else
                    this.sql.query(`INSERT INTO user_files_usf (md5_usf, date_usf, count_usf, uuidusr_usf, file_size_usf, is_detected, vendor)
                                    VALUES ('${md5}', NOW(), 1, '${user.uuid}', ${fsize}, ${detected}, '${vendor}')`)
            }
        } else
            this.sql.query(`INSERT INTO user_files_usf (md5_usf, date_usf, count_usf, uuidusr_usf, file_size_usf, is_detected, vendor)
                            VALUES ('${md5}', NOW(), 1, '${user.uuid}', ${fsize}, ${detected}, '${vendor}')`)
        this.sql.query(`INSERT INTO permanent_statistics_user_psu (date_psu, hour_psu, uuidusr_psu, files_number_psu, files_size_psu, vendor)
                        VALUES (CURRENT_DATE, extract(hour from NOW()), '${user.uuid}', 1, ${fsize}, '${vendor}')
                        ON DUPLICATE KEY UPDATE files_number_psu=files_number_psu + 1,
                                                files_size_psu=files_size_psu + ${fsize}`);
    }

    async getList(hashalgo = 'md5') {
        let root_path, type, res;
        if (this.cleanfile) {
            root_path = this.vars_cleanfiles_root;
            type = "Clean";
            res = await this.sql.query(externalUsers.getList(type, this.virex_ExtraConditions['clean'], this.virex_currentUser.userRightsMask));
        } else {
            root_path = this.vars_dirty_root;
            type = "Detected";
            res = await this.sql.query(externalUsers.getList(type, this.virex_ExtraConditions['detected'], this.virex_currentUser.userRightsMask));
        }
        if (!res) this.logger.error(`Getlist failed user: ${this.uri_user}`)
        await this.virex_register_list_download(res.length, type);

        let tempfile = tempnam(VIREX_TEMP_PATH, 'hashlist')
        let fd = fs.openSync(tempfile, 'w', null)
        if (!fd) this.logger.error(`Cannot create file ${tempfile}`)
        res.forEach((row) => {
            if (row.size > 0) {
                if (row.md5 === '') return;
                let hex = asc2hex(row.md5.trim().toUpperCase())
                this.virex_add_file_to_list(row.md5.toUpperCase(), row.size)
                let file = root_path + `/${hex.substr(0, 3)}/${hex.substr(3, 3)}/${hex.substr(6, 3)}/${hex}`
                if (!fs.existsSync(file)) return;
                let hash = hashalgo === 'sha256' ? row.sha256.toUpperCase() : row.md5.toUpperCase();
                fs.writeFileSync(fd, `${hash}:${row.size}\r\n`);
            }
        })
        fs.close(fd, () => {
        });
        return tempfile
    }

    verify_gpg(encrypted) {
        let pgphead = [], verofs;
        for (let x = 0; x < 10; x++) {
            pgphead[x] = bin2hex(encrypted[x]);
        }
        if ((pgphead[0] & ~3) !== 84) {
            return 0;
        } else {
            switch (pgphead[0] & 3) {
                case 0:
                    verofs = 2;
                    break;
                case 1:
                    verofs = 3;
                    break;
                case 2:
                    verofs = 5;
                    break;
                case 3:
                    verofs = 1;
                    break;
                default:
                    verofs = 0;
                    break;
            }
            if (parseInt(pgphead[verofs], 16) !== 3 && parseInt(pgphead[verofs], 16) !== 2) {
                return 0;
            } else {
                return 1;
            }
        }
    }

    async getMetadata() {
        const res = await this.sql.query(externalUsers.getList('Detected', this.virex_ExtraConditions['detected'], this.virex_currentUser.userRightsMask));
        let data = [];
        if (!res) this.logger.error(`getMetadata failed user: ${this.uri_user}`)
        else {
            res.forEach((row) => {
                if (row.size > 0) {
                    if (row.md5 === '') return;
                    let hex = asc2hex(row.md5.trim())
                    let file = `${this.vars_dirty_root}/${hex.substr(0, 3)}/${hex.substr(3, 3)}/${hex.substr(6, 3)}/${hex}`
                    if (fs.existsSync(file)) return;
                    data.push(row);
                }
            })
        }

        let xml = `<malwareMetaData xmlns=\"http://xml/metadataSharing.xsd\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://xml/metadataSharing.xsd file:metadataSharing.xsd\" version=\"1.200000\" id=\"10000\">` + "\n";
        xml += "<company>Virex</company>" + "\n"
        xml += "<author>Virex</author>" + "\n"
        xml += "<comment>Virex Norman Sample Share</comment>" + "\n"
        xml += "<timestamp>2022-03-13T13:50:21.721000</timestamp>" + "\n"
        xml += "<objects>" + "\n";

        data.forEach((record) => {
            xml += `<file id="${record.md5}">` + "\n" +
                +`<md5>"${record.md5}"</md5>` + "\n" +
                +`<size>"${record.size}"</size>` + "\n" +
                +"</file>";
        })

        xml += "</objects>" + "\n";
        xml += "</malwareMetaData>" + "\n";

        return xml;
    }

    getComp() {
        let msg = ""
        COMPRESSION_SUPPORTED.forEach((comp) => {
            msg += `${comp}\r\n`
        })
        return msg
    }

    getHash() {
        let msg = ""
        HASH_SUPPORTED.forEach((hash) => {
            msg += `${hash.toUpperCase()}\r\n`
        })
        return msg
    }

    async getSample(hash) {
        let table, rootPath;
        if (this.cleanfile) {
            table = this.vars_table_cleanfiles
            this.filename = `clean_${hash}`
            rootPath = this.vars_cleanfiles_root
        } else {
            table = this.vars_table_samples
            this.filename = `dirty_${hash}`
            rootPath = this.vars_dirty_root
        }
        const hashType = (this.uri_hash_type === "" ? 'md5' : this.uri_hash_type)
        let sqlRes;

        if (this.cleanfile) {
            sqlRes = await this.sql.query(`SELECT ${hashType}_scl as hash, md5_scl as md5, file_size_scl as fsize, type_scl as vendor
                                           FROM ${table}
                                           WHERE ${hashType}_scl = '${hash}'`);
        } else {
            sqlRes = await this.sql.query(`SELECT ${hashType}_sde as hash, md5_sde as md5, file_size_sde as fsize, type_sde as vendor
                                           FROM ${table}
                                           WHERE ${hashType}_sde = '${hash}'`);
        }
        if (!sqlRes) {
            this.logger.error(`getSample failed (sql error) user: ${this.uri_user}`)
            return
        }
        if (sqlRes.length === 0) {
            this.logger.error(`getSample failed (sample not found [db]) user: ${this.uri_user}`)
            return
        }
        let row = sqlRes[0]
        if (row.md5 === "") return;
        await this.virexRegisterFileDownload(row.md5, row.fsize, row.vendor)
        row.md5 = asc2hex(row.md5.trim().toUpperCase())
        this.sample = `${rootPath}/${row.md5.substr(0, 3)}/${row.md5.substr(3, 3)}/${row.md5.substr(6, 3)}/${row.md5}`
        if (!fs.existsSync(this.sample)) {
            this.logger.error(`getSample failed (sample not found [storage]) user: ${this.uri_user}`)
            return
        }
        return this.sample
    }

    // handle sample and
    async handleSample(res, sample) {
        let encrypted;
        if (this.uri_compression !== "") {
            const compSample = await this.compressFile(sample)
            encrypted = await this.encrypt(compSample, this.virex_currentUser.key_name)
            fs.unlink(compSample, () => {
            })
        } else {
            encrypted = await this.encrypt(sample, this.virex_currentUser.key_name)
        }
        fs.readFile(encrypted, {'encoding': 'binary'}, async (e, result) => {
            if (e) {
                this.logger.error(`handleSample failed (reading file) user: ${this.uri_user}`)
                process.exit(-1);
            }
            if (this.verify_gpg(result)) {
                res.writeHead(200, getHeaders(`${this.filename}.gpg`, getFileSize(encrypted)));
                const src = fs.createReadStream(encrypted);
                src.pipe(res)
            } else {
                this.logger.error(`handleSample failed (encryption) user: ${this.uri_user}`)
            }
            fs.unlink(encrypted, () => {
            })
        })
    }

    async do_gzip(sample, compSample) {
        await pipe(fs.createReadStream(sample), createGzip(), fs.createWriteStream(compSample));
    }

    async compressFilezlb(sample) {
        const basename = sample.split('/').reverse()[0]
        const compSample = `${VIREX_TEMP_PATH}/sample_${basename}.gz`
        await this.do_gzip(sample, compSample, (err) => {
            if (err) {
                this.logger.error(`compressFilezlb failed file: ${basename}`)
            }
            if (!fs.existsSync(compSample) || getFileSize(compSample) === 0) {
                this.logger.error(`compressFilezlb failed file: ${basename}`)
                process.exit(-1)
            }
        })
        return compSample
    }

    async compressFile(sample) {
        if (!COMPRESSION_SUPPORTED.includes(this.uri_compression)) {
            this.logger.error(`compressFile failed (not implemented) requested: ${this.uri_compression}`)
            return
        }
        const exec = `compressFile${this.uri_compression}`
        if (typeof this[exec] === "function") {
            return await this[exec](sample)
        } else {
            this.logger.error(`compressFile failed (not implemented) requested: ${this.uri_compression}`)
        }
    }
}