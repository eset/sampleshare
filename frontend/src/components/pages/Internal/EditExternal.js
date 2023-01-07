/**
 * Virex Sampleshare
 * File: EditExternal.js
 * Description: edit external user functional component
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
import Context from '../../../context'
import Subnav from './Subnav'

export default function EditExternal() {
    const context = useContext(Context)
    const [username, setUsername] = useState('');
    const [company, setCompany] = useState('');
    const [email, setEmail] = useState('');
    const [pgp, setPGP] = useState('');
    const [status, setStatus] = useState('');
    const [dailyA, setDailyA] = useState('');
    const [dailyB, setDailyB] = useState('');
    const [dailyC, setDailyC] = useState('');
    const [dailyDroid, setDailyDroid] = useState('');
    const [clean, setClean] = useState('');
    const [urls, setUrls] = useState('');
    const [data, setData] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [sucMsg, setSucMsg] = useState('');

    // covert user
    const convertStatusUser = (params) => {
        if (params === 0) return "Disabled"
        if (params === 1) return "Pending"
        if (params === 2) return "Enabled"
    }

    // fetch users from db
    const get_user = async () => {
        const res = await context.axiosJWT.get(`/api/get_external_user/${context.user.target}`, {
            headers: {authorization: "Bearer " + context.user.token}
        }).catch(e => {
            setErrMsg("Internal error - please reload")
        })
        if (res) {
            setData(res.data)
            setUsername(res.data.username)
            setCompany(res.data.company)
            setEmail(res.data.email)
            setPGP(res.data.PGP)
            setDailyA(res.data.dailyA)
            setDailyB(res.data.dailyB)
            setDailyC(res.data.dailyC)
            setDailyDroid(res.data.dailyDroid)
            setClean(res.data.dailyClean)
            setUrls(res.data.urls)
            setStatus(convertStatusUser(res.data.status))
        }
    }

    // on load fetch
    useEffect(() => {
        get_user();
    }, [])

    // clear errors
    useEffect(() => {
        setErrMsg('');
        setSucMsg('');
    }, [dailyA, dailyB, dailyC, dailyDroid, clean, urls, pgp])

    // password reset
    const resetPass = async (e) => {
        e.preventDefault()
        try {
            setSucMsg("Password reset")
        } catch (e) {
            console.log(e)
        }
    }

    // handle submit
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                userid: context.user.target,
                editRights: true,
                pgp,
                dailyA,
                dailyB,
                dailyC,
                dailyDroid,
                clean,
                urls
            }
            setData(payload)
            const res = await context.axiosJWT.post(`/api/external_change_profile`, {payload}, {headers: {authorization: "Bearer " + context.user.token}})
                .catch(err => {
                    if (err.response.status === 500) {
                        setErrMsg("Unexpected server error")
                    }
                })
            if (res.status === 200) {
                setSucMsg("Personal info successfully changed")
            }

        } catch (e) {
            console.log(e)
        }
    }

    return (
        <>
            <Subnav
                params={[
                    {pathname : "/users_external", type: 'external'},
                    {pathname: '/users_internal', type: 'internal'},
                    {pathname: '/system', type: 'system'}
                ]}
            />
            {!data ? (
                <>
                    <div className="login-form">
                        <div className="login-form-wrapper">
                            <h1 className='sign-in'>Profile</h1>
                            Loading
                            <p className="login-footer">
                                Eset Sampleshare with Norman Samplesharing network
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <p className={sucMsg ? "sucmsg" : "offscreen"} aria-live="assertive">{sucMsg}</p>
                    <p className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
                    <div className="login-form">
                        <div className="login-form-wrapper">
                            <form className="login-form-input">
                                <div className="input-wrapper">
                                    <h1 className='sign-in'>Change External user</h1>
                                    <div className="row">
                                        <div className="col">
                                            <div className='info-wrapper'>
                                                <label>
                                                    Username: {username}
                                                </label>
                                                <label>
                                                    Email: {email}
                                                </label>
                                                <label>
                                                    Status: {status}
                                                </label>
                                                <label>
                                                    Company: {company}
                                                </label>
                                                <label>
                                                    Public PGP key:
                                                </label>
                                                <textarea
                                                    name="pgpkey"
                                                    autoComplete="off"
                                                    className='area'
                                                    value={pgp}
                                                    onChange={(e) => setPGP(e.target.value)}
                                                />
                                            </div>
                                            <Button onClick={resetPass} buttonStyle="btn--dark" type={"button"}>Reset
                                                User
                                                Password</Button>
                                        </div>
                                        <div className="col">
                                            <div className='rights-wrapper'>
                                                <label>
                                                    Daily A:
                                                    <input
                                                        type="checkbox"
                                                        checked={dailyA}
                                                        onClick={() => setDailyA(!dailyA)}
                                                    />
                                                </label>

                                                <label>
                                                    Daily B:
                                                    <input
                                                        type="checkbox"
                                                        checked={dailyB}
                                                        onClick={() => setDailyB(!dailyB)}
                                                    />
                                                </label>

                                                <label>
                                                    Daily C:
                                                    <input
                                                        type="checkbox"
                                                        checked={dailyC}
                                                        onClick={() => setDailyC(!dailyC)}
                                                    />
                                                </label>

                                                <label>
                                                    Daily Droid:
                                                    <input
                                                        type="checkbox"
                                                        checked={dailyDroid}
                                                        onClick={() => setDailyDroid(!dailyDroid)}
                                                    />
                                                </label>

                                                <label>
                                                    Clean:
                                                    <input
                                                        type="checkbox"
                                                        checked={clean}
                                                        onClick={() => setClean(!clean)}
                                                    />
                                                </label>

                                                <label>
                                                    Rights Urls:
                                                    <input
                                                        type="checkbox"
                                                        checked={urls}
                                                        onClick={() => setUrls(!urls)}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>


                                    <Button onClick={handleSubmit} buttonStyle="btn--dark" type={"button"}>Save</Button>
                                </div>
                            </form>


                            <p className="login-footer">
                                Eset Sampleshare with Norman Samplesharing network
                            </p>
                        </div>
                    </div>

                </>
            )}

        </>
    );
}