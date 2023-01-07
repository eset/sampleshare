/**
 * Virex Sampleshare
 * File: Grid.js
 * Description: grid functional component
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

import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AgGridReact} from 'ag-grid-react';

import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-alpine.css';
import Context from "../../../context";
import './Grid.css'
import checkIcon from "../../../assets/check-solid.svg";
import trashIcon from "../../../assets/trash-solid.svg";
import minusIcon from "../../../assets/circle-minus-solid.svg";
import editIcon from "../../../assets/pen-to-square-solid.svg";
import resetPWIcon from "../../../assets/key-solid.svg";
import {useNavigate} from "react-router-dom";


export default function Grid({samples, users}) {
    const [gridApi, setGridApi] = useState(null);
    const [gridColumnApi, setGridColumnApi] = useState(null);
    const [columnDefs, setColumnDefs] = useState(null);
    const [formated, setFormated] = useState(false);
    // const formated = useRef(false);
    const context = useContext(Context)
    const lock = useRef(true);
    const action = useRef(false);
    const [errMsg, setErrMsg] = useState('');
    const gridRef = useRef()
    const navigate = useNavigate()


    // convert date to readable format
    const convertDate = (params) => {
        if (params.value) return ((new Date(params.value)).toISOString().slice(0, 19).split('T')[0])
    }

    const convertStatus = (params) => {
        if(!params) return ""
        if(params.value === 1) return "Enabled"
        if(params.value === 0) return "Disabled"
    }

    const convertStatusUser = (params) => {
        if(!params) return ""
        if (params.value === 0) return "Disabled"
        if (params.value === 1) return "Pending"
        if (params.value === 2) return "Enabled"
    }

    // filter params
    const textFilterParams = {
        filterOptions: ['contains', 'notContains'],
        textFormatter: function (r) {
            if (r == null) return null;
            return r
                .toLowerCase()
                .replace(/[àáâãäå]/g, 'a')
                .replace(/æ/g, 'ae')
                .replace(/ç/g, 'c')
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/ñ/g, 'n')
                .replace(/[òóôõö]/g, 'o')
                .replace(/œ/g, 'oe')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[ýÿ]/g, 'y');
        },
        debounceMs: 200,
        suppressAndOrCondition: true,
    };

    // actions renderer samples
    const actionsCellRenderer = (params) => {
        if(!params.value){
            return (
                <>
                </>
            )
        }
        return (
            <>
                {params.value?.Status === 1 ? (
                        <img className={'grid-icon'} src={minusIcon} id={params.value?.Id} onClick={() => handleDisable(params.value?.Id)} alt='img' title="Disable"/>
                    ) : (
                        <img className={'grid-icon'} src={checkIcon} id={params.value?.Id} onClick={() => handleEnable(params.value?.Id)} alt='img' title="Enable"/>
                    )
                }
                <img className={'grid-icon'} src={trashIcon} id={params.value?.Id} onClick={() => handleRemove(params.value?.Id, params.value?.MD5)} alt='img' title="Remove"/>
            </>
        )
    }

    // actions renderer users
    const actionsCellRendererUser = (params) => {
        if(!params.value){
            return (
                <>
                </>
            )
        }
        return (
            <>
                {users === "internal" ? (
                    <>
                        <img className={'grid-icon'} src={editIcon} id={params.value?.uuid} onClick={() => handleEdit(params.value?.uuid)} alt='img' title="Edit user"/>
                        <img className={'grid-icon'} src={trashIcon} id={params.value?.uuid} onClick={() => handleRemove(params.value?.uuid, params.value?.MD5)} alt='img' title="Remove"/>
                        <img className={'grid-icon'} src={resetPWIcon} id={params.value?.uuid} onClick={() => handleResetPassword(params.value?.uuid)} alt='img' title="Reset Password"/>
                    </>
                ) : (
                    <>
                        {params.value?.Status === 2 ? (
                            <img className={'grid-icon'} src={minusIcon} id={params.value?.uuid} onClick={() => handleDisable(params.value?.uuid)} alt='img' title="Disable"/>

                        ) : (
                            <img className={'grid-icon'} src={checkIcon} id={params.value?.uuid} onClick={() => handleEnable(params.value?.uuid)} alt='img' title="Enable"/>

                        )
                        }
                        <img className={'grid-icon'} src={editIcon} id={params.value?.uuid} onClick={() => handleEdit(params.value?.uuid)} alt='img' title="Edit user"/>
                        <img className={'grid-icon'} src={trashIcon} id={params.value?.uuid} onClick={() => handleRemove(params.value?.uuid, params.value?.MD5)} alt='img' title="Remove"/>
                        <img className={'grid-icon'} src={resetPWIcon} id={params.value?.uuid} onClick={() => handleResetPassword(params.value?.uuid)} alt='img' title="Reset Password"/>
                    </>
                )
                }

            </>
        )
    }

    const rowDataGetter = (params) => {
        return params.data;
    };

    // date filter params
    const dateFilter = {
        comparator: (filterLocalDateAtMidnight, cellValue) => {

            var dateAsString = cellValue.split('T')[0];
            if (dateAsString == null) return -1;
            var dateParts = dateAsString.split('-');
            var cellDate = new Date(
                Number(dateParts[0]),
                Number(dateParts[1]) - 1,
                Number(dateParts[2]),
            );
            if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
                return 0;
            }
            if (cellDate < filterLocalDateAtMidnight) {
                return -1;
            }
            if (cellDate > filterLocalDateAtMidnight) {
                return 1;
            }
        }
    }

    const handleEdit = async (uuid) => {
        context.user.target = uuid
        if (users === "external") {
            navigate("/edit_external")
        } else {
            navigate("/edit_internal")
        }
    }

    const handleResetPassword = async (uuid) => {
        if (window.confirm('Are you sure you wish to reset password of user?')) {
            await context.axiosJWT.put(`/api/reset_password`, {
                    userid: uuid,
                    type: users
                },
                {headers: {authorization: "Bearer " + context.user.token}}
            ).catch(e => {
                setErrMsg("Internal error - please reload")
            })
        }
    }

    // disable handler
    const handleDisable = async (id) => {
        if (samples) {
            await context.axiosJWT.put(`/api/disable_samples`, {
                samples: samples,
                id: id},
                {headers: {authorization: "Bearer " + context.user.token}}
            ).catch(e => {
                setErrMsg("Internal error - please reload")
            })
        } else if (users === "external") {
            await context.axiosJWT.put(`/api/disable_users`,{id: id},
                {headers: {authorization: "Bearer " + context.user.token}}
            ).catch(e => {
                setErrMsg("Internal error - please reload")
            })
        }
        gridRef.current.api.refreshInfiniteCache();
    }

    // enable handler
    const handleEnable = async (id) => {
        if (samples) {
            await context.axiosJWT.put(`/api/enable_samples`, {
                samples: samples,
                id: id},
                {headers: {authorization: "Bearer " + context.user.token}}
            ).catch(e => {
                setErrMsg("Internal error - please reload")
            })
        } else if (users === "external") {
            await context.axiosJWT.put(`/api/enable_users`, {id: id},
                {headers: {authorization: "Bearer " + context.user.token}}
            ).catch(e => {
                setErrMsg("Internal error - please reload")
            })
        }
        gridRef.current.api.refreshInfiniteCache();
    }

    // removal handler
    const handleRemove = async (id, md5) => {
        if (samples) {
            if (window.confirm('Are you sure you wish to delete this sample?')) {
                await context.axiosJWT.delete(`/api/delete_samples`, {
                    headers: {authorization: "Bearer " + context.user.token},
                    data: {
                        samples: samples,
                        id: id,
                        md5: md5
                    }
                }).catch(e => {
                    setErrMsg("Internal error - please reload")
                })
                gridRef.current.api.refreshInfiniteCache();
            }
        } else if (users) {
            if (window.confirm('Are you sure you wish to delete this user?')) {
                await context.axiosJWT.delete(`/api/delete_users`, {
                    headers: {authorization: "Bearer " + context.user.token},
                    data: {
                        users: users,
                        id: id
                    }
                }).catch(e => {
                    setErrMsg("Internal error - please reload")
                })
                gridRef.current.api.refreshInfiniteCache();
            }
        }
    }

    const setTableOpts = () => {
        if (samples) {
            if (samples !== "urls") {
                // samples
                setColumnDefs([
                    {
                        field: "Id",
                        width: 100,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "MD5",
                        suppressSizeToFit: true,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "SHA256",
                        suppressSizeToFit: true,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Size",
                        width: 100,
                    },
                    {
                        headerName: 'Added on', field: "Date", valueFormatter: convertDate,
                        filter: 'agDateColumnFilter',
                        filterParams: dateFilter
                    },
                    {
                        field: "Type", width: 100,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Status", width: 120,
                        valueFormatter: convertStatus,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Actions", width: 160,
                        cellRenderer: actionsCellRenderer, valueGetter: rowDataGetter
                    },
                ])
            } else {
                // urls
                setColumnDefs([
                    {field: "MD5", suppressSizeToFit: true},
                    {field: "SHA256", suppressSizeToFit: true},
                    {headerName: 'Added on', field: "Date", valueFormatter: convertDate},
                    {field: "Status", valueFormatter: convertStatus},
                ])
            }
        } else if (users) {
            if (users === "external") {
                setColumnDefs([
                    {
                        field: "Id",
                        width: 100,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Username",
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Email",
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Company",
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        headerName: 'Last Login', field: "Login",
                        valueFormatter: convertDate,
                        filter: 'agDateColumnFilter',
                        filterParams: dateFilter
                    },
                    {
                        headerName: 'User Status', field: "Status", width: 120,
                        valueFormatter: convertStatusUser,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Actions", width: 160,
                        cellRenderer: actionsCellRendererUser, valueGetter: rowDataGetter
                    },
                ])
            } else if (users === "internal") {
                setColumnDefs([
                    {
                        field: "Id",
                        width: 100,
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        headerName: 'First Name', field: "Fname",
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        headerName: 'Last Name', field: "Lname",
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        field: "Email",
                        filter: 'agTextColumnFilter',
                        filterParams: textFilterParams,
                    },
                    {
                        headerName: 'Register Date', field: "Register",
                        filter: 'agDateColumnFilter',
                        valueFormatter: convertDate,
                        filterParams: dateFilter
                    },
                    {
                        headerName: 'Last Login', field: "Login",
                        valueFormatter: convertDate,
                        filter: 'agDateColumnFilter',
                        filterParams: dateFilter
                    },
                    {
                        field: "Actions", width: 160,
                        cellRenderer: actionsCellRendererUser, valueGetter: rowDataGetter
                    },
                ])
            }
        }
    }

    // grid formatter function
    const formatGrid = () => {
        if(gridRef.current.api){
            gridRef.current.api.sizeColumnsToFit();
            if (!formated) {
                setFormated(true)
                const allColumnIds = [];
                try{
                    gridRef.current.columnApi.getAllColumns().forEach((column) => {
                        allColumnIds.push(column.getId());
                    });
                }
                catch (e) {
                    setTimeout(() => {
                        gridRef.current.columnApi.getAllColumns().forEach((column) => {
                            allColumnIds.push(column.getId());
                        }); }, 1000);
                }
                gridRef.current.api.refreshCells({ force: true })
                gridRef.current.columnApi.autoSizeColumns(allColumnIds);
            }
        }
    }

    useEffect( (params) => {
        if(!lock.current){
            return
        }
        if (gridApi) {
            lock.current = false;
            context.gridFilter ? gridApi.setFilterModel(context.gridFilter) : gridApi.setFilterModel(null)
            const dataSource = {
                rowCount: null,
                getRows: (params) => {
                    const filters = Object.keys(gridApi.getFilterModel()).map(colId => ({
                        column: colId.toLowerCase(),
                        operator: params.filterModel[colId].filterType,
                        operator2: params.filterModel[colId].operator,
                        value: params.filterModel[colId].filter,
                        dateFrom: params.filterModel[colId].dateFrom,
                        dateTo: params.filterModel[colId].dateTo,
                        type: params.filterModel[colId].type,
                        condition1: params.filterModel[colId].condition1,
                        condition2: params.filterModel[colId].condition2
                    }));
                    const sort = params.sortModel.map(col => ({
                        column: col.colId.toLowerCase(),
                        operator: col.sort
                    }));
                    context.gridFilter = gridApi.getFilterModel();
                    let page = gridApi.paginationGetCurrentPage() ? gridApi.paginationGetCurrentPage() : 0
                    gridApi.showLoadingOverlay();
                    if(Number.isInteger(page)){
                        if(samples) {
                            context.axiosJWT.get(`/api/get_samples`, {
                                headers: {
                                    authorization: "Bearer " + context.user.token,
                                    samples: samples,
                                    page: page,
                                    filter: JSON.stringify(filters),
                                    sort: JSON.stringify(sort)
                                }
                            }).then(res => {
                                gridApi.paginationGoToPage(page)
                                params.successCallback(res.data.data, (page + 1) * 15);
                                gridApi.setRowCount(res.data.total)
                                gridApi.hideOverlay();
                                context.gridPage = page;
                                formatGrid()
                                lock.current = true;
                            }).catch(err => {});
                        }else{
                            context.axiosJWT.get(`/api/get_users`, {
                                headers: {
                                    authorization: "Bearer " + context.user.token,
                                    users: users,
                                    page: page,
                                    filter: JSON.stringify(filters),
                                    sort: JSON.stringify(sort)
                                }
                            }).then(res => {
                                gridApi.paginationGoToPage(page)
                                params.successCallback(res.data.data, (page + 1) * 15);
                                gridApi.setRowCount(res.data.total)
                                gridApi.hideOverlay();
                                context.gridPage = page;
                                formatGrid()
                                lock.current = true;
                            }).catch(err => {});
                        }
                    }
                }
            }
            gridApi.setDatasource(dataSource);
            context.columnApi = gridColumnApi;
            setTableOpts()
        }
    }, [samples, users, gridApi]);

    const onGridReady = (params) => {
        context.gridPage = context.gridPage ? context.gridPage : 0;
        context.columnApi ? setGridColumnApi(context.columnApi) : setGridColumnApi(params.columnApi)
        setGridApi(params.api);
        formatGrid()
    };

    useEffect(() => {
        gridRef.current.api?.refreshInfiniteCache()
    }, [context.user.token])

    const onGridChanged = (params) => {
        if (gridApi) {
            formatGrid()
            if(params.newPage){
                context.gridPage = gridApi.paginationGetCurrentPage();
            }
        }
    }

    useEffect(() => {
        if (gridApi) {
            gridColumnApi.applyColumnState({
                defaultState: {sort: null}
            });
            gridApi.setFilterModel(null);
            context.gridFilter = null;
            context.gridPage = 0;
            setTableOpts()
            formatGrid()
        }
    }, [samples, users])


    return (
        <>
            <div className="wrapper">
                <div className="ag-theme-alpine" style={{width: "165vh"}}>
                    <AgGridReact
                        rowHeight={'40px'}
                        ref={gridRef}
                        columnDefs={columnDefs}
                        defaultColDef={{sortable: true}}
                        onFirstDataRendered={formatGrid}
                        rowModelType={'infinite'}
                        onGridReady={onGridReady}
                        suppressHeaders={formated}
                        suppressCellContent={formated}
                        maxConcurrentDatasourceRequests={2}
                        infiniteInitialRowCount={1}
                        onPaginationChanged={onGridChanged}
                        pagination={true}
                        enableCellTextSelection={true}
                        paginationPageSize={15}
                        cacheBlockSize={15}
                        maxBlocksInCache={1}
                        animateRows={true}
                    >
                    </AgGridReact>
                </div>
            </div>

        </>

    );
};