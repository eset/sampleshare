/**
 * Virex Sampleshare
 * File: Administration.js
 * Description: users tables functional component
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
import '../../../App.css';
import '../SignIn.css';
import {Button} from "../../Button";
import {NavLink} from "react-router-dom";
import Grid from "./Grid";
import Subnav from "./Subnav";

export default function Administration({users}) {
    const [user, setUser] = useState(users)

    useEffect(() => {
        setUser(users);
    }, [users])

    return (
        <>
            <Subnav
                params={[
                    {pathname : "/users_external", type: 'external'},
                    {pathname: '/users_internal', type: 'internal'},
                    {pathname: '/system', type: 'system'}
                ]}
            />
            <div className='header'>
                <h3>{user.charAt(0).toUpperCase() + user.slice(1)} Users</h3>
                {user === "internal" ? (
                    <>
                        <NavLink
                            to={{pathname: '/new_internal'}}
                        >
                            <Button buttonStyle="btn--dark" type={"button"} newBtn={true}>Create New user</Button>
                        </NavLink>
                    </>
                ) : (<></>)}
            </div>
            {/* call the grid */}
            <Grid users={user}/>
        </>
    )
}