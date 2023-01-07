/**
 * Virex Sampleshare
 * File: DownloadCl.js
 * Description: download client functional component
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

export default function DownloadCl({setUser}) {
    const [pwd, setPwd] = useState("")
    const context = useContext(Context)
    const [errMsg, setErrMsg] = useState('');
    const navigate = useNavigate()

    useEffect(() => {
        setErrMsg('');
    }, [pwd])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res1 = await context.axiosJWT.post(`/api/verify_user`,
                {userid: context.user.userid, pwd},
                {headers: {authorization: "Bearer " + context.user.token}})
                .catch((err) => {
                    if (err.response) {
                        if (err.response.status === 409) {
                            setErrMsg("Please insert correct password")
                        }
                        if (err.response.status === 400) {
                            setUser(null)
                            navigate("/")
                        }
                    }
                })
            if (res1) {
                context.axiosJWT.get("/api/download_client",
                    {
                        headers: {authorization: "Bearer " + context.user.token},
                        responseType: "blob"
                    })
                    .then((response) => {
                        const url = window.URL.createObjectURL(new Blob([response.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', 'client.zip'); //or any other extension
                        document.body.appendChild(link);
                        link.click();
                    })
                    .catch((err) => console.log(err))
            }
        } catch (e) {
            console.log(e)
        }
    }

    return (
        <>
            <p className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
            <div className="login-form">
                <div className="login-form-wrapper">
                    <h1 className='sign-in'>Download Client</h1>
                    <form onSubmit={handleSubmit} className="login-form-input">
                        <div className="input-wrapper">
                            <label>
                                Insert your password
                            </label>
                            <input
                                type="password"
                                name="password"
                                autoFocus
                                placeholder="Password"
                                onChange={(e) => setPwd(e.target.value)}
                            />
                            <Button disabled={!pwd} buttonStyle="btn--dark">Download</Button>
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