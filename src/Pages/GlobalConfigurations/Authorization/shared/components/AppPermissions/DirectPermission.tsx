/* eslint-disable react/prop-types */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable no-nested-ternary */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { showError, Option } from '@devtron-labs/devtron-fe-common-lib'
import Select, { components } from 'react-select'
import {
    sortBySelected,
    importComponentFromFELibrary,
    createClusterEnvGroup,
} from '../../../../../../components/common'
import { getAllWorkflowsForAppNames } from '../../../../../../services/service'
import { EntityTypes, DirectPermissionRow } from '../userGroups/userGroups.types'
import { ACCESS_TYPE_MAP, HELM_APP_UNASSIGNED_PROJECT } from '../../../../../../config'
import { ReactComponent as TrashIcon } from '../../../../../../assets/icons/ic-delete-interactive.svg'
import { GroupHeading, Option as singleOption } from '../../../../../../components/v2/common/ReactSelect.utils'
import { DEFAULT_ENV } from '../../../../../../components/app/details/triggerView/Constants'
import { useAuthorizationContext } from '../../../AuthorizationProvider'
import { CONFIG_APPROVER_ACTION, authorizationSelectStyles } from '../userGroups/UserGroup'
import { AppOption, clusterValueContainer, ProjectValueContainer, ValueContainer, WorkflowGroupHeading } from './common'
import { allApplicationsOption, allEnvironmentsOption } from './constants'
import { getWorkflowOptions, parseData } from '../../../utils'

const ApproverPermission = importComponentFromFELibrary('ApproverPermission')

// TODO (v3): Move the type to the immediate file + AppPermission
const DirectPermission = ({
    permission,
    handleDirectPermissionChange,
    index,
    removeRow,
    appsList,
    jobsList,
    appsListHelmApps,
    projectsList,
    environmentsList,
    envClustersList,
}: DirectPermissionRow) => {
    const { customRoles } = useAuthorizationContext()
    const projectId =
        permission.team && permission.team.value !== HELM_APP_UNASSIGNED_PROJECT
            ? projectsList.find((project) => project.name === permission.team.value)?.id
            : null
    const multiRole = permission.action.value.split(',')
    const configApproverRoleIndex = multiRole.indexOf(CONFIG_APPROVER_ACTION.value)
    const primaryActionRoleIndex = configApproverRoleIndex === 0 ? 1 : 0
    const primaryActionRole = {
        label: multiRole[primaryActionRoleIndex],
        value: multiRole[primaryActionRoleIndex],
        configApprover: multiRole[configApproverRoleIndex]
            ? !!multiRole[configApproverRoleIndex]
            : permission.action.configApprover,
    }

    const [openMenu, changeOpenMenu] = useState<
        'entityName/apps' | 'entityName/jobs' | 'environment' | 'workflow' | ''
    >('')
    const [environments, setEnvironments] = useState([])
    const [applications, setApplications] = useState([])
    const [envClusters, setEnvClusters] = useState([])
    const [projectInput, setProjectInput] = useState('')
    const [clusterInput, setClusterInput] = useState('')
    const [envInput, setEnvInput] = useState('')
    const [appInput, setAppInput] = useState('')
    const [workflowInput, setWorkflowInput] = useState('')
    const [workflowList, setWorkflowList] = useState({ loading: false, options: [] })

    const abortControllerRef = useRef<AbortController>(new AbortController())

    const isAccessTypeJob = permission.accessType === ACCESS_TYPE_MAP.JOBS
    const possibleRoles = useMemo(
        () =>
            customRoles.customRoles.map(({ roleDisplayName, roleName, roleDescription, entity, accessType }) => ({
                label: roleDisplayName,
                value: roleName,
                description: roleDescription,
                entity,
                accessType,
            })),
        [customRoles],
    )

    // eslint-disable-next-line react/no-unstable-nested-components
    const RoleValueContainer = ({
        children,
        getValue,
        clearValue,
        cx,
        getStyles,
        hasValue,
        isMulti,
        options,
        selectOption,
        selectProps,
        setValue,
        isDisabled,
        isRtl,
        theme,
        getClassNames,
        ...props
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }: any) => {
        const [{ value }] = getValue()
        return (
            <components.ValueContainer
                {...{
                    getValue,
                    clearValue,
                    cx,
                    getStyles,
                    hasValue,
                    isMulti,
                    options,
                    selectOption,
                    selectProps,
                    setValue,
                    isDisabled,
                    isRtl,
                    theme,
                    getClassNames,
                    ...props,
                }}
            >
                {value === '*'
                    ? 'Admin'
                    : permission.accessType === ACCESS_TYPE_MAP.HELM_APPS
                      ? customRoles.possibleRolesMetaForHelm[value].value
                      : permission.entity === EntityTypes.JOB
                        ? customRoles.possibleRolesMetaForJob[value].value
                        : customRoles.possibleRolesMeta[value].value}
                {ApproverPermission && (permission.approver || primaryActionRole.configApprover) && ', Approver'}
                {React.cloneElement(children[1])}
            </components.ValueContainer>
        )
    }

    const formatOptionLabel = ({ value }) => (
        <div className="flex left column">
            <span>
                {
                    (permission.accessType === ACCESS_TYPE_MAP.HELM_APPS
                        ? customRoles.possibleRolesMetaForHelm
                        : permission.accessType === ACCESS_TYPE_MAP.JOBS
                          ? customRoles.possibleRolesMetaForJob
                          : customRoles.possibleRolesMeta)[value]?.value
                }
            </span>
            <small className="light-color">
                {
                    (permission.accessType === ACCESS_TYPE_MAP.HELM_APPS
                        ? customRoles.possibleRolesMetaForHelm
                        : permission.accessType === ACCESS_TYPE_MAP.JOBS
                          ? customRoles.possibleRolesMetaForJob
                          : customRoles.possibleRolesMeta)[value]?.description
                }
            </small>
        </div>
    )

    // eslint-disable-next-line react/no-unstable-nested-components
    const RoleMenuList = (props) => (
        <components.MenuList {...props}>
            {props.children}
            {ApproverPermission && permission.accessType === ACCESS_TYPE_MAP.DEVTRON_APPS && (
                <ApproverPermission
                    optionProps={props}
                    approver={permission.approver}
                    configApprover={primaryActionRole.configApprover}
                    handleDirectPermissionChange={(...rest) => {
                        props.selectOption(props.selectProps.value)
                        handleDirectPermissionChange(...rest)
                    }}
                    formatOptionLabel={formatOptionLabel}
                />
            )}
        </components.MenuList>
    )

    const setWorkflowsForJobs = async (_permission) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        abortControllerRef.current = new AbortController()
        setWorkflowList({ loading: true, options: [] })
        try {
            setWorkflowList({ loading: true, options: [] })
            const jobNames = _permission.entityName.filter((option) => option.value !== '*').map((app) => app.label)
            const {
                result: { appIdWorkflowNamesMapping },
            } = await getAllWorkflowsForAppNames(jobNames, abortControllerRef.current.signal)
            const workflowOptions = getWorkflowOptions(appIdWorkflowNamesMapping)
            abortControllerRef.current = null
            setWorkflowList({ loading: false, options: workflowOptions })
        } catch (err) {
            if (err.errors && err.errors[0].code !== 0) {
                showError(err)
            }
            setWorkflowList({ loading: false, options: [] })
        }
    }

    useEffect(() => {
        const envOptions = createClusterEnvGroup(
            environmentsList,
            'cluster_name',
            'environment_name',
            'environmentIdentifier',
        )

        if (permission.entity === EntityTypes.JOB) {
            const defaultEnv = {
                label: '',
                options: [
                    {
                        label: DEFAULT_ENV,
                        value: DEFAULT_ENV,
                    },
                ],
            }
            const filteredEnvOptions = envOptions.filter((_envOptions) => {
                const filteredOptions = _envOptions.options.filter((option) => option.isClusterCdActive)
                if (filteredOptions.length > 0) {
                    // eslint-disable-next-line no-param-reassign
                    _envOptions.options = filteredOptions
                }
                return filteredOptions.length > 0
            })
            setEnvironments([defaultEnv, ...filteredEnvOptions])
        } else {
            setEnvironments(envOptions)
        }
    }, [environmentsList])

    useEffect(() => {
        const envOptions = envClustersList?.map((cluster) => ({
            label: cluster.clusterName,
            options: [
                {
                    label: `All existing + future environments in ${cluster.clusterName}`,
                    value: `#${cluster.clusterName}`,
                    namespace: '',
                    clusterName: '',
                },
                {
                    label: `All existing environments in ${cluster.clusterName}`,
                    value: `*${cluster.clusterName}`,
                    namespace: '',
                    clusterName: '',
                },
                ...(cluster.environments?.map((env) => ({
                    label: env.environmentName,
                    value: env.environmentIdentifier,
                    namespace: env.namespace,
                    clusterName: cluster.clusterName,
                })) ?? {}),
            ],
            isVirtualEnvironment: cluster?.isVirtualCluster,
        }))

        setEnvClusters(envOptions)
    }, [envClustersList])
    useEffect(() => {
        const isJobs = permission.entity === EntityTypes.JOB
        const appOptions = (
            (projectId &&
                (permission.accessType === ACCESS_TYPE_MAP.DEVTRON_APPS
                    ? appsList
                    : isJobs
                      ? jobsList
                      : appsListHelmApps
                ).get(projectId)?.result) ||
            []
        )?.map((app) => ({
            label: isJobs ? app.jobName : app.name,
            value: isJobs ? app.appName : app.name,
        }))
        setApplications(appOptions)
        if (permission.entity === EntityTypes.JOB && permission.entityName.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            setWorkflowsForJobs(permission)
        }
    }, [appsList, appsListHelmApps, projectId, jobsList])

    useEffect(() => {
        if (openMenu || !projectId) {
            return
        }
        if ((environments && environments.length === 0) || applications.length === 0) {
            return
        }
        setApplications((_applications) => {
            const sortedApplications =
                openMenu === 'entityName/apps' || openMenu === 'entityName/jobs'
                    ? _applications
                    : sortBySelected(permission.entityName, _applications, 'value')
            return sortedApplications
        })
    }, [openMenu, permission.environment, permission.entityName, projectId])

    const formatOptionLabelClusterEnv = (option, { inputValue }) => (
        <div
            className={`flex left column ${
                option.value && (option.value.startsWith('#') || option.value.startsWith('*')) && 'fs-13 fw-6 cn-9'
            }`}
        >
            {!inputValue ? (
                <>
                    <span>{option.label}</span>
                    <small className={permission.accessType === ACCESS_TYPE_MAP.HELM_APPS && 'light-color'}>
                        {option.clusterName +
                            (option.clusterName && option.namespace ? '/' : '') +
                            (option.namespace || '')}
                    </small>
                </>
            ) : (
                <>
                    <span
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{
                            __html: option.label.replace(
                                new RegExp(inputValue, 'gi'),
                                (highlighted) => `<mark>${highlighted}</mark>`,
                            ),
                        }}
                    />
                    {option.clusterName && option.namespace && (
                        <small
                            className={permission.accessType === ACCESS_TYPE_MAP.HELM_APPS && 'light-color'}
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{
                                __html: `${option.clusterName}/${option.namespace}`.replace(
                                    new RegExp(inputValue, 'gi'),
                                    (highlighted) => `<mark>${highlighted}</mark>`,
                                ),
                            }}
                        />
                    )}
                </>
            )}
        </div>
    )

    const formatOptionLabelProject = (option) => (
        <div className="flex left column">
            <span>{option.label}</span>
            {permission.accessType === ACCESS_TYPE_MAP.HELM_APPS && option.value === HELM_APP_UNASSIGNED_PROJECT && (
                <>
                    <small className="light-color">Apps without an assigned project</small>
                    <div className="unassigned-project-border" />
                </>
            )}
        </div>
    )

    const customFilter = (option, searchText) =>
        option.data.label?.toLowerCase().includes(searchText?.toLowerCase()) ||
        option.data.clusterName?.toLowerCase().includes(searchText?.toLowerCase()) ||
        option.data.namespace?.toLowerCase().includes(searchText?.toLowerCase())

    const onFocus = (name: 'entityName/apps' | 'entityName/jobs' | 'environment' | 'workflow') => {
        changeOpenMenu(name)
    }

    const onMenuClose = () => {
        changeOpenMenu('')
    }
    return (
        <>
            <Select
                value={permission.team}
                name="team"
                isMulti={false}
                placeholder="Select project"
                options={(permission.accessType === ACCESS_TYPE_MAP.HELM_APPS
                    ? [{ name: HELM_APP_UNASSIGNED_PROJECT }, ...(projectsList || [])]
                    : projectsList
                )?.map((project) => ({ label: project.name, value: project.name }))}
                onChange={handleDirectPermissionChange}
                components={{
                    ClearIndicator: null,
                    IndicatorSeparator: null,
                    Option: singleOption,
                    ValueContainer: ProjectValueContainer,
                }}
                menuPlacement="auto"
                styles={{
                    ...authorizationSelectStyles,
                    valueContainer: (base) => ({
                        ...authorizationSelectStyles.valueContainer(base),
                        display: 'flex',
                    }),
                }}
                formatOptionLabel={formatOptionLabelProject}
                inputValue={projectInput}
                onBlur={() => {
                    setProjectInput('')
                }}
                onInputChange={(value, action) => {
                    if (action.action === 'input-change') {
                        setProjectInput(value)
                    }
                }}
            />
            {permission.accessType === ACCESS_TYPE_MAP.HELM_APPS ? (
                <div>
                    <Select
                        value={permission.environment}
                        isMulti
                        closeMenuOnSelect={false}
                        name="environment"
                        onFocus={() => onFocus('environment')}
                        onMenuClose={onMenuClose}
                        placeholder="Select environments"
                        options={envClusters}
                        formatOptionLabel={formatOptionLabelClusterEnv}
                        filterOption={customFilter}
                        hideSelectedOptions={false}
                        menuPlacement="auto"
                        styles={authorizationSelectStyles}
                        components={{
                            ClearIndicator: null,
                            ValueContainer: clusterValueContainer,
                            IndicatorSeparator: null,
                            Option,
                            GroupHeading,
                        }}
                        isDisabled={!permission.team}
                        onChange={handleDirectPermissionChange}
                        blurInputOnSelect={false}
                        inputValue={clusterInput}
                        onBlur={() => {
                            setClusterInput('')
                        }}
                        onInputChange={(value, action) => {
                            if (action.action === 'input-change') {
                                setClusterInput(value)
                            }
                        }}
                    />
                    {permission.environmentError && <span className="form__error">{permission.environmentError}</span>}
                </div>
            ) : (
                <div style={{ order: isAccessTypeJob ? 3 : 0 }}>
                    <Select
                        value={permission.environment}
                        isMulti
                        closeMenuOnSelect={false}
                        name="environment"
                        onFocus={() => onFocus('environment')}
                        onMenuClose={onMenuClose}
                        placeholder="Select environments"
                        options={[{ label: '', options: [allEnvironmentsOption] }, ...environments]}
                        menuPlacement="auto"
                        hideSelectedOptions={false}
                        styles={authorizationSelectStyles}
                        components={{
                            ClearIndicator: null,
                            ValueContainer,
                            IndicatorSeparator: null,
                            Option,
                            GroupHeading,
                        }}
                        isDisabled={!permission.team}
                        onChange={handleDirectPermissionChange}
                        inputValue={envInput}
                        onBlur={() => {
                            setEnvInput('')
                        }}
                        onInputChange={(value, action) => {
                            if (action.action === 'input-change') {
                                setEnvInput(value)
                            }
                        }}
                    />
                    {permission.environmentError && <span className="form__error">{permission.environmentError}</span>}
                </div>
            )}
            <div style={{ order: isAccessTypeJob ? 1 : 0 }}>
                <Select
                    value={permission.entityName}
                    isMulti
                    components={{
                        ClearIndicator: null,
                        ValueContainer,
                        IndicatorSeparator: null,
                        // eslint-disable-next-line react/no-unstable-nested-components
                        Option: (props) => <AppOption props={props} permission={permission} />,
                        GroupHeading,
                    }}
                    isLoading={
                        projectId
                            ? (permission.accessType === ACCESS_TYPE_MAP.DEVTRON_APPS
                                  ? appsList
                                  : permission.entity === EntityTypes.JOB
                                    ? jobsList
                                    : appsListHelmApps
                              ).get(projectId)?.loading
                            : false
                    }
                    isDisabled={!permission.team}
                    styles={authorizationSelectStyles}
                    closeMenuOnSelect={false}
                    name={`entityName/${permission.entity}`}
                    onFocus={() => onFocus(`entityName/${permission.entity}`)}
                    onMenuClose={onMenuClose}
                    placeholder={isAccessTypeJob ? 'Select Job' : 'Select applications'}
                    options={[allApplicationsOption(permission.entity), ...applications]}
                    onChange={handleDirectPermissionChange}
                    hideSelectedOptions={false}
                    inputValue={appInput}
                    menuPlacement="auto"
                    onBlur={() => {
                        setAppInput('') // send selected options to setWorkflowsForJobs function
                        if (permission.entity === EntityTypes.JOB && !jobsList.get(projectId)?.loading) {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            setWorkflowsForJobs(permission)
                        }
                    }}
                    onInputChange={(value, action) => {
                        if (action.action === 'input-change') {
                            setAppInput(value)
                        }
                    }}
                />
                {permission.entityNameError && <span className="form__error">{permission.entityNameError}</span>}
            </div>
            {permission.entity === EntityTypes.JOB && (
                <div style={{ order: 2 }}>
                    <Select
                        value={permission.workflow}
                        isMulti
                        closeMenuOnSelect={false}
                        name="workflow"
                        onFocus={() => onFocus('workflow')}
                        onMenuClose={onMenuClose}
                        placeholder="Select workflow"
                        options={[
                            { label: '', options: [{ label: 'All Workflows', value: '*' }] },
                            ...workflowList.options,
                        ]}
                        className="basic-multi-select"
                        menuPlacement="auto"
                        hideSelectedOptions={false}
                        styles={authorizationSelectStyles}
                        isLoading={workflowList.loading}
                        components={{
                            ClearIndicator: null,
                            ValueContainer,
                            IndicatorSeparator: null,
                            Option,
                            GroupHeading: WorkflowGroupHeading,
                        }}
                        isDisabled={!permission.team}
                        onChange={(value, actionMeta) => {
                            handleDirectPermissionChange(value, actionMeta, workflowList)
                        }}
                        inputValue={workflowInput}
                        onBlur={() => {
                            setWorkflowInput('')
                        }}
                        onInputChange={(value, action) => {
                            if (action.action === 'input-change') {
                                setWorkflowInput(value)
                            }
                        }}
                    />
                    {permission.workflowError && <span className="form__error">{permission.workflowError}</span>}
                </div>
            )}
            <div style={{ order: isAccessTypeJob ? 4 : 0 }}>
                <Select
                    value={primaryActionRole}
                    name="action"
                    placeholder="Select role"
                    options={parseData(possibleRoles, permission.entity, permission.accessType)}
                    formatOptionLabel={formatOptionLabel}
                    onChange={handleDirectPermissionChange}
                    isDisabled={!permission.team}
                    menuPlacement="auto"
                    blurInputOnSelect
                    styles={{
                        ...authorizationSelectStyles,
                        option: (base, state) => ({
                            ...authorizationSelectStyles.option(base, state),
                            cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                            marginRight: '8px',
                        }),
                        valueContainer: (base) => ({
                            ...authorizationSelectStyles.valueContainer(base),
                            display: 'flex',
                            flexWrap: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        }),
                    }}
                    components={{
                        ClearIndicator: null,
                        IndicatorSeparator: null,
                        ValueContainer: RoleValueContainer,
                        MenuList: RoleMenuList,
                    }}
                />
            </div>
            <button
                type="button"
                className="dc__transparent flex"
                onClick={() => removeRow(index)}
                aria-label="Delete row"
                style={{ order: 5 }}
            >
                <TrashIcon className="scn-6 icon-dim-16 icon-delete" />
            </button>
        </>
    )
}

export default DirectPermission
