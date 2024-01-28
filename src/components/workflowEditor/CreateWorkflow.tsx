import React, { Component } from 'react';
import { AddWorkflowProps, AddWorkflowState } from './types';
import { CustomInput, DialogForm, DialogFormSubmit, ServerErrors, showError } from '@devtron-labs/devtron-fe-common-lib'
import { createWorkflow, updateWorkflow } from './service';
import { toast } from 'react-toastify';
import { getWorkflowList } from '../../services/service';
import error from '../../assets/icons/misc/errorInfo.svg';
import { REQUIRED_FIELD_MSG } from '../../config/constantMessaging';

export default class AddWorkflow extends Component<AddWorkflowProps, AddWorkflowState>  {
    _inputName: HTMLInputElement;

    constructor(props) {
        super(props);
        this.state = {
            id: 0,
            name: "",
            showError: false,
        }
    }

    componentDidMount() {
        if (this.props.match.params.workflowId) {
            this.getWorkflow();
        }
        if (this._inputName) {
            this._inputName.focus();
        }
    }

    getWorkflow(): void {
        getWorkflowList(this.props.match.params.appId).then((response) => {
            if (response.result) {
                let workflows = response.result.workflows || [];
                let workflow = workflows.find(wf => wf.id == +this.props.match.params.workflowId);
                if (workflow) this.setState({ id: workflow.id, name: workflow.name });
                else toast.error("Workflow Not Found");
            }
        }).catch((error: ServerErrors) => {
            showError(error)
        })
        if (this._inputName) this._inputName.focus();
    }

    handleWorkflowName = (event): void => {
        this.setState({ name: event.target.value });
    }

    saveWorkflow = (event): void => {
        event.preventDefault();
        this.setState({ showError: true });
        let request = {
            appId: +this.props.match.params.appId,
            id: this.state.id,
            name: this.state.name
        }
        if (!this.isNameValid()) return;
        let message = this.state.id ? "Workflow Updated Successfully" : "Workflow Created successfully";
        let promise = this.props.match.params.workflowId ? updateWorkflow(request) : createWorkflow(request);
        promise.then((response) => {
            toast.success(message);
            this.setState({
                id: response.result.id,
                name: response.result.name,
                showError: false
            });
            this.props.onClose();
            this.props.getWorkflows();
        }).catch((error: ServerErrors) => {
            showError(error)
        })
    }

    isNameValid(): boolean {
        return !!this.state.name?.length;
    }

    render() {
        let isValid = this.isNameValid();
        let title = this.props.match.params.workflowId ? "Edit Workflow" : "Add Workflow";
        return (
            <DialogForm
                title={title}
                className=""
                close={(event) => this.props.onClose()}
                onSave={this.saveWorkflow}
                isLoading={false}
                closeOnESC={true}
            >
                <label className="form__row">
                    <CustomInput
                        ref={(node) => {
                            if (node) node.focus()
                            this._inputName = node
                        }}
                        name="workflow-name"
                        label="Workflow Name"
                        value={this.state.name}
                        placeholder="e.g. production workflow"
                        autoFocus={true}
                        tabIndex={1}
                        onChange={this.handleWorkflowName}
                        isRequiredField={true}
                        error={this.state.showError && !isValid && REQUIRED_FIELD_MSG}
                    />
                </label>
                <DialogFormSubmit tabIndex={2}>Save</DialogFormSubmit>
            </DialogForm>
        )
    }
}