/**
 * Virex Sampleshare
 * File: Navbar.js
 * Description: navigation panel functional component
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


import React, {useContext, useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from "./Button";
import logo from "../assets/logo.svg";
import './Navbar.css';
import Context from '../context'

// navbar component
function Navbar(props) {
    const context = useContext(Context)
    const [button, setButton] = useState(true);

    // switch
    if (!props.LoggedIn) {
        return (
            <>
                <nav className="navbar">
                    <div className="navbar-container">
                        <Link to="/" className="navbar-logo">
                            <img src={logo} alt='img'/> SAMPLESHARE
                        </Link>
                        <ul className={'nav-menu'}>
                            <li className='nav-item'>
                                <Link to='/sign-in' className='nav-links-mobile'>
                                    Sign In
                                </Link>
                            </li>
                        </ul>
                    </div>
                    {button && <Link to='/'><Button buttonStyle='btn--outline'>SIGN IN</Button></Link>}
                </nav>
            </>
        )
    }

    if (!context.user.isInternal) {
        return (
            <>
                <nav className="navbar">
                    <div className="navbar-container">
                        <Link to="/" className="navbar-logo">
                            <img src={logo} alt='img'/> SAMPLESHARE
                        </Link>
                        <ul className={'nav-menu'}>
                            <li className='nav-item'>
                                <Link to='/search_file' className='nav-links'>
                                    Search Hash
                                </Link>
                            </li>
                            <li className='nav-item'>
                                <Link to='/download_client' className='nav-links'>
                                    Client
                                </Link>
                            </li>
                            <li className='nav-item'>
                                <Link to='/profile' className='nav-links'>
                                    Profile
                                </Link>
                            </li>
                        </ul>
                    </div>
                    {button && <Link to='/logout'><Button buttonStyle='btn--outline'>LOGOUT</Button> </Link>}
                </nav>
            </>
        )
    } else {
        return (
            <>
                <nav className="navbar">
                    <div className="navbar-container">
                        <Link to="/" className="navbar-logo">
                            <img src={logo} alt='img'/> SAMPLESHARE
                        </Link>
                        <ul className={'nav-menu'}>
                            <li className='nav-item'>
                                <Link to='/users_external' className='nav-links'>
                                    Administration
                                </Link>
                            </li>
                            <li className='nav-item'>
                                <Link to='/samples_detected' className='nav-links'>
                                    Samples
                                </Link>
                            </li>
                            <li className='nav-item'>
                                <Link to='/stats' className='nav-links'>
                                    Statistics
                                </Link>
                            </li>
                            <li className='nav-item'>
                                <Link to='/profile' className='nav-links'>
                                    Profile
                                </Link>
                            </li>
                        </ul>
                    </div>
                    {button && <Link to='/logout'><Button buttonStyle='btn--outline'>LOGOUT</Button> </Link>}
                </nav>
            </>
        )
    }
}

export default Navbar
