/**
 * Virex Sampleshare
 * File: external_users.js
 * Description: group policy helper class
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

export default class externalUsers {
    static TBL_GROUPS = "groups";
    static TBL_GROUPS_USR = "groups_usr";
    static TBL_SAMPLES_CLEAN = "samples_clean_scl";
    static TBL_SAMPLES_DETECTED = "samples_detected_sde";

    static async getGroupsUserSql(user_id, sql) {
        let bits;
        let sqlString = `SELECT groups from ${this.TBL_GROUPS_USR} where uuid_user = ? limit 1`
        const res = await sql.query(sqlString, [user_id])
        if (res[0]) {
            bits = res[0].groups ? res[0].groups : 0;
        }
        return this.bitmaskToArray(bits);
    }

    static async getGroupsMaskUserSql(user_id, sql) {
        let sum = 0;
        for (const [k, v] of Object.entries(await this.getGroupsUserSql(user_id, sql))) {
            sum += parseInt(k);
        }
        return sum.toString(2);
    }

    static bitmaskToArray(bitmask, returnKey = "id") {
        const one = "1"
        const ret = [];
        const bitarray = parseInt(bitmask).toString(2).split("").reverse();

        for (const [k, v] of Object.entries(bitarray)) {
            if (v !== '0') {
                // convert from binary to decimal based on array position
                const binary = parseInt(one.padEnd(parseInt(k) + 1, "0"), 2);
                ret[binary] = binary;
            }
        }
        return ret;
    }

    // gets list for table
    static getList(type, conds, bitmask) {
        let maskInt = parseInt(bitmask, 2);
        console.log(bitmask)
        if (type === 'Clean') {
            const bitcond = `type_scl = ${this.TBL_GROUPS}.name  AND (${this.TBL_GROUPS}.id & ${maskInt} > 0 )`;
            return `SELECT md5_scl as md5, sha256_scl as sha256, file_size_scl as size
                    FROM ${this.TBL_SAMPLES_CLEAN},
                         ${this.TBL_GROUPS}
                    WHERE ${conds}
                      AND ${bitcond}
                    GROUP BY md5_scl, sha256_scl, file_size_scl`
        }
        if (type === 'Detected') {
            const bitcond = `type_sde = ${this.TBL_GROUPS}.name  AND (${this.TBL_GROUPS}.id & ${maskInt} > 0 )`;
            return `SELECT md5_sde as md5, sha256_sde as sha256, file_size_sde as size
                    FROM ${this.TBL_SAMPLES_DETECTED},
                         ${this.TBL_GROUPS}
                    WHERE ${conds}
                      AND ${bitcond}
                    GROUP BY md5_sde, sha256_sde, file_size_sde`
        }
    }
}