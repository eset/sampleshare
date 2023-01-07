/**
 * Virex Sampleshare
 * File: ChangePassword.js
 * Description: change password functional component
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
import '../../App.css';
import './SignIn.css';
import {Button} from "../Button";
import checkIcon from "../../assets/check-solid.svg";
import xIcon from "../../assets/circle-xmark-regular.svg";
import Context from '../../context'
import './Register.css'


const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{10,}$/;

export default function ChangePassword() {
    const context = useContext(Context)

    const [oldPwd, setOldPwd] = useState('');

    const [newPwd, setNewPwd] = useState('');
    const [validPwd, setValidPwd] = useState(false);
    const [pwdFocus, setPwdFocus] = useState(false);

    const [newPwdRep, setNewPwdRep] = useState('');
    const [validRepPassword, setValidRepPassword] = useState(false);


    const [errMsg, setErrMsg] = useState('');
    const [sucMsg, setSucMsg] = useState('');
    const [allMatch, setAllMatch] = useState(false);

    useEffect(() => {
        setValidPwd(PWD_REGEX.test(newPwd));
        setValidRepPassword(newPwd === newPwdRep);
        if(pwdFocus && newPwd && !validPwd) {
            setErrMsg("Minimum 10 characters, at least 1 uppercase character and a number")
        } else if (newPwd === newPwdRep && newPwd === oldPwd && newPwd && newPwdRep && oldPwd) {
            setAllMatch(true)
            setErrMsg("New and old password must not match!");
        } else {
            setAllMatch(false)
            setErrMsg('')
        }
    }, [oldPwd, newPwd, newPwdRep, pwdFocus, validPwd])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                userid: context.user.userid,
                isInternal: context.user.isInternal,
                oldPwd,
                newPwd
            }
            const res = await context.axiosJWT.post("/api/change_password", {payload},
                {
                    headers: {authorization: "Bearer " + context.user.token}
                })
                .catch((err) => {
                    if (err.response) {
                        if (err.response.status === 409) {
                            setErrMsg("Please insert correct old password")
                        }
                    }
                })
            if (res.status === 200) {
                setSucMsg("Success!")
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
                            <h1 className='sign-in'>Change your password</h1>
                            <label>
                                Old Password:
                            </label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Old Password"
                                onChange={(e) => setOldPwd(e.target.value)}
                            />
                            <label>
                                New Password:
                                <img src={checkIcon}  className={validPwd ? "valid" : "hide"} alt='img'/>
                                <img src={xIcon} className={validPwd || !newPwd ? "hide" : "invalid"} alt='img'/>
                            </label>
                            <input
                                type="password"
                                name="password"
                                onFocus={() => setPwdFocus(true)}
                                onBlur={() => setPwdFocus(false)}
                                aria-describedby="pwdnote"
                                placeholder="New Password"
                                onChange={(e) => setNewPwd(e.target.value)}
                            />
                            <label>
                                Repeat New Password:
                                <img src={checkIcon} className={validRepPassword && newPwdRep ? "valid" : "hide"} alt='img'/>
                                <img src={xIcon} className={validRepPassword || !newPwdRep ? "hide" : "invalid"} alt='img'/>
                            </label>
                            <input
                                type="password"
                                name="password"
                                placeholder="Repeat New Password"
                                onChange={(e) => setNewPwdRep(e.target.value)}
                            />

                            <Button disabled={!validPwd || !validRepPassword || !oldPwd || allMatch}
                                    buttonStyle="btn--dark">Submit</Button>
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