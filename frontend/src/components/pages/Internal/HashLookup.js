/**
 * Virex Sampleshare
 * File: Stats.js
 * Description: stats functional component
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

import Context from "../../../context";
import 'react-datepicker/dist/react-datepicker.css';
import {NavLink} from "react-router-dom";
import {Button} from "../../Button";

export default function HashLookup() {
    const context = useContext(Context)
    const [hash, setHash] = useState("")
    const [data, setData] = useState([]);

    const fetchData = async () => {
        const res = await context.axiosJWT.get(`/api/hash_lookup?hash=${hash}`, {
            headers: {
                authorization: "Bearer " + context.user.token
            }
        })
        if (res) {
            if (res.status === 200) {
                let csvArray = []
                await res.data.forEach((obj) => {
                    let csv = `${obj.id_usr}, ${obj.name_usr}, ${obj.date_usf}`;
                    csvArray.push(csv)
                    })
                setData(csvArray)
                }
            }
        }

    const convertDateSql = (date) => date.toISOString().slice(0, 19).split('T')[0]

    const convertDate = (dates) => {
        let converted = [];
        dates.forEach((date) => {
            converted.push((new Date(date)).toISOString().slice(0, 19).split('T')[0])
        })
        return converted
    }

    return (
        <>
            <div className='subnav-content'>
                <ul className='sub-nav-menu'>
                    <li className='sub-nav-item'>
                        <NavLink
                            to={{pathname: '/stats'}}
                            className={({isActive}) => (isActive ? 'active nav-links' : 'nav-links')}
                        >
                            Stats
                        </NavLink>
                    </li>
                    <li className='sub-nav-item'>
                        <NavLink
                            to={{pathname: '/hash_lookup'}}
                            className={({isActive}) => (isActive ? 'active nav-links' : 'nav-links')}
                        >
                            Hash Lookup
                        </NavLink>
                    </li>
                </ul>
            </div>

            <div className="login-form">
                <div className="login-form-wrapper">
                    <h1 className='sign-in'>Hash Lookup</h1>
                    <input
                        type="text"
                        name="hash"
                        autoFocus
                        placeholder="Hash"
                        style={{width:'300px', textAlign:"center", marginTop:'5px', marginBottom:'5px'}}
                        onChange={(e) => setHash(e.target.value)}
                    />
                    <Button disabled={!hash} onClick={fetchData} buttonStyle="btn--dark">Lookup</Button>

                    <textarea
                        name="gpgkey"
                        autoComplete="off"
                        placeholder="Place your GPG key here"
                        className="area"
                        value={"User ID, Username, Timestamp \r\n" + data.map(e => e + '\r\n')}
                    />
                </div>
            </div>


        </>
    )
}

