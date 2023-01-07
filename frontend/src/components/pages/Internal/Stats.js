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

import {CategoryScale, Chart as ChartJS, LinearScale, LineElement, PointElement, Title, Tooltip} from 'chart.js';
import {Line} from 'react-chartjs-2';
import Context from "../../../context";
import Select from "react-select"
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css';
import {NavLink} from "react-router-dom";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip
);

export const options1 = {
    responsive: true,
    plugins: {
        legend: {
            position: 'bottom',
            display: false,
        },
        title: {
            display: true,
            text: 'Downloaded samples chart',
        },
    },
};

export const options2 = {
    responsive: true,
    plugins: {
        legend: {
            position: 'bottom',
            display: false,
        },
        title: {
            display: true,
            text: 'Downloaded samples size chart (MB)',
        },
    },
};

export default function Stats() {
    const context = useContext(Context)
    const [data1, setData1] = useState(null);
    const [data2, setData2] = useState(null);
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 4)));
    const [load, setLoad] = useState(true);
    const [rows, setRows] = useState([]);
    const [cols1, setCols1] = useState([]);
    const [cols2, setCols2] = useState([]);

    const options = [
        {value: "daily_a", label: "Daily A"},
        {value: "daily_b", label: "Daily B"},
        {value: "daily_c", label: "Daily C"},
        {value: "daily_droid", label: "Daily Droid"},
        {value: "global", label: "Global"}
    ]
    const [selected, setSelected] = useState(options[4])


    const fetchData = async (selected) => {
        const res = await context.axiosJWT.get(`/api/get_stats?vendor=${selected.value}&from=${convertDateSql(startDate)}&to=${convertDateSql(endDate)}`, {
            headers: {
                authorization: "Bearer " + context.user.token
            }
        })
        if (res) {
            if (res.status === 200) {
                res.data.forEach((obj) => {
                    rows.push(obj.date)
                    setRows(rows)
                    cols1.push(obj.files)
                    setCols1(cols1)
                    cols2.push(obj.size)
                    setCols2(cols2)
                })
            }
            setLoad(false)
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

    const convertSize = (sizes) => {
        let converted = [];
        sizes.forEach((size) => {
            converted.push(size / 1024 / 8)
        })
        return converted
    }

    const setChart = () => {
        const datas1 = {
            labels: convertDate(rows),
            datasets: [
                {
                    label: 'Downloaded Samples',
                    data: cols1,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                }
            ],
        };
        setData1(datas1)

        const datas2 = {
            labels: convertDate(rows),
            datasets: [
                {
                    label: 'Downloaded Size of Samples',
                    data: convertSize(cols2),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                }
            ],
        };
        setData2(datas2)
    }

    useEffect(async () => {
        setData1(null)
        setData2(null)
        setRows([])
        setCols1([])
        setCols2([])
        if (!load){
            setChart()
        } else{
            if(selected) await fetchData(selected);
        }
    }, [load,selected, endDate, startDate])

    const onChange = (selectedOptions) =>{
        setSelected(selectedOptions);
        setLoad(true);
    }


    const selectStyle= {
        option:(provided, state) => ({
            ...provided,
            width: 300
        }),
        control: (provided) => ({
            ...provided,
            width: 300,
        }),
    }
    const datePickerStyle= {
        width: 'auto',
        textAlign: 'center',
        marginTop: '5px'
    }

    const flexBoxStyle= {
        display: 'flex'
    }

    const handleChangeEnd = (date) =>{
        setEndDate(date)
    }
    const handleChangeStart = (date) =>{
        setStartDate(date)
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
                    <h1 className='sign-in'>Statistics</h1>
                    <h3>Vendor</h3>
                    <Select
                        closeMenuOnSelect={true}
                        options={options}
                        styles={selectStyle}
                        defaultValue={options[4]}
                        onChange={onChange}
                        width={300}
                    />
                    <div style={flexBoxStyle}>
                        <div>
                            <div style={datePickerStyle}>
                                From:
                                <DatePicker
                                    selected={startDate}
                                    onChange={handleChangeStart}
                                    dateFormat="dd-MM-yyyy"
                                />
                            </div>
                        </div>
                        <div>
                            <div style={datePickerStyle}>
                                To:
                                <DatePicker
                                    selected={endDate}
                                    onChange={handleChangeEnd}
                                    dateFormat="dd-MM-yyyy"
                                />
                            </div>
                        </div>
                    </div>
                    {data1 !== null ? (
                        <div style={{height: "600px", width: "600px"}}>
                            <Line options={options1} data={data1} type={null}/>
                            <Line options={options2} data={data2} type={null}/>
                        </div>
                    ):(<></>)
                    }
                </div>
            </div>


        </>
    )
}

