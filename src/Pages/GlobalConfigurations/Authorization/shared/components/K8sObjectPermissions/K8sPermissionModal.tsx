import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { Drawer, OptionType, stopPropagation } from '@devtron-labs/devtron-fe-common-lib'
import { ReactComponent as Close } from '../../../../../../assets/icons/ic-close.svg'
import { ReactComponent as AddIcon } from '../../../../../../assets/icons/ic-add.svg'
import K8sListItemCard from './K8sListItemCard'
import { getPermissionObject } from './K8sPermissions.utils'
import { usePermissionConfiguration } from '../PermissionConfigurationForm'
import { K8sPermissionActionType } from './constants'
import { K8sPermissionModalType } from './types'

const K8sPermissionModal = ({
    selectedPermissionAction,
    // This is different from the k8sPermission in the context
    updatedK8sPermission: k8sPermission,
    close,
}: K8sPermissionModalType) => {
    const { setK8sPermission } = usePermissionConfiguration()
    const [k8sPermissionList, setK8sPermissionList] = useState([getPermissionObject(0, k8sPermission)])
    const [namespaceMapping, setNamespaceMapping] = useState<Record<string, OptionType[]>>()
    const [apiGroupMapping, setApiGroupMapping] = useState<Record<number, OptionType[]>>()
    const [kindMapping, setKindMapping] = useState<Record<number, OptionType[]>>()
    const [objectMapping, setObjectMapping] = useState<Record<number, OptionType[]>>()

    const handleK8sPermission = (action: K8sPermissionActionType, key?: number, data?) => {
        let _k8sPermissionList = [...k8sPermissionList]
        switch (action) {
            case K8sPermissionActionType.add:
                _k8sPermissionList = [getPermissionObject(_k8sPermissionList.length), ..._k8sPermissionList]
                break
            case K8sPermissionActionType.delete:
                _k8sPermissionList.filter((permission) => permission.key !== key)
                break
            case K8sPermissionActionType.clone: {
                const currentLen = _k8sPermissionList.length
                _k8sPermissionList = [getPermissionObject(currentLen, _k8sPermissionList[key]), ..._k8sPermissionList]
                setApiGroupMapping((prevMapping) => ({ ...prevMapping, [currentLen]: apiGroupMapping?.[key] }))
                setKindMapping((prevMapping) => ({
                    ...prevMapping,
                    [currentLen]: kindMapping?.[key],
                }))
                setObjectMapping((prevMapping) => ({
                    ...prevMapping,
                    [currentLen]: objectMapping?.[key],
                }))
                break
            }
            case K8sPermissionActionType.edit:
                _k8sPermissionList[key].cluster = data
                break
            case K8sPermissionActionType.onClusterChange:
                _k8sPermissionList[key].cluster = data
                _k8sPermissionList[key].namespace = null
                _k8sPermissionList[key].group = null
                _k8sPermissionList[key].kind = null
                _k8sPermissionList[key].resource = null
                break
            case K8sPermissionActionType.onNamespaceChange:
                _k8sPermissionList[key].namespace = data
                _k8sPermissionList[key].group = null
                _k8sPermissionList[key].kind = null
                _k8sPermissionList[key].resource = null
                break
            case K8sPermissionActionType.onApiGroupChange:
                _k8sPermissionList[key].group = data
                _k8sPermissionList[key].kind = null
                _k8sPermissionList[key].resource = null
                break
            case K8sPermissionActionType.onKindChange:
                _k8sPermissionList[key].kind = data
                _k8sPermissionList[key].resource = null
                break
            case K8sPermissionActionType.onObjectChange:
                _k8sPermissionList[key].resource = data
                break
            case K8sPermissionActionType.onRoleChange:
                _k8sPermissionList[key].action = data
                break
            default:
                break
        }
        setK8sPermissionList(_k8sPermissionList)
    }

    const addNewPermissionCard = () => {
        handleK8sPermission(K8sPermissionActionType.add)
    }

    const savePermission = () => {
        const isPermissionValid = k8sPermissionList.every((permission) => !!permission.resource?.length)

        if (isPermissionValid) {
            setK8sPermission((prev) => {
                if (selectedPermissionAction?.action === K8sPermissionActionType.edit) {
                    if (k8sPermissionList?.length) {
                        // eslint-disable-next-line no-param-reassign
                        prev[selectedPermissionAction.index] = k8sPermissionList[k8sPermissionList.length - 1]
                        return [...prev]
                    }
                    return prev.filter((_permission, index) => index !== selectedPermissionAction.index)
                }
                if (selectedPermissionAction?.action === K8sPermissionActionType.clone && !k8sPermissionList?.length) {
                    return [...prev]
                }
                return [...prev, ...k8sPermissionList]
            })
            close()
        } else {
            toast.error('Some required inputs are not selected')
        }
    }

    return (
        <Drawer onEscape={close} position="right" width="800px">
            <div onClick={stopPropagation} className="h-100 dc__overflow-hidden">
                <div className="flex pt-12 pb-12 pl-20 pr-20 dc__content-space bcn-0 dc__border-bottom">
                    <span className="flex left fw-6 lh-24 fs-16">Kubernetes resource permission</span>
                    <span className="icon-dim-20 cursor" data-testid="k8s-permission-drawer-close" onClick={close}>
                        <Close />
                    </span>
                </div>
                {/* TODO (v3): Fix height issue */}
                <div className="p-20 fs-13 dc__overflow-scroll dc__cluster-modal">
                    {!selectedPermissionAction && (
                        <div className="flex left fs-13 fw-6">
                            <span className="flex cb-5 cursor" onClick={addNewPermissionCard}>
                                <AddIcon className="add-svg fcb-5 mr-12" />
                                Add another
                            </span>
                        </div>
                    )}
                    {k8sPermissionList?.map((_k8sPermission, index) => (
                        <K8sListItemCard
                            k8sPermission={_k8sPermission}
                            handleK8sPermission={handleK8sPermission}
                            index={index}
                            namespaceMapping={namespaceMapping}
                            setNamespaceMapping={setNamespaceMapping}
                            apiGroupMapping={apiGroupMapping}
                            setApiGroupMapping={setApiGroupMapping}
                            kindMapping={kindMapping}
                            setKindMapping={setKindMapping}
                            objectMapping={objectMapping}
                            setObjectMapping={setObjectMapping}
                            selectedPermissionAction={selectedPermissionAction}
                            key={_k8sPermission.key}
                        />
                    ))}
                </div>
                <div className="w-100 pt-16 pb-16 pl-20 pr-20 flex right bcn-0 dc__border-top">
                    <button
                        type="button"
                        data-testid="k8s-permission-cancel"
                        className="cta cancel h-36 flex mr-16"
                        onClick={close}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        data-testid="k8s-permission-save"
                        className="cta h-36 flex"
                        onClick={savePermission}
                    >
                        Done
                    </button>
                </div>
            </div>
        </Drawer>
    )
}

export default K8sPermissionModal
