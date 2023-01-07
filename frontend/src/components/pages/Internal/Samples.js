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


import React, {useEffect, useState} from "react";
import '../../../App.css';
import '../SignIn.css';
import Grid from "./Grid";
import "./Subnav";
import Subnav from "./Subnav";

const _h3 = {
    paddingTop: '1rem',
    paddingLeft: '5rem',
}

export default function Samples({samples}) {
    const [sample, setSample] = useState(samples)

    // on change samples or load
    useEffect(() => {
        setSample(samples);
    }, [samples])

    return (
        <>
            <Subnav
                params={[
                    {pathname : "/samples_detected", type: "detected"},
                    {pathname: '/samples_clean', type: 'clean'},
                    {pathname: '/samples_urls', type: 'urls'}
                ]}
            />

            <div className="samples">
                <h3 style   ={_h3}>{sample.charAt(0).toUpperCase() + sample.slice(1)} Samples</h3>
                <Grid samples={sample}/>
            </div>
        </>
    )
}