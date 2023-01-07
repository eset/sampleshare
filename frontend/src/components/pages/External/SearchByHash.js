/**
 * Virex Sampleshare
 * File: SearchByHash.js
 * Description: search file by hash functional component
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

import React, {useContext, useEffect, useState} from "react";
import '../../../App.css';
import '../SignIn.css';
import {Button} from "../../Button";
import {useNavigate} from "react-router-dom";
import Context from '../../../context'
import fileDownload from "js-file-download";

export default function SearchByHash({setUser}) {
    const [hash, setHash] = useState("")
    const context = useContext(Context)
    const [errMsg, setErrMsg] = useState('');
    const navigate = useNavigate()

    useEffect(() => {
        setErrMsg('');
    }, [hash])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await context.axiosJWT.get(`/api/external_get_username/${context.user.userid}`,
                {headers: {authorization: "Bearer " + context.user.token}})
                .catch((err) => {
                    if (err.response) {
                        if (err.response.status === 400) {
                            setUser(null)
                            navigate("/")
                        }
                    }
                })
            if (res) {
                const user = res.data
                const hashType = hash.length === 32 ? "md5" : "sha256"
                await context.axiosJWT.get(`/api?action=getfile&user=${user}&from=2021-12-23&clean=true&${hashType}=${hash}`,
                    {
                        headers: {authorization: "Bearer " + context.user.token},
                        responseType: "blob"
                    })
                    .then((res) => {
                        fileDownload(res.data, hash)
                    })
                    .catch((err) => {})
            }
        } catch (e) {
            console.log(e.value)
        }
    }

    return (
        <>
            <p className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
            <div className="login-form">
                <div className="login-form-wrapper">
                    <h1 className='sign-in'>Get file by hash</h1>
                    <form onSubmit={handleSubmit} className="login-form-input">
                        <div className="input-wrapper">
                            <label>
                                Find file
                            </label>
                            <input
                                type="text"
                                name="hash"
                                autoFocus
                                placeholder="Hash"
                                onChange={(e) => setHash(e.target.value)}
                            />
                            <Button disabled={!hash} buttonStyle="btn--dark">Download</Button>
                        </div>
                    </form>
                    <p className="login-footer">
                        Virex Sampleshare with Norman Samplesharing network
                    </p>
                </div>
            </div>
        </>
    );
}