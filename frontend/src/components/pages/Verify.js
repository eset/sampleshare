/**
 * Virex Sampleshare
 * File: Verify.js
 * Description: Verify functional component
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

import React, { useEffect, useState} from "react";
import '../../App.css';
import './SignIn.css';
import axios from "axios";
import {Button} from "../Button";
import {Link} from "react-router-dom";
import * as qs from "query-string";

export default function Logout({setUser}) {
    const [mount, setMount] = useState(false)
    const req = qs.parse(window.location.search)

    // log out the user and destroy the cookie
    const verifyUser = async () => {
        console.log(req)
        await axios.put("/api/verify",{
            email:req.email,
            code:req.code
        })
            .catch((err) => {
                if (err.response.status === 401 || err.response.status === 403) {
                    window.history.replaceState(null, "Title", "/")
                }
            })
    }

    // call on load
    useEffect(() => {
        verifyUser().then()
        setMount(true)
    }, [mount])

    return (
        <>
            <div className="login-form">
                <div className="login-form-wrapper">
                    <div className='logout'>
                        <h3>Your account has been verified</h3>
                    </div>
                    <Link to="/"><Button buttonStyle="btn--dark">Log In</Button></Link>
                </div>
            </div>
        </>

    );
}