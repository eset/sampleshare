/**
 * Virex Sampleshare
 * File: ProfileExternal.js
 * Description: External user profile functional component
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
import {Link} from "react-router-dom";
import Context from '../../../context'
import checkIcon from "../../../assets/check-solid.svg";
import xIcon from "../../../assets/circle-xmark-regular.svg";

const USER_REGEX = /^[A-z][A-z0-9-_]{3,23}$/;
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function ProfileExternal() {
    const context = useContext(Context)
    const [username, setUsername] = useState('');
    const [validUsername, setValidUserame] = useState(false);
    const [company, setCompany] = useState('');
    const [change, setChange] = useState(false);
    const [email, setEmail] = useState('');
    const [validEmail, setValidEmail] = useState(false);
    const [pgp, setPGP] = useState('');
    const [data, setData] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [sucMsg, setSucMsg] = useState('');

    useEffect(() => {
        setValidUserame(USER_REGEX.test(username));
    }, [username])
    useEffect(() => {
        setValidEmail(EMAIL_REGEX.test(email));
    }, [email])


    // get user
    const get_user = async () => {
        const res = await context.axiosJWT.get(`/api/get_external_user/${context.user.userid}`, {
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
        }
    }

    useEffect(() => {
        get_user();
    }, [])

    // disable button
    useEffect(() => {
        setErrMsg('');
        setSucMsg('');
        if (username || company || email || pgp) {
            if (data.username === username && data.company === company && data.email === email && data.PGP === pgp) {
                setChange(false)
            } else {
                setChange(true)
            }
        }
    }, [username, company, email, pgp])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                userid: context.user.userid,
                username,
                company,
                email,
                pgp
            }
            const res = await context.axiosJWT.post(`/api/external_change_profile`, {payload}, {headers: {authorization: "Bearer " + context.user.token}})
                .catch((err) => {
                    if (err.response) {
                        if(err.response.status === 409){
                            setErrMsg("User info already in use!")
                        }else if(err.response.status === 401){
                            setErrMsg("PGP key invalid!")
                        }
                    }
                })
            if (res.status === 200) {
                setSucMsg("Personal info successfully changed")
            }
        } catch (e) {

        }
    }

    return (
        <>
            {!data ? (
                <div className="login-form">
                    <div className="login-form-wrapper">
                        <h1 className='sign-in'>Profile</h1>
                        Loading
                        <p className="login-footer">
                            Eset Sampleshare with Norman Samplesharing network
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <p className={sucMsg ? "sucmsg" : "offscreen"} aria-live="assertive">{sucMsg}</p>
                    <p className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
                    <div className="login-form">
                        <div className="login-form-wrapper">
                            <h1 className='sign-in'>Profile</h1>
                            <form className="login-form-input">
                                <div className="input-wrapper">
                                    <div className="row">
                                        <div className="col">
                                            <label>
                                                Username:
                                                <img src={checkIcon} className={validUsername ? "valid" : "hide"} alt='img'/>
                                                <img src={xIcon} className={validUsername || !username ? "hide" : "invalid"} alt='img'/>
                                                {/*<FontAwesomeIcon icon={faCheck}*/}
                                                {/*                 className={validUsername ? "valid" : "hide"}/>*/}
                                                {/*<FontAwesomeIcon icon={faTimes}*/}
                                                {/*                 className={validUsername || !username ? "hide" : "invalid"}/>*/}
                                            </label>
                                            <input
                                                type="text"
                                                id="username"
                                                autoComplete="off"
                                                value={username}
                                                aria-invalid={validUsername ? "false" : "true"}
                                                aria-describedby="uidnote"
                                                onChange={(e) => setUsername(e.target.value)}
                                            />
                                            <label>
                                                Company:
                                            </label>
                                            <input
                                                type="text"
                                                id="company"
                                                autoComplete="off"
                                                value={company}
                                                onChange={(e) => setCompany(e.target.value)}
                                            />
                                            <label>
                                                Email:
                                                <img src={checkIcon} className={validEmail ? "valid" : "hide"} alt='img'/>
                                                <img src={xIcon} className={validEmail || !email ? "hide" : "invalid"} alt='img'/>
                                                {/*<FontAwesomeIcon icon={faCheck}*/}
                                                {/*                 className={validEmail ? "valid" : "hide"}/>*/}
                                                {/*<FontAwesomeIcon icon={faTimes}*/}
                                                {/*                 className={validEmail || !email ? "hide" : "invalid"}/>*/}
                                            </label>
                                            <input
                                                type="text"
                                                id="email"
                                                autoComplete="off"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className="col">
                                            <label>
                                                Public PGP key:
                                            </label>
                                            <textarea
                                                name="pgpkey"
                                                autoComplete="off"
                                                className="area"
                                                value={pgp}
                                                onChange={(e) => setPGP(e.target.value)}
                                            />
                                        </div>
                                    </div>


                                    <Button onClick={handleSubmit}
                                            disabled={!change || !validUsername || !validEmail || !pgp || !company}
                                            buttonStyle="btn--dark" type={"button"}>Submit</Button>
                                    <Link to="/change_password">Change password</Link>
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