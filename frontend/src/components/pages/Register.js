/**
 * Virex Sampleshare
 * File: Register.js
 * Description: register functional component
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

import React, {useEffect, useRef, useState} from "react";
import '../../App.css';
import './SignIn.css';
import {Button} from "../Button";
import checkIcon from "../../assets/check-solid.svg";
import xIcon from "../../assets/circle-xmark-regular.svg";
import axios from "axios";
import './Register.css'

//regexes
const USER_REGEX = /^[A-z][A-z0-9-_]{3,23}$/;
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{10,}$/;
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default function Register() {
    const userRef = useRef();
    const [user, setUser] = useState("");
    const [validName, setValidName] = useState(false);
    const [userFocus, setUserFocus] = useState(false);

    const [password, setPassword] = useState("");
    const [validPwd, setValidPwd] = useState(false);
    const [pwdFocus, setPwdFocus] = useState(false);

    const [repPassword, setRepPassword] = useState("");
    const [validRepPassword, setValidRepPassword] = useState(false);

    const [email, setEmail] = useState("");
    const [validEmail, setValidEmail] = useState(false);

    const [company, setCompany] = useState("");
    const [GPG, setGPG] = useState("");

    const [errMsg, setErrMsg] = useState('');
    const [sucMsg, setSucMsg] = useState('');

    // test input
    useEffect(() => {
        userRef.current.focus();
    }, [])
    useEffect(() => {
        setValidName(USER_REGEX.test(user));
        if(userFocus && user && !validName){
            setErrMsg("4 minimum characters, must begin with a letter. Numbers, underscores, hyphens allowed.")
        } else setErrMsg('');

    }, [user, validName, userFocus])
    useEffect(() => {
        setValidEmail(EMAIL_REGEX.test(email));
    }, [email])
    useEffect(async () => {
        await setValidPwd(PWD_REGEX.test(password));
        await setValidRepPassword(password === repPassword);
        if(pwdFocus && password && !validPwd){
            setErrMsg("Minimum 10 characters, at least 1 uppercase character and a number")
        } else setErrMsg('');

    }, [password, validPwd, pwdFocus, repPassword])

    // clear errors
    useEffect(() => {
        setSucMsg('');
        setErrMsg('')
    }, [user, repPassword, GPG])

    // handle from submit
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                user,
                password,
                repPassword,
                email,
                company,
                GPG
            }
            const res = await axios.post("/api/register", {payload})
                .catch((err) => {
                    if (err.response) {
                        if (err.response.status === 400) {
                            setErrMsg(err.response.data)
                        }
                        if (err.response.status === 409) {
                            setErrMsg("Username or email already in use")
                        }
                    }
                })
            if (res) {
                if (res.status === 200) setSucMsg("User created")
            }
        } catch (e) {
            console.log(e)
        }
    }


    return (
        <>
            <p className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
            <p className={sucMsg ? "sucmsg" : "offscreen"} aria-live="assertive">{sucMsg}</p>
            <div className="login-form">
                <div className="login-form-wrapper">
                    <form onSubmit={handleSubmit} className="login-form-input">
                        <div className="input-wrapper">
                            <h1 className='sign-in'>REGISTER</h1>
                            <div className="row">
                                <div className="col">
                                    <label>
                                        Username:
                                        <img src={checkIcon} className={validName ? "valid" : "hide"} alt='img'/>
                                        <img src={xIcon} className={validName || !user ? "hide" : "invalid"} alt='img'/>
                                    </label>
                                    <input
                                        type="text"
                                        id="username"
                                        ref={userRef}
                                        autoComplete="off"
                                        placeholder="Username"
                                        value={user}
                                        aria-invalid={validName ? "false" : "true"}
                                        aria-describedby="uidnote"
                                        onFocus={() => setUserFocus(true)}
                                        onBlur={() => setUserFocus(false)}
                                        onChange={(e) => setUser(e.target.value)}
                                    />

                                    <label>
                                        Company:
                                    </label>
                                    <input
                                        type="text"
                                        name="company"
                                        autoComplete="off"
                                        placeholder="Company"
                                        onChange={(e) => setCompany(e.target.value)}
                                    />
                                    <label>
                                        Email:
                                        <img src={checkIcon} className={validEmail ? "valid" : "hide"} alt='img'/>
                                        <img src={xIcon} className={validEmail || !email ? "hide" : "invalid"} alt='img'/>
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        autoComplete="off"
                                        placeholder="Email"
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="col">
                                    <label>
                                        Password:
                                        <img src={checkIcon} className={validPwd ? "valid" : "hide"} alt='img'/>
                                        <img src={xIcon} className={validPwd || !password ? "hide" : "invalid"} alt='img'/>
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        aria-invalid={validName ? "false" : "true"}
                                        aria-describedby="pwdnote"
                                        onFocus={() => setPwdFocus(true)}
                                        onBlur={() => setPwdFocus(false)}
                                        placeholder="Password"
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <label>
                                        Repeat Password:
                                        <img src={checkIcon} className={validRepPassword && repPassword ? "valid" : "hide"} alt='img'/>
                                        <img src={xIcon} className={validRepPassword || !repPassword ? "hide" : "invalid"} alt='img'/>
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Repeat Password"
                                        onChange={(e) => setRepPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <label>
                                Public GPG key:
                            </label>
                            <textarea
                                name="gpgkey"
                                autoComplete="off"
                                placeholder="Place your GPG key here"
                                className="area"
                                onChange={(e) => setGPG(e.target.value)}
                            />

                            <Button disabled={!validName || !validPwd || !validRepPassword || !GPG || !company}
                                    buttonStyle="btn--dark">Register</Button>
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