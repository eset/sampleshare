/**
 * Virex Sampleshare
 * File: NewInternal.js
 * Description: new internal user form functional component
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
import checkIcon from "../../../assets/check-solid.svg";
import xIcon from "../../../assets/circle-xmark-regular.svg";

const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;


export default function NewInternal() {
    const context = useContext(Context)
    const [fname, setFname] = useState('');
    const [lname, setLname] = useState('');
    const [errors, setErrors] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [newacc, setNewAcc] = useState(false);

    const [email, setEmail] = useState('');
    const [validEmail, setValidEmail] = useState(false);
    const [data, setData] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [sucMsg, setSucMsg] = useState('');

    // match input
    useEffect(() => {
        setValidEmail(EMAIL_REGEX.test(email));
    }, [email])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                userid: context.user.userid,
                fname,
                lname,
                email,
                errors,
                newacc,
                enabled
            }
            setData(payload)
            const res = await context.axiosJWT.post(`/api/internal_create_profile`, {payload}, {headers: {authorization: "Bearer " + context.user.token}})
                .catch(err => {
                    if (err.response) {
                        if (err.response.status === 409) {
                            setErrMsg("Email already in use")
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

    // clear errors
    useEffect(() => {
        setErrMsg('');
        setSucMsg('');
    }, [fname, lname, email, data])

    return (
        <>
            <p className={sucMsg ? "sucmsg" : "offscreen"} aria-live="assertive">{sucMsg}</p>
            <p className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
            <div className="login-form">
                <div className="login-form-wrapper">
                    <form className="login-form-input">
                        <div className="input-wrapper">
                            <h1 className='sign-in'>Create New Internal User</h1>
                            <div className="row">
                                <div className="col">
                                    <label>
                                        First name:
                                    </label>
                                    <input
                                        type="text"
                                        autoComplete="off"
                                        value={fname}
                                        onChange={(e) => setFname(e.target.value)}
                                    />
                                    <label>
                                        Last name:
                                    </label>
                                    <input
                                        type="text"
                                        autoComplete="off"
                                        value={lname}
                                        onChange={(e) => setLname(e.target.value)}
                                    />
                                    <label>
                                        Email:
                                        <img src={checkIcon} className={validEmail ? "valid" : "hide"} alt='img'/>
                                        <img src={xIcon} className={validEmail || !email ? "hide" : "invalid"} alt='img'/>
                                        {/*<FontAwesomeIcon icon={faCheck} className={validEmail ? "valid" : "hide"}/>*/}
                                        {/*<FontAwesomeIcon icon={faTimes} className={validEmail || !email ? "hide" : "invalid"}/>*/}
                                    </label>
                                    <input
                                        type="text"
                                        autoComplete="off"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="col">
                                    <div className="rights-wrapper">
                                        <label>
                                            Enabled:
                                            <input
                                                type="checkbox"
                                                checked={enabled}
                                                onClick={() => setEnabled(!enabled)}
                                            />
                                        </label>
                                        <label>
                                            Errors:
                                            <input
                                                type="checkbox"
                                                checked={errors}
                                                onClick={() => setErrors(!errors)}
                                            />
                                        </label>
                                        <label>
                                            New Account Notify:
                                            <input
                                                type="checkbox"
                                                checked={newacc}
                                                onClick={() => setNewAcc(!newacc)}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={handleSubmit} disabled={!validEmail || !fname || !lname} buttonStyle="btn--dark"
                                    type={"button"}>Create User</Button>
                        </div>
                    </form>


                    <p className="login-footer">
                        Eset Sampleshare with Norman Samplesharing network
                    </p>

                </div>
            </div>

        </>
    );
}