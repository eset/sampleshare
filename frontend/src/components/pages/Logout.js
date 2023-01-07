/**
 * Virex Sampleshare
 * File: Logout.js
 * Description: logout functional component
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
import Context from '../../context'
import axios from "axios";
import {Button} from "../Button";
import {Link} from "react-router-dom";

export default function Logout({setUser}) {
    const context = useContext(Context)
    const [mount, setMount] = useState(false)

    // log out the user and destroy the cookie
    const removeUser = async () => {
        const res = await axios.post("/api/logout", {}, {headers: {authorization: "Bearer " + context.user.token}})
            .catch((err) => {
                if (err.response.status === 401 || err.response.status === 403) {
                    setUser(null)
                    window.history.replaceState(null, "Title", "/")
                }
            })
        if (res) setUser(null)
    }

    // call on load
    useEffect(() => {
        if (context.user) {
            removeUser().then()
        }
    }, [mount])

    return (
        <>
            <div className="login-form">
                <div className="login-form-wrapper">
                    <div className='logout'>
                        <h3>You have been logged out</h3>
                    </div>
                    <Link to="/"><Button buttonStyle="btn--dark">Log In</Button></Link>
                </div>
            </div>
        </>

    );
}