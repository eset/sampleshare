/**
 * Virex Sampleshare
 * File: Login.js
 * Description: login functional component
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

import React, {useEffect, useState} from "react";
import '../../App.css';
import './SignIn.css';
import {Button} from "../Button";
import {Link, useNavigate} from "react-router-dom";
import axios from "axios";

export default function Login({setUser}) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [errMsg, setErrMsg] = useState('');
    const navigate = useNavigate()

    // reset error
    useEffect(() => {
        setErrMsg('');
    }, [username, password])

    // submit handle
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if(username === "" || password === ""){
                setErrMsg("Please enter your credentials");
                return
            }
            const res = await axios.post("/api/login", {username, password})
                .catch((err) => {
                    if (err.response.status === 403) {
                        setErrMsg("Invalid username or password!")
                    }else if(err.response.status === 401){
                        setErrMsg("Please verify your account!")
                    }
                })
            if (res) {
                setUser(res.data)
                if (res.data.isInternal) {
                    navigate('/')
                } else {
                    navigate('/search_file')
                }
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
                    <h1>LOGIN</h1>
                    <form onSubmit={handleSubmit} className="login-form-input">
                        <div className="input-wrapper">
                            <label>Login</label>
                            <input
                                type="text "
                                name="Login"
                                className="login-input"
                                autoFocus
                                placeholder="Login"
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <label>Password</label>
                            <input
                                type="password"
                                name="password"
                                className="login-input"
                                placeholder="Password"
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Button type="submit" buttonStyle="btn--dark">Log In</Button>
                        </div>
                    </form>
                    <p className="login-footer">
                        <Link to="/register">Don't have an account? Register!</Link>
                        <br/>
                        Virex Sampleshare with Norman Samplesharing network
                    </p>
                </div>
            </div>
        </>
    );
}