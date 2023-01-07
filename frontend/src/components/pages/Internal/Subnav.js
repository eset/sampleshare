/**
 * Virex Sampleshare
 * File: Samples.js
 * Description: samples table functional component
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

import React from "react";
import '../../../App.css';
import '../SignIn.css';
import './Subnav.css'
import {NavLink} from "react-router-dom";

function SubnavElements({params}){
    return(
        <ul className='sub-nav-menu'>
            {
                params.map((params , index) => (
                    <li className='sub-nav-item' key={index}>
                        <NavLink
                            to={{pathname: params.pathname, type: params.type}}
                            className={({isActive}) => (isActive ? 'active sub-nav-links' : 'sub-nav-links')}
                        >
                            {params.type.charAt(0).toUpperCase() + params.type.slice(1)}
                        </NavLink>
                    </li>
                ))
            }
        </ul>
    )
}

export default function Subnav({params}) {
    return(
        <div className='sub-nav'>
            <div className='sub-nav-content'>
                <SubnavElements params={params}/>
            </div>
        </div>
    )
}