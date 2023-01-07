/**
 * Virex Sampleshare
 * File: App.js
 * Description: main functional component
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

import './App.css';
import React, {useEffect, useState} from 'react';
import {BrowserRouter as Router, Navigate, Route, Routes} from 'react-router-dom';
import * as qs from 'query-string';
import axios from "axios"
import jwtDecode from "jwt-decode";

//Global
import Navbar from './components/Navbar';
import Login from "./components/pages/Login";
import Logout from "./components/pages/Logout";
import Register from "./components/pages/Register";
import Verify from "./components/pages/Verify";
import Context from "./context"

//External
import SearchByHash from "./components/pages/External/SearchByHash";
import DownloadCl from "./components/pages/External/DownloadCl";
import ProfileExternal from "./components/pages/External/ProfileExternal";
import ChangePassword from "./components/pages/ChangePassword";

//Internal
import Administration from './components/pages/Internal/Administration'
import Stats from './components/pages/Internal/Stats'
import HashLookup from './components/pages/Internal/HashLookup'
import ProfileInternal from './components/pages/Internal/ProfileInternal'
import Samples from './components/pages/Internal/Samples'
import NewInternal from "./components/pages/Internal/NewInternal";
import EditExternal from "./components/pages/Internal/EditExternal";
import EditInternal from "./components/pages/Internal/EditInternal";
import System from "./components/pages/Internal/System";


function App() {
    const [user, setUser] = useState(null)
    const [mount, setMount] = useState(false)
    const axiosJWT = axios.create()
    const context = {
        user: user,
        axiosJWT: axiosJWT
    }

    // check if cookie exists
    function doesHttpOnlyCookieExist(cookiename) {
        const d = new Date();
        d.setTime(d.getTime() + (1000));
        const expires = "expires=" + d.toUTCString();

        document.cookie = cookiename + "=new_value;path=/;" + expires;
        return document.cookie.indexOf(cookiename + '=') === -1;
    }

    // refresh token function
    const refreshToken = async () => {
        try {
            const res = await axiosJWT.post("/api/refresh", {}, {withCredentials: true})
                .catch((err) => {
                    if (err.response) {
                        if (err.response.status === 401 || err.response.status === 403) {
                            setUser(null)
                            window.history.replaceState(null, "Title", "/")
                        }
                    }
                })
            if (res) {
                setUser({
                    ...user,
                    auth: true,
                    userid: res.data.user.userid,
                    isInternal: res.data.user.isInternal,
                    token: res.data.token
                })
            }
            return res
        } catch (e) {
            console.log(e)
        }
    }

    // auto refresh token on site change
    useEffect(async () => {
        if (doesHttpOnlyCookieExist('refreshtoken') && user === null) {
            await refreshToken()
        }
    }, [mount, refreshToken ,user])

    // communication intercept
    axiosJWT.interceptors.request.use(
        async (config) => {
            const authorizationHeader = config.headers.authorization
            if (authorizationHeader) {
                const token = authorizationHeader.replace('Bearer ', '')
                const expiration = jwtDecode(token).exp

                // If token has expired get a new one and update Authorization Header
                if (Date.now() / 1000 >= expiration) {
                    // Delete Authorization header to prevent infinite loop
                    delete axiosJWT.defaults.headers.authorization
                    // Send /token/refresh request to backend
                    const response = await refreshToken()
                    // Update header in current request
                    config.headers.authorization = `Bearer ${response.data.token}`
                    // Update header in the axios instance
                    axiosJWT.defaults.headers.authorization = `Bearer ${response.data.token}`
                }
            }
            return config
        },
        (error) => {
            return Promise.reject(error)
        }
    )

    // view switch
    if (user) {
        if (!user.isInternal) {
            return (
                <>
                    <Context.Provider value={context}>
                        <Router>
                            <Navbar LoggedIn={context}/>
                            <Routes>
                                <Route path='/search_file' exact element={<SearchByHash setUser={setUser}/>}/>
                                <Route path='/download_client' exact element={<DownloadCl setUser={setUser}/>}/>
                                <Route path='/profile' exact element={<ProfileExternal setUser={setUser}/>}/>
                                <Route path='/change_password' exact element={<ChangePassword setUser={setUser}/>}/>
                                <Route path='/logout' exact element={<Logout setUser={setUser}/>}/>
                                <Route
                                    path="*"
                                    element={<Navigate to="/search_file" replace/>}
                                />
                            </Routes>
                        </Router>
                    </Context.Provider>
                </>
            );
        } else {
            return (
                <>
                    <Context.Provider value={context}>
                        <Router>
                            <Navbar LoggedIn={context}/>
                            <Routes>

                                <Route path='/samples_detected' exact
                                       element={<Samples setUser={setUser} samples={'detected'}/>}/>
                                <Route path='/samples_clean' exact
                                       element={<Samples setUser={setUser} samples={'clean'}/>}/>
                                <Route path='/samples_urls' exact
                                       element={<Samples setUser={setUser} samples={'urls'}/>}/>
                                <Route path='/users_internal' exact
                                       element={<Administration setUser={setUser} users={'internal'}/>}/>
                                <Route path='/users_external' exact
                                       element={<Administration setUser={setUser} users={'external'}/>}/>
                                <Route path='/new_internal' exact element={<NewInternal setUser={setUser}/>}/>
                                <Route path='/edit_internal' exact element={<EditInternal setUser={setUser}/>}/>
                                <Route path='/edit_external' exact element={<EditExternal setUser={setUser}/>}/>
                                <Route path='/system' exact element={<System/>}/>
                                <Route path='/stats' exact element={<Stats setUser={setUser}/>}/>
                                <Route path='/hash_lookup' exact element={<HashLookup setUser={setUser}/>}/>
                                <Route path='/profile' exact element={<ProfileInternal setUser={setUser}/>}/>
                                <Route path='/logout' exact element={<Logout setUser={setUser}/>}/>
                                <Route path='/change_password' exact element={<ChangePassword setUser={setUser}/>}/>
                                <Route
                                    path="*"
                                    element={<Navigate to="/system" replace/>}
                                />
                            </Routes>
                        </Router>
                    </Context.Provider>
                </>
            );
        }

    }

    return (
        <>
            <Context.Provider value={context}>
                <Router>
                    <Navbar/>
                    <Routes>
                        <Route path='/' exact element={<Login setUser={setUser}/>}/>
                        <Route path='/register' exact element={<Register setUser={setUser}/>}/>
                        <Route path='/logout' exact element={<Logout setUser={setUser}/>}/>
                        <Route path='/verify' exact element={<Verify/>}/>
                        <Route
                            path="*"
                            element={<Navigate to="/" replace/>}
                        />
                    </Routes>
                </Router>
            </Context.Provider>
        </>
    );

}

export default App;
