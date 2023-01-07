/**
 * Virex Sampleshare
 * File: server.js
 * Description: main backend server file
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

import router from "./router.js"
import express from 'express'
import jwt from 'jsonwebtoken'
import cookieParser from "cookie-parser"
import crypto from "crypto"
import csprng from "csprng"
import db from "mariadb";
import exec from "await-exec";
import {tempnam} from "tempnam";
import fs from "fs";
import si from "systeminformation"
import externalUsers from "./external_users.js";
import http from 'http'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer'
import smtpTransport from 'nodemailer-smtp-transport'
import winston from 'winston'
import 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// create app
const app = express();
app.use(cors())

let config = fs.readFileSync(process.cwd() + '/config.json')
config = JSON.parse(config)

export const GNU_PATH = config["gnu_path"]
const storage = config["samples_path"]
export const DIRTY_ROOT = path.resolve(storage, './detected')
export const CLEAN_ROOT = path.resolve(storage,'./clean')

export const dbConn = config["db"]
const keys = config["keys"]
const salt1 = config["salt1"]


const log_path = config["win"] ? "" : config["log_path"];
process.env.TZ = 'Europe/Vienna'

const errorTransport = new winston.transports.DailyRotateFile({
    level: 'error',
    filename: `${log_path}error-%DATE%.log`,
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    handleExceptions: true,
    format: winston.format.combine(
        winston.format.printf(({level, message }) => {
            return `${new Date().toLocaleString("en-GB")} ${level}: -- ${message}`;
        })
    )
});

const infoTransport = new winston.transports.DailyRotateFile({
    level: 'debug',
    filename: `${log_path}combined-%DATE%.log`,
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: winston.format.combine(
        winston.format.printf(({ level, message }) => {
            return `${new Date().toLocaleString("en-GB")} ${level}: -- ${message}`;
        })
    )
});

const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    defaultMeta: { service: 'sampleshare' },
    transports: [
        infoTransport,
        errorTransport
    ],
});


logger.error = function (message) {
    logger.log({
        level: 'error',
        message: message,
    });
};
logger.info = function (message) {
    logger.log({
        level: 'info',
        message: message,
    });
};

console.error = function (message) {
    logger.error(message);
};


const sql = await db.createConnection(dbConn)

function hash(pwd) {
    return crypto
        .createHash("md5")
        .update(pwd)
        .digest("hex");
}

function hash_sha256(pwd) {
    return crypto
        .createHash("sha256")
        .update(pwd)
        .digest("base64");
}

async function sendMail(recipient, subj, msg){
    const transporter = nodemailer.createTransport(smtpTransport({
        host: config["mail"]["host"],
        port: config["mail"]["port"],
        secure: false,
        auth: {"user": config["mail"]["user"], "pass": config["mail"]["pass"]},
        tls: {
            ciphers:'SSLv3',
            rejectUnauthorized: false
        }
    }));

    const mailOptions = {
        from: `Virex Sampleshare <${config["mail"]["user"]}>`,
        to: recipient,
        subject: subj,
        text: msg
    };

    await transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            logger.error(`email send failed, recipient : ${recipient}`)
        } else {
            logger.info(`email send success, recipient : ${recipient}, ${info.response}`)
        }
    });
}

async function importPGPKey(PGP){

    const _path = mkdir(GNU_PATH);
    let keyName;
    let tempfile = tempnam(path.resolve(__dirname,'./tmp'), 'public.key'); // win path
    writeToFile(PGP, tempfile)

    try{
        const result = (await exec(`gpg  --homedir=${_path} --import ${tempfile}`)).stderr
        keyName = result.split('\n')[0].split('\"')[1]
    }catch (e){
        fs.unlink(tempfile,() => {})
    }
    if(!keyName){
        return
    }
    fs.unlink(tempfile,() => {})
    return keyName
}

function writeToFile(buffer, path){
    fs.open(path, 'w', (e, fd) => {
        if (e) {
            logger.error(`writeToFile failed file : ${path}`)
            return
        }
        fs.write(fd, buffer, (e) => {
            if (e) {
                logger.error(`writeToFile failed file : ${path}`)
                fs.close(fd, () => {})
                return
            }
            fs.close(fd, () => {})
        })
    })
}

// create directory if not exists
function mkdir(path) {
    const stats = fs.lstatSync(path);
    if (!stats.isDirectory()) {
        fs.mkdirSync(path, '0755');
    }
    return path;
}

// verify middleware
const verify = (req,res,next) =>{
    let token = req.headers.authorization
    if(token){
        token = token.split(' ')[1]
        jwt.verify(token, keys.auth, (err, user) =>{
            if(err){
                return res.status(403).json("Token is not valid!");
            }
            req.user = user
            next()
        })
    }else{
        res.status(401).json("You are not authenitcated!")
    }
}

// authorize middleware
const authorize = (auth, access) => {
    return async(req,res,next) =>{
        let sqlString = `SELECT * FROM external_users_usr WHERE uuid_usr= ? LIMIT 1`
        let sqlRes = await executeQuery(sqlString, [req.user.userid])
        if (!sqlRes[0]){
            sqlString = `SELECT * FROM internal_users_uin WHERE uuid_uin= ? LIMIT 1`
            sqlRes = await executeQuery(sqlString, [req.user.userid])
            if(sqlRes){
                if(!access) {
                    if (!auth) {
                        res.status(403).json("You are not authorized!")
                        return
                    }
                }
                req.user.isInternal = true
                next()
            }
        }else{
            if(auth){
                res.status(403).json("You are not authorized!")
                return
            }
            req.user.isInternal = false
            next()
        }
    }
}

const executeQuery = async (sqlString, params) => {
    return await sql.execute(sqlString, params)
};


app.use(express.json());
app.set('trust proxy', true);
app.use(cookieParser());

var httpServer = http.createServer(app);

// login the user
app.post("/api/login", async (req, res) =>{
    const { username, password } = req.body;
    let user, isInternal;
    let sqlRes;
    // check if user is external
    let sqlString = `SELECT uuid_usr as id, password_usr as password, salt_usr as salt, status_usr as status FROM external_users_usr WHERE name_usr= ? LIMIT 1`
    let result = await executeQuery(sqlString, [username])
    if(result.length !== 0){
        sqlRes = result[0]
        isInternal = false
    } else {
        // check if user is internal
        sqlString = `SELECT uuid_uin as id, password_uin as password, salt_uin as salt FROM internal_users_uin WHERE email_uin= ? LIMIT 1`
        result = await executeQuery(sqlString, [username])
        if(result.length === 0){
            res.status(403).json("Invalid username or password!")
            return
        }
        sqlRes = result[0]
        isInternal = true

    }
    if(hash(`${sqlRes.salt}${hash(`${salt1}${password}`)}`) === sqlRes.password){
        if(sqlRes.status !== null){
            if(sqlRes.status < 1){
                logger.info(`/api/login call 401, unverified from ${req.ip} on user ${sqlRes.id}`)
                res.status(401).json("Please verify your account before logging in!")
                return
            }
        }
        user = {
            userid : sqlRes.id,
            isInternal: isInternal
        }
    }
    if(user) {
        const accessToken = generateAccessToken(user)
        const refreshToken = generateRefreshToken(user)
        await sql.query(`DELETE from tokens WHERE uuid='${user.userid}'`)
        await sql.query(`INSERT INTO tokens (uuid, token) values ('${user.userid}', '${refreshToken}')`)

        res.cookie('refreshtoken', refreshToken, {expires: new Date(Date.now() + 480000 * 1000), httpOnly: true, secure: true})
        // set login time
        if(isInternal){
            await sql.query(`UPDATE internal_users_uin SET last_login_date_uin=NOW() WHERE uuid_uin='${user.userid}'`)
        }else{
            await sql.query(`UPDATE external_users_usr SET last_login_date_usr=NOW() WHERE uuid_usr='${user.userid}'`)
        }
        res.json({
            auth: true,
            userid: user.userid,
            isInternal,
            token: accessToken
        })
    }
    else res.status(403).json("Invalid username or password!")
})

app.put("/api/reset_password", verify, authorize(true), async (req, res) =>{
    const type = req.body.type === "external" ? ["external", "usr"] : ["internal", "uin"]
    let sqlRes = await sql.query(`SELECT salt_${type[1]} as salt,
                                      email_${type[1]} as email
                                      FROM ${type[0]}_users_${type[1]}
                                      WHERE uuid_${type[1]} = '${req.body.userid}'
                                      LIMIT 1`)
    if(sqlRes[0]) {
        console.log(sqlRes[0].salt)
        const password = crypto.randomBytes(10).toString("base64url")
        console.log(password)
        const encoded = hash(`${sqlRes[0].salt}${hash(`${salt1}${password}`)}`)
        console.log(encoded)
        await sql.query(`UPDATE ${type[0]}_users_${type[1]}
                            SET password_${type[1]}='${encoded}'
                            WHERE uuid_${type[1]}='${req.body.userid}'`)

        const subj = 'Password reset'
        const msg = `Your new password for the Sampleshare service: \r\n${password}`
        await sendMail(sqlRes[0].email, subj, msg)
    }

    res.status(200).json("Success")
})

// get external user by id
app.get("/api/get_external_user/:id", verify, authorize(false, true), async (req, res) =>{
    if(req.user.isInternal || req.user.userid === req.params.id)
    {
        let sqlString = `SELECT * from external_users_usr WHERE uuid_usr= ? LIMIT 1`
        const sqlRes = (await executeQuery(sqlString, [req.params.id]))[0]
        if(!sqlRes){
            logger.info(`/api/get_external_user call 500, user doesnt exist on user ${req.params.id}`)
            res.status(500).json("Internal server error")
            return
        }
        const mask = (await externalUsers.getGroupsMaskUserSql(req.params.id, sql)).split('');
        while(mask.length !== 5){
            mask.unshift('0')
        }
        const payload = {
            username: sqlRes.name_usr,
            company: sqlRes.company_usr,
            email: sqlRes.email_usr,
            PGP: sqlRes.public_pgp_key_usr,
            status: sqlRes.status_usr,
            urls: sqlRes.rights_url_usr,
            dailyA: Number(mask[4]),
            dailyB: Number(mask[3]),
            dailyC: Number(mask[2]),
            dailyDroid: Number(mask[1]),
            dailyClean: Number(mask[0]),
        }
        res.status(200).json(payload)
    }else{
        res.status(403).json("Unauthorized")
    }
})

// get internal user by id
app.get("/api/get_internal_user/:id", verify, authorize(true), async (req, res) =>{
    const sqlRes = (await sql.query(`SELECT fname_uin as fname, lname_uin as lname, email_uin as email, enabled_uin as enabled,notification_pgp_error_uin as errors, notification_new_account_request_uin as newacc from internal_users_uin WHERE uuid_uin='${req.params.id}' LIMIT 1`))[0]
    if(!sqlRes){
        logger.info(`/api/get_external_user call 500, user doesnt exist on user ${req.params.id}`)
        res.status(500).json("Internal server error")
        return
    }
    const payload = {
        fname: sqlRes.fname,
        lname: sqlRes.lname,
        email: sqlRes.email,
        errors: !!+sqlRes.errors,
        enabled: !!+sqlRes.enabled,
        newacc: !!+sqlRes.newacc
    }
    res.status(200).json(payload)
})

// change internal user
app.post("/api/internal_change_profile", verify, authorize(true), async (req, res) => {
    const post = req.body.payload
    const sqlRes = (await sql.query(`SELECT fname_uin as fname, lname_uin as lname, email_uin as email, enabled_uin as enabled,notification_pgp_error_uin as errors, notification_new_account_request_uin as newacc from internal_users_uin WHERE uuid_uin='${post.userid}' LIMIT 1`))[0]
    if(!sqlRes){
        logger.info(`/api/get_external_user call 500, user doesnt exist on user ${post.userid}`)
        res.status(500).json("Internal server error")
        return
    }
    if(sqlRes.fname !== post.fname){
        await sql.query(`UPDATE internal_users_uin SET fname_uin='${post.fname}' WHERE uuid_uin='${post.userid}'`)
    }
    if(sqlRes.lname !== post.lname){
        await sql.query(`UPDATE internal_users_uin SET lname_uin='${post.lname}' WHERE uuid_uin='${post.userid}'`)
    }
    if(sqlRes.email !== post.email){
        const sqlRes1 = (await sql.query(`SELECT email_uin as email from internal_users_uin WHERE email_uin='${post.email}' LIMIT 1`))[0]
        if(sqlRes1){
            res.status(409).json("Mail in use")
            return
        }else{
            await sql.query(`UPDATE internal_users_uin SET email_uin='${post.email}' WHERE uuid_uin='${post.userid}'`)
        }

    }
    if(sqlRes.errors !== post.errors){
        await sql.query(`UPDATE internal_users_uin SET notification_pgp_error_uin='${+post.errors}' WHERE uuid_uin='${post.userid}'`)
    }
    if(sqlRes.enabled !== post.enabled){
        await sql.query(`UPDATE internal_users_uin SET enabled_uin='${+post.enabled}' WHERE uuid_uin='${post.userid}'`)
    }
    if(sqlRes.newacc !== post.newacc){
        await sql.query(`UPDATE internal_users_uin SET notification_new_account_request_uin='${+post.newacc}' WHERE uuid_uin='${post.userid}'`)
    }
    res.status(200).json("Success")
})

// change external user
app.post("/api/external_change_profile", verify, authorize(false, true), async (req, res) => {
    const post = req.body.payload
    let sqlString = `SELECT name_usr as username, company_usr as company, email_usr as email, public_pgp_key_usr as pgp FROM external_users_usr WHERE uuid_usr= ?`
    const sqlRes = (await executeQuery(sqlString, post.userid))[0]
    if(!sqlRes){
        res.status(500).json("Internal server error")
        return
    }
    if(post.editRights && req.user.isInternal){
        const mask = 16 * +post.clean + 8 * +post.dailyDroid + 4 * +post.dailyC + 2 * +post.dailyB + +post.dailyA
        await sql.query(`UPDATE groups_usr SET groups='${mask}' WHERE uuid_user='${post.userid}'`)
        await sql.query(`UPDATE external_users_usr SET rights_url_usr='${+post.urls}' WHERE uuid_usr='${post.userid}'`)
    }else{
        if(sqlRes.username !== post.username){
            sqlString = `SELECT name_usr as email from external_users_usr WHERE name_usr= ? LIMIT 1`
            const sqlRes1 = (await executeQuery(sqlString, post.username))[0]
            if(sqlRes1){
                res.status(409).json("Info in use")
                return
            }else {
                sqlString = `UPDATE external_users_usr SET name_usr= ? WHERE uuid_usr= ?`
                await executeQuery(sqlString, [post.username, post.userid])
            }
        }
        if(sqlRes.email !== post.email){
            sqlString = `SELECT email_uin as email from internal_users_uin WHERE email_uin= ? LIMIT 1`
            const sqlRes1 = (await executeQuery(sqlString, post.email))[0]
            if(sqlRes1){
                res.status(409).json("Info in use")
                return
            }else {
                sqlString = `SELECT email_usr as email from external_users_usr WHERE email_usr= ? LIMIT 1`
                const sqlRes1 = (await executeQuery(sqlString, post.email))[0]
                if(sqlRes1){
                    res.status(409).json("Info in use")
                    return
                }else {
                    sqlString = `UPDATE external_users_usr SET email_usr= ? WHERE uuid_usr= ?`
                    await executeQuery(sqlString, [post.email, post.userid])
                }
            }
        }
        if(sqlRes.company !== post.company){
            sqlString = `UPDATE external_users_usr SET company_usr= ? WHERE uuid_usr= ?`
            await executeQuery(sqlString, [post.company, post.userid])
        }
    }
    if(sqlRes.pgp !== post.pgp){
        const pgpKey = await importPGPKey(post.pgp)
        if(pgpKey){
            sqlString = `UPDATE external_users_usr SET public_pgp_key_usr= ?,pgp_key_name_usr= ?  WHERE uuid_usr= ?`
            await executeQuery(sqlString, [post.pgp, pgpKey, post.userid])
        }else{
            logger.error(`/api/external_change_profile, import of key failed on user ${post.userid}`)
            res.status(401).json("Invalid PGP key")
            return
        }
    }
    res.status(200).json("Success")
})

app.get("/api/get_system_specs", verify, authorize(true), async (req, res) =>{
    const payload = {
        os: (await si.osInfo()).platform,
        dbVersion: sql.serverVersion(),
        cpuLoad: (await si.currentLoad()).currentLoad,
        storageSize: (await si.fsSize())[0].size,
        storageUsed: (await si.fsSize())[0].used,
    }
    res.status(200).json(payload)
})

// verify user with password
app.post("/api/verify_user", verify, authorize(false), async (req, res) => {
    const params = req.body
    let sqlString = `SELECT password_usr as pwd, salt_usr as salt FROM external_users_usr WHERE uuid_usr= ?`
    const sqlRes = await executeQuery(sqlString, [params.userid])
    if (sqlRes[0]){
        const hashpwd = hash(`${sqlRes[0].salt}${hash(`${salt1}${params.pwd}`)}`)
        if(hashpwd === sqlRes[0].pwd) {
            res.status(200).json("Success")
        }else {
            res.status(401).json("Wrong password")
            logger.info(`/api/verify_user call 401, unauth from ${req.ip} on user ${params.userid}`)
        }
    }else{
        logger.info(`/api/verify_user call 401, unauth from ${req.ip} on user ${params.userid}`)
        res.status(401).json("Unauthorized")
    }
})

// gets samples from respectible table
app.get("/api/get_samples", verify, authorize(true), async (req, res) => {
    const samples = req.headers.samples
    const page = req.headers.page
    const filters = typeof req.headers.filter === 'string' ? JSON.parse(req.headers.filter) : req.headers.filter
    const sort = typeof req.headers.sort === 'string' ? JSON.parse(req.headers.sort)[0] : req.headers.sort[0]
    let sqlRes;
    // let id = req.headers.key
    if(samples === "clean"){
        sqlRes = await sql.query(filterQuery('scl', filters, sort, page))
    }else if(samples === "detected"){
        sqlRes = await sql.query(filterQuery('sde', filters, sort, page))
    }else if(samples === "urls"){
        sqlRes = await sql.query(`SELECT SQL_CALC_FOUND_ROWS md5_url as MD5, sha256_url as SHA256, added_when_url as Date, url_url as Url, enabled_url as Status FROM urls_url limit 15 offset ${page * 15}`)
    }
    if (sqlRes[0]){
        let sqlRes1 = await sql.query(`SELECT FOUND_ROWS() as total`)
        if(sqlRes1)
            res.status(200).json({data: sqlRes, total: Number(sqlRes1[0].total)})
    }else{
        res.status(200).json({data: [], total: 0})
    }
})

// downloads client zip
app.get("/api/download_client", verify, authorize(false), async (req, res) => {
    const filePath = path.resolve(__dirname,'./client.zip'); // or any file format

    // Check if file specified by the filePath exists
    if (fs.existsSync(filePath)){
        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": "attachment; filename=client.zip"
        });
        fs.createReadStream(filePath).pipe(res);
        return;
    }
    res.writeHead(501, {"Content-Type": "text/plain"});
    res.end("ERROR File does not exist");
})

// change password
app.post("/api/change_password", verify, async (req, res) => {
    const post = req.body.payload
    const args = post.isInternal ? ["uin", "internal_users_uin"] : ["usr", "external_users_usr"];
    const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{10,}$/;
    if(req.user.userid !== post.userid){
        logger.info(`/api/change_password call 401, unauth from ${req.ip} on user ${post.userid}`)
        res.status(401).json("Unauthorized")
        return
    }
    if(!PWD_REGEX.test(post.newPwd)){
        res.status(403).json("Invalid password")
        return
    }
    let sqlString = `SELECT password_${args[0]} as pwd, salt_${args[0]} as salt FROM ${args[1]} WHERE uuid_${args[0]}= ?`
    const sqlRes = await executeQuery(sqlString, [post.userid])
    if (sqlRes[0]){
        const hashpwd = hash(`${sqlRes[0].salt}${hash(`${salt1}${post.oldPwd}`)}`)
        if(hashpwd === sqlRes[0].pwd) {
            let sqlString = `UPDATE ${args[1]} SET password_${args[0]}='${hash(`${sqlRes[0].salt}${hash(`${salt1}${post.newPwd}`)}`)}' WHERE uuid_${args[0]}= ?`
            await executeQuery(sqlString, [post.userid])
            res.status(200).json("Success")
        }else{
            res.status(409).json("Wrong password")
        }
    }else{
        logger.info(`/api/change_password call 401, unauth from ${req.ip} on user ${post.userid}`)
        res.status(401).json("Unauthorized")
    }
})

app.get("/api/get_stats", verify, authorize(true), async (req, res) => {
    const vendor = req.query.vendor
    if(vendor === 'global'){
        const sqlRes = await sql.query(`SELECT date_psu as date, files_number_psu as files, files_size_psu as size FROM permanent_statistics_user_psu where files_number_psu != 0 and date_psu >= "${req.query.from}" and date_psu <= "${req.query.to}" group by date_psu`)
        res.status(200).json(sqlRes)
    }else{
        const sqlRes = await sql.query(`SELECT date_usf as date, count_usf as files, file_size_usf as size FROM user_files_usf where count_usf != 0 and vendor = "${vendor}" and date_usf >= "${req.query.from}" and date_usf <= "${req.query.to}" group by date_usf`)
        res.status(200).json(sqlRes)
    }
})

app.get("/api/hash_lookup", verify, authorize(false), async (req, res) => {
    const hash = req.query.hash
    let sqlString = `SELECT eu.uuid_usr , eu.name_usr, u.date_usf FROM user_files_usf u  LEFT JOIN external_users_usr eu ON eu.uuid_usr = u.uuidusr_usf WHERE u.md5_usf = ? AND u.count_usf > 0`
    const sqlRes = await executeQuery(sqlString, [hash])
    res.status(200).json(sqlRes)
})

app.get("/api/external_get_username/:userid", verify, authorize(false), async (req, res) => {
    const params = req.params
    if(req.user.userid === req.params.userid)
    {
        let sqlString = `SELECT name_usr as user FROM external_users_usr WHERE uuid_usr= ?`
        const sqlRes = await executeQuery(sqlString, [params.userid])
        if (sqlRes[0]){
            res.status(200).json(sqlRes[0].user)
        }
    }else{
        logger.info(`/api/external_get_username call 403, unauth from ${req.ip} on user ${params.userid}`)
        res.status(401).json("Unauthorized")
    }
})

app.get("/api/get_users", verify, authorize(true), async (req, res) => {
    const users = req.headers.users
    const page = req.headers.page
    const filters = typeof req.headers.filter === 'string' ? JSON.parse(req.headers.filter) : req.headers.filter
    const sort = typeof req.headers.sort === 'string' ? JSON.parse(req.headers.sort)[0] : req.headers.sort[0]

    let sqlRes;
    if(users === "external"){
        sqlRes = await sql.query(filterQuery('usr', filters, sort, page))
    }else if(users === "internal"){
        sqlRes = await sql.query(filterQuery('uin', filters, sort, page))
    }
    if (sqlRes){
        let sqlRes1 = await sql.query(`SELECT FOUND_ROWS() as total`)
        if(sqlRes1)
            res.status(200).json({data: sqlRes, total: Number(sqlRes1[0].total)})
    }else{
        res.status(200).json({data: [], total: 0})
    }
})

function filterQuery(table, filters, sort, page){
    let sqlstr
    if(table === 'usr' || table === 'uin'){
        if(table === 'usr'){
            sqlstr = `SELECT SQL_CALC_FOUND_ROWS id_usr as Id, name_usr as Username, company_usr as Company, email_usr as Email, last_login_date_usr as Login, status_usr as Status, uuid_usr as uuid from external_users_usr`
            if(filters.length !== 0){
                sqlstr += ` where `
                filters.forEach(filter => {
                    const operator = filter.type === 'contains' ? 'like' : 'not like'
                    if(filter.column === 'login'){
                        sqlstr += dateFilter(filter, 'last_login_date_'+ table)
                    }else{
                        sqlstr += `${filter.column}_${table} ${operator} '%${filter.value}%'`
                    }
                    sqlstr += ' and'
                })
                sqlstr = sqlstr.slice(0, -4)
            }
            if(sort?.column === 'id') sqlstr += ` order by id_${table} ${sort?.operator}`
            if(sort?.column === 'username') sqlstr += ` order by name_${table} ${sort?.operator}`
            if(sort?.column === 'company') sqlstr += ` order by company_${table} ${sort?.operator}`
            if(sort?.column === 'email') sqlstr += ` order by email_${table} ${sort?.operator}`
            if(sort?.column === 'status') sqlstr += ` order by status_${table} ${sort?.operator}`
            if(sort?.column === 'login') sqlstr += ` order by last_login_date_${table} ${sort?.operator}`
            sqlstr += ` limit 15 offset ${page * 15}`
            return sqlstr
        }else{
            sqlstr = `SELECT SQL_CALC_FOUND_ROWS id_uin as Id, fname_uin as Fname, lname_uin as Lname, email_uin as Email, last_login_date_uin as Login, register_date_uin as Register, uuid_uin as uuid from internal_users_uin`
            if(filters.length !== 0){
                sqlstr += ` where `
                filters.forEach(filter => {
                    const operator = filter.type=== 'contains' ? 'like' : 'not like'
                    switch (filter.column) {
                        case 'register':
                            sqlstr += dateFilter(filter, 'register_date_' + table)
                            break;
                        case 'login':
                            sqlstr += dateFilter(filter, 'last_login_date_'+ table)
                            break;
                        default:
                            sqlstr += `${filter.column}_${table} ${operator} '%${filter.value}%'`
                            break;
                    }
                    sqlstr += ' and '
                })
                sqlstr = sqlstr.slice(0, -4)
            }
            if(sort?.column === 'id') sqlstr += ` order by id_${table} ${sort?.operator}`
            if(sort?.column === 'fname') sqlstr += ` order by fname_${table} ${sort?.operator}`
            if(sort?.column === 'lname') sqlstr += ` order by lname_${table} ${sort?.operator}`
            if(sort?.column === 'email') sqlstr += ` order by email_${table} ${sort?.operator}`
            if(sort?.column === 'login') sqlstr += ` order by last_login_date_${table} ${sort?.operator}`
            if(sort?.column === 'register') sqlstr += ` order by register_date_${table} ${sort?.operator}`
            sqlstr += ` limit 15 offset ${page * 15}`
            return sqlstr
        }
    }else{
        const type = table === 'scl' ? 'clean' : 'detected'
        sqlstr = `SELECT SQL_CALC_FOUND_ROWS id_${table} as Id, md5_${table} as MD5, sha256_${table} as SHA256, added_when_${table} as Date, file_size_${table} as Size, type_${table} as Type, enabled_${table} as Status FROM samples_${type}_${table}`
        if(filters.length !== 0){
            sqlstr += ` where `
            filters.forEach(filter => {
                const operator = filter.type === 'contains' ? 'like' : 'not like'
                switch (filter.column) {
                    case 'id':
                        sqlstr += `id_${table} ${operator} '%${filter.value}%'`
                        break;
                    case 'md5':
                        sqlstr += `md5_${table} ${operator} '%${filter.value}%'`
                        break;
                    case 'sha256':
                        sqlstr += `sha256_${table} ${operator} '%${filter.value}%'`
                        break;
                    case 'date':
                        sqlstr += dateFilter(filter, 'added_when_' + table)
                        break;
                    case 'size':
                        sqlstr += `file_size_${table} ${operator} '%${filter.value}%'`
                        break;
                    case 'status':
                        const value = filter.value === 'enabled' ? 1 : 0
                        sqlstr += `enabled_${table} ${operator} '%${value}%'`
                        break;
                    case 'type':
                        sqlstr += `type_${table} ${operator} '%${filter.value}%'`
                        break;
                    default:
                        break;
                }
                sqlstr += ' and '
            })
            sqlstr = sqlstr.slice(0, -4)
        }
        if(sort?.column === 'id') sqlstr += ` order by id_${table} ${sort?.operator}`
        if(sort?.column === 'md5') sqlstr += ` order by md5_${table} ${sort?.operator}`
        if(sort?.column === 'sha256') sqlstr += ` order by sha256_${table} ${sort?.operator}`
        if(sort?.column === 'date') sqlstr += ` order by added_when_${table} ${sort?.operator}`
        if(sort?.column === 'size') sqlstr += ` order by file_size_${table} ${sort?.operator}`
        if(sort?.column === 'status') sqlstr += ` order by enabled_${table} ${sort?.operator}`
        if(sort?.column === 'type') sqlstr += ` order by type_${table} ${sort?.operator}`
        sqlstr += ` limit 15 offset ${page * 15}`
        console.log(sqlstr)
        return sqlstr
    }
}

function dateFilter(filter, table){
    let sqlstr = ''
    if(filter.operator2){
        sqlstr += dateFilterSql(filter.condition1, table)
        sqlstr += ` ${filter.operator2} `
        sqlstr += dateFilterSql(filter.condition2, table)
    }else{
        sqlstr += dateFilterSql(filter, table)
    }
    return sqlstr
}

function dateFilterSql(filter, table){
    let operator1
    let dateTo
    switch (filter.type) {
        case 'greaterThan':
            operator1 = '>';
            return(`${table} ${operator1} '${filter.dateFrom?.split(' ')[0] + ' 23:59:59'}'`)
        case 'lessThan':
            operator1 = '<';
            return(`${table} ${operator1} '${filter.dateFrom}'`)
        case 'equals':
            operator1 = 'between';
            dateTo = filter.dateFrom?.split(' ')[0] + ' 23:59:59'
            return(`${table} ${operator1} '${filter.dateFrom}' and '${dateTo}'`)
        case 'notEqual':
            operator1 = 'not between';
            dateTo = filter.dateFrom?.split(' ')[0] + ' 23:59:59'
            return(`${table} ${operator1} '${filter.dateFrom}' and '${dateTo}'`)
        case 'inRange':
            operator1 = 'between';
            dateTo = filter.dateTo?.split(' ')[0] + ' 23:59:59'
            return(`${table} ${operator1} '${filter.dateFrom}' and '${dateTo}'`)
    }
}

app.put("/api/disable_samples", verify, authorize(true), async (req, res) => {
    const args = req.body.samples === "clean" ? ["scl", "samples_clean_scl"] : ["sde", "samples_detected_sde"];
    await sql.query(`UPDATE ${args[1]} SET enabled_${args[0]}=0 WHERE id_${args[0]}='${req.body.id}'`)
    res.status(200).json("Success")
})

app.put("/api/enable_samples", verify, authorize(true), async (req, res) => {
    const args = req.body.samples === "clean" ? ["scl", "samples_clean_scl"] : ["sde", "samples_detected_sde"];
    await sql.query(`UPDATE ${args[1]} SET enabled_${args[0]}=1 WHERE id_${args[0]}='${req.body.id}'`)
    res.status(200).json("Success")
})

app.delete("/api/delete_samples", verify, authorize(true), async (req, res) => {
    const args = req.body.samples === "clean" ? ["scl", "samples_clean_scl"] : ["sde", "samples_detected_sde"];
    await sql.query(`DELETE FROM ${args[1]} WHERE id_${args[0]}='${req.body.id}'`)
    const root = req.body.samples === "clean" ?  CLEAN_ROOT : DIRTY_ROOT;
    const md5 = req.body.md5.toUpperCase()
    let file = `${root}/${md5.substr(0, 3)}/${md5.substr(3, 3)}/${md5.substr(6, 3)}/${md5}`
    if(fs.existsSync(file)){
        fs.unlink(file, () => {})
    }
    res.status(200).json("Success")
})

app.post("/api/internal_create_profile", verify, authorize(true), async (req, res) => {
    const post = req.body.payload
    let sqlRes = (await sql.query(`SELECT email_uin from internal_users_uin WHERE email_uin='${post.email}' LIMIT 1`))[0]
    if(sqlRes){
        res.status(409).json("User with this email already exists")
        return
    }
    const salt = csprng(160, 36)
    const pwd = (Math.random() + 1).toString(36).substring(3)
    const hashpwd = hash(`${salt}${hash(`${salt1}${pwd}`)}`)
    sqlRes = await sql.query(`INSERT INTO internal_users_uin  (fname_uin, lname_uin, email_uin, password_uin, register_date_uin, register_by_uin, enabled_uin, notification_new_account_request_uin, notification_pgp_error_uin ,salt_uin, uuid_uin)
                    VALUES ('${post.fname}', '${post.lname}', '${post.email}','${hashpwd}', NOW(), '${post.userid}', '${+post.enabled}', '${+post.newacc}', '${+post.errors}', '${salt}', '${uuidv4()}')`)
    if(!sqlRes){
        res.status(500).json("Internal server error")
        return
    }
    const subj = 'Your Virex Sampleshare Account'
    const msg = `Your credentials: \r\n Login email: ${post.email} \r\n Password: ${pwd}`
    await sendMail(post.email, subj, msg)
    res.status(200).json("Success")
})

app.put("/api/disable_users", verify, authorize(true), async (req, res) => {
    await sql.query(`UPDATE external_users_usr SET status_usr=0 WHERE uuid_usr='${req.body.id}'`)
    res.status(200).json("Success")
})

app.put("/api/enable_users", verify, authorize(true), async (req, res) => {
    await sql.query(`UPDATE external_users_usr SET status_usr=2 WHERE uuid_usr='${req.body.id}'`)
    res.status(200).json("Success")
})

app.delete("/api/delete_users", verify, authorize(true), async (req, res) => {
    const args = req.body.users === "external" ? ["usr", "external_users_usr"] : ["uin", "internal_users_uin"];
    await sql.query(`DELETE FROM ${args[1]} WHERE uuid_${args[0]}='${req.body.id}'`)
    res.status(200).json("Success")
})

app.put("/api/verify", async (req, res) =>{
    let sqlString = `SELECT email_code_usr as code, status_usr as status FROM external_users_usr WHERE email_usr= ?`
    let sqlRes = await executeQuery(sqlString, [req.body.email])
    if (sqlRes[0].code){
        if (sqlRes[0].code === req.body.code && sqlRes[0].status < 1){
            sqlString = `UPDATE external_users_usr SET status_usr=1 WHERE email_usr= ?`
            await executeQuery(sqlString, [req.body.email])
        }
    }
})

// register user and check GPG
app.post("/api/register", async (req, res) =>{
    const post = req.body.payload
    const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{10,}$/;
    if(!PWD_REGEX.test(post.password)){
        res.status(403).json("Invalid password")
        return
    }
    if(post.password === post.repPassword){
        const salt = csprng(160, 36)
        const emailCode = csprng(160, 36)
        const hashpwd = hash(`${salt}${hash(`${salt1}${post.password}`)}`)
        let keyName;
        let sqlString = `SELECT COUNT(uuid_usr) as count FROM external_users_usr WHERE email_usr= ? OR name_usr= ?`
        let sqlRes = await sql.query(sqlString, [post.email, post.user])
        if (sqlRes[0].count == 0){
            const homedir = mkdir(GNU_PATH); // win path
            let tempfile = tempnam(path.resolve(__dirname, './tmp'), 'public.key'); // win path
            writeToFile(post.GPG, tempfile)
            try{
                const result = (await exec(`gpg  --homedir=${homedir} --import ${tempfile}`)).stderr
                keyName = result.split('\n')[0].split('\"')[1]
            }catch (e){
                fs.unlink(tempfile,() => {})
            }
            if(!keyName){
                res.status(401).json("Invalid PGP key")
                return
            }
            fs.unlink(tempfile,() => {})
            const uuid = uuidv4()
            let sqlString = `INSERT INTO external_users_usr (name_usr, company_usr, email_usr, password_usr, public_pgp_key_usr, pgp_key_name_usr, register_date_usr, salt_usr, email_code_usr, limitation_date_usr, uuid_usr) VALUES (?,?,?,?,?,?,NOW(),?,?,NOW() - INTERVAL 1 DAY,?)`
            await executeQuery(sqlString, [post.user, post.company, post.email, hashpwd, post.GPG, keyName, salt, emailCode, uuid])
            await sql.query(`INSERT INTO groups_usr (uuid_user , groups) VALUES ('${uuid}','0')`)

            let subj = 'Verify your Virex Sampleshare Account'
            let msg = `Verify your Sampleshare Account on: \r\n ${config["hostname_url"]}/verify?email=${post.email}&code=${emailCode}`
            await sendMail(post.email, subj, msg)

            sqlRes = await sql.query(`SELECT email_uin as email from internal_users_uin WHERE notification_new_account_request_uin=1`)
            subj = 'New Virex Sampleshare Account'
            msg = `There is a new Sampleshare Account pending for approval: \r\n User: ${post.user} \r\n Company: ${post.company} \r\n Email: ${post.email} \r\n`
            for (let i = 0; i < sqlRes.length; i++){
                await sendMail(sqlRes[i].email, subj, msg)
            }
            res.status(200).json("User created")
        }else{
            res.status(409).json("User exists")
            res.end()
        }
    }

})

// refresh tokens
app.post("/api/refresh", async (req, res) =>{
    const refreshToken = req.cookies.refreshtoken
    if(refreshToken){
        let sqlString = `SELECT * from tokens WHERE token= ?`
        const sqlRes = await sql.query(sqlString, [refreshToken])
        if(sqlRes[0]){
            try{
                jwt.verify(refreshToken, keys.refresh,{clockTimestamp: Math.floor(Date.now() / 1000)}, async (err, user) =>{
                    err && logger.error(`token refresh failed ${err}`)
                    const newAccessToken = generateAccessToken(user)
                    const newRefreshToken = generateRefreshToken(user)
                    await sql.query(`DELETE from tokens WHERE uuid='${sqlRes[0].uuid}'`)
                    await sql.query(`INSERT INTO tokens (uuid, token) values ('${sqlRes[0].uuid}', '${newRefreshToken}')`)
                    res.cookie('refreshtoken', newRefreshToken, {expires: new Date(Date.now() + 480000 * 1000), httpOnly: true, secure: true})
                    res.status(200).json({
                        auth: true,
                        user: user,
                        token: newAccessToken
                    })
                })
            }
            catch (e){
                logger.info(`/api/refresh call 403, from ${req.ip}`)
                return res.status(403).json("Invalid signature of token!")
            }
        }else{
            logger.info(`/api/refresh call 403, bad token from ${req.ip}`)
            return res.status(401).json("You are not authenticated!")
        }
    }else{
        logger.info(`/api/refresh call 403, no token from ${req.ip}`)
        return res.status(401).json("You are not authenticated!")
    }
})

// generate tokens
const generateAccessToken = (user) =>{
    return jwt.sign({userid:user.userid, isInternal: user.isInternal}, keys.auth,{expiresIn: "30s"})
}
const generateRefreshToken = (user) =>{
    return jwt.sign({userid:user.userid, isInternal: user.isInternal},keys.refresh,{expiresIn: "480000s"})
}

// logout user
app.post("/api/logout", async (req, res)=>{
    const refreshToken = req.cookies.refreshtoken
    let sqlString = `DELETE from tokens WHERE token= ?`
    await executeQuery(sqlString, [refreshToken])
    res.cookie('refreshtoken', '', {
        expires: new Date(0),
        httpOnly: true,
        secure: true
    })
    res.status(200).json("You logged out successfully")
    res.end()
})

const verifyWebUser = async (req, res) => {
    let token = req.headers.authorization
    if (token) {
        token = token.split(' ')[1]
        await jwt.verify(token, keys.auth, (err, user) => {
            if (err) return
            req.user = user
        })
    }
}

app.get("/api", async (req, res) => {
    await verifyWebUser(req, res)
    let webAuth = false
    if(req.user){
        let userid = req.user.userid
        let sqlString = `SELECT status_usr from external_users_usr WHERE uuid_usr= ?`
        const sqlRes = await executeQuery(sqlString, [userid])
        if(sqlRes[0].status_usr === 2){
            webAuth = true
        }
    }
    let auth;
    try{
        auth = Buffer.from(req.headers.authorization.split(" ")[1],'base64').toString('ascii').split(":")
    }
    catch (e){
        const headers = req.rawHeaders;
        let authHeader;
        headers.find((header, index) => {
            if (header.toLowerCase() === 'authorization') {
                authHeader = headers[index + 1];
            }
        });
        logger.info(`raw header ${authHeader}`)
        logger.info(`${e}`)
        logger.info(`/api call  401, from ${req.ip} headers ${JSON.stringify(req.headers)} body ${JSON.stringify(req.body)}`)
        res.status(401).json("Invalid username or password!")
        return
    }

    let sqlString = `SELECT id_usr as id, password_usr as password, salt_usr as salt, status_usr as status FROM external_users_usr WHERE name_usr= ? LIMIT 1`
    let sqlRes = await executeQuery(sqlString, [auth[0]])
    if(!sqlRes[0]){
        if(!webAuth){
            logger.info(`/api call 401, from ${req.ip} on user ${auth[0]}`)
            res.status(401).json("Invalid username or password!")
            return
        }
    }

    try{
        if(hash(`${sqlRes[0].salt}${hash(`${salt1}${auth[1]}`)}`) === sqlRes[0].password){
            if (sqlRes[0].status !== null || webAuth) {
                if (sqlRes[0].status < 1) {
                    logger.info(`/api call not verified, from ${req.ip} on user ${auth[0]}`)
                    res.status(403).json("Please verify your account!")
                    return
                }
                try{
                    await router(req, res, logger);
                }
                catch(e){
                    logger.info(`${e}`)
                }
            }
        }else{
            logger.info(`/api call  401, from ${req.ip} on user ${auth[0]}`)
            res.status(401).json("Invalid username or password!")
        }
    }
    catch (e){
        if (webAuth) {
            try{
                await router(req, res, logger);
            }
            catch(e){
                logger.info(`${e}`)
            }
        }
    }

});

app.get("/api/ping", (req, res) => {
    res.status(200).json("ACK")
    res.end()
});

httpServer.listen(process.env.PORT, () =>{
    console.log(`Server started on HTTP` + process.env.PORT)
});
