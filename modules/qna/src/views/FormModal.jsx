import React, { Component } from 'react'
import { FormControl, Button, Modal, Alert } from 'react-bootstrap'
import classnames from 'classnames'
import some from 'lodash/some'
import ElementsList from 'botpress/elements-list'

import Select from 'react-select'
import style from './style.scss'

const ACTIONS = {
  TEXT: 'text',
  REDIRECT: 'redirect',
  TEXT_REDIRECT: 'text_redirect'
}

export default class FormModal extends Component {
  defaultState = {
    item: {
      answers: [],
      questions: [],
      redirectFlow: '',
      redirectNode: '',
      action: ACTIONS.TEXT,
      category: '',
      enabled: true
    },
    invalidFields: {
      category: false,
      questions: false,
      answer: false,
      checkbox: false,
      redirectFlow: false,
      redirectNode: false
    },
    isText: true,
    isRedirect: false,
    isValidForm: true
  }

  state = this.defaultState

  componentDidUpdate(prevProps) {
    const { id } = this.props
    if (prevProps.id === id) {
      return
    }
    if (!id) {
      return this.setState(this.defaultState)
    }
    this.props.bp.axios.get(`/mod/qna/questions/${id}`).then(({ data: { data: item } }) => {
      this.setState({
        item,
        isRedirect: [ACTIONS.REDIRECT, ACTIONS.TEXT_REDIRECT].includes(item.action),
        isText: [ACTIONS.TEXT, ACTIONS.TEXT_REDIRECT].includes(item.action)
      })
    })
  }

  closeAndClear = () => {
    this.props.closeQnAModal()
    this.setState(this.defaultState)
  }

  changeItemProperty = (key, value) => {
    const { item } = this.state

    this.setState({ item: { ...item, [key]: value } })
  }

  handleSelect = key => selectedOption =>
    this.changeItemProperty(key, selectedOption ? selectedOption.value : selectedOption)

  changeItemAction = actionType => () => {
    this.setState({ [actionType]: !this.state[actionType] }, () => {
      const { isText, isRedirect } = this.state
      const action = isText && isRedirect ? ACTIONS.TEXT_REDIRECT : isRedirect ? ACTIONS.REDIRECT : ACTIONS.TEXT

      this.changeItemProperty('action', action)
    })
  }

  validateForm() {
    const { item, isText, isRedirect } = this.state
    const invalidFields = {
      questions: !item.questions.length || !item.questions[0].length,
      answer: isText && (!item.answers.length || !item.answers[0].length),
      checkbox: !(isText || isRedirect),
      redirectFlow: isRedirect && !item.redirectFlow,
      redirectNode: isRedirect && !item.redirectNode
    }

    this.setState({ invalidFields })
    return some(invalidFields)
  }

  trimItemQuestions = questions => {
    return questions.map(q => q.trim()).filter(q => q !== '')
  }

  onCreate = event => {
    event.preventDefault()
    if (this.validateForm()) {
      this.setState({ isValidForm: false })

      return
    }

    if (!this.state.isValidForm) {
      this.setState({ isValidForm: true })
    }

    const item = this.state.item
    const questions = this.trimItemQuestions(item.questions)

    return this.props.bp.axios.post('/mod/qna/questions', { ...item, questions }).then(() => {
      this.props.fetchData()
      this.closeAndClear()
    })
  }

  onEdit = event => {
    event.preventDefault()
    if (this.validateForm()) {
      this.setState({ isValidForm: false })

      return
    }

    if (!this.state.isValidForm) {
      this.setState({ isValidForm: true })
    }

    const {
      page,
      filters: { question, categories }
    } = this.props

    const item = this.state.item
    const questions = this.trimItemQuestions(item.questions)

    return this.props.bp.axios
      .put(
        `/mod/qna/questions/${this.props.id}`,
        { ...item, questions },
        {
          params: { ...page, question, categories: categories.map(({ value }) => value) }
        }
      )
      .then(({ data }) => {
        this.props.updateQuestion(data)
        this.closeAndClear()
      })
  }

  alertMessage() {
    if (this.state.isValidForm) {
      return null
    }

    const hasInvalidInputs = Object.values(this.state.invalidFields).find(Boolean)

    return (
      <div>
        {this.state.invalidFields.checkbox ? <Alert bsStyle="danger">Action checkbox is required</Alert> : null}
        {hasInvalidInputs ? <Alert bsStyle="danger">Inputs are required</Alert> : null}
      </div>
    )
  }

  handleSubmit = event => {
    this.props.modalType === 'edit' ? this.onEdit(event) : this.onCreate(event)
  }

  createAnswer = answer => {
    const answers = [...this.state.item.answers, answer]
    this.changeItemProperty('answers', answers)
  }

  updateAnswer = (answer, index) => {
    const answers = this.state.item.answers
    if (answers[index]) {
      answers[index] = answer
      this.changeItemProperty('answers', answers)
    }
  }

  deleteAnswer = index => {
    const answers = this.state.item.answers
    if (answers[index]) {
      answers.splice(index, 1)
      this.changeItemProperty('answers', answers)
    }
  }

  render() {
    const {
      item: { redirectFlow },
      invalidFields
    } = this.state
    const { flows, flowsList, showQnAModal, categories, modalType } = this.props
    const currentFlow = flows ? flows.find(({ name }) => name === redirectFlow) || { nodes: [] } : { nodes: [] }
    const nodeList = currentFlow.nodes.map(({ name }) => ({ label: name, value: name }))
    const isEdit = modalType === 'edit'

    return (
      <Modal className={classnames(style.newQnaModal, 'newQnaModal')} show={showQnAModal} onHide={this.closeAndClear}>
        <form>
          <Modal.Header className={style.qnaModalHeader}>
            <Modal.Title>{!isEdit ? 'Create a new' : 'Edit'} Q&A</Modal.Title>
          </Modal.Header>

          <Modal.Body className={style.qnaModalBody}>
            {this.alertMessage()}
            {categories.length ? (
              <div className={style.qnaSection}>
                <span className={style.qnaSectionTitle}>Category</span>
                <Select
                  className={classnames(style.qnaCategorySelect, {
                    qnaCategoryError: invalidFields.category
                  })}
                  value={this.state.item.category}
                  options={categories}
                  onChange={this.handleSelect('category')}
                  placeholder="Search or choose category"
                />
              </div>
            ) : null}
            <div className={style.qnaSection}>
              <span className={style.qnaSectionTitle}>Questions</span>
              <span className={style.qnaQuestionsHint}>Type/Paste your questions here separated with a new line</span>

              <FormControl
                autoFocus={true}
                className={classnames(style.qnaQuestionsTextarea, {
                  qnaCategoryError: invalidFields.questions
                })}
                value={(this.state.item.questions || []).join('\n')}
                onChange={event => this.changeItemProperty('questions', event.target.value.split(/\n/))}
                componentClass="textarea"
              />
            </div>
            <div className={style.qnaSection}>
              <span className={style.qnaSectionTitle}>Answers</span>
              <div className={style.qnaAnswer}>
                <span className={style.qnaAnswerCheck}>
                  <input
                    id="reply"
                    type="checkbox"
                    checked={this.state.isText}
                    onChange={this.changeItemAction('isText')}
                    tabIndex="-1"
                  />
                  <label htmlFor="reply">&nbsp; Type your answer</label>
                </span>

                <ElementsList
                  placeholder="Type and press enter to add an answer"
                  invalid={this.state.invalidFields.answer}
                  elements={this.state.item.answers}
                  create={this.createAnswer}
                  update={this.updateAnswer}
                  delete={this.deleteAnswer}
                />
              </div>

              <div className={style.qnaAndOr}>
                <div className={style.qnaAndOrLine} />
                <div className={style.qnaAndOrText}>and / or</div>
                <div className={style.qnaAndOrLine} />
              </div>
              <div className={style.qnaRedirect}>
                <div className={style.qnaRedirectToFlow}>
                  <span className={style.qnaRedirectToFlowCheck}>
                    <input
                      id="redirect"
                      type="checkbox"
                      checked={this.state.isRedirect}
                      onChange={this.changeItemAction('isRedirect')}
                      className={style.qnaRedirectToFlowCheckCheckbox}
                      tabIndex="-1"
                    />
                    <label htmlFor="redirect">&nbsp;Redirect to flow</label>
                  </span>
                  <Select
                    className={classnames(style.qnaRedirectToFlowCheckSelect, {
                      qnaCategoryError: invalidFields.redirectFlow
                    })}
                    value={this.state.item.redirectFlow}
                    options={flowsList}
                    onChange={this.handleSelect('redirectFlow')}
                  />
                </div>
                <div className={style.qnaRedirectNode}>
                  <span className={style.qnaRedirectNodeTitle}>Node</span>
                  <Select
                    className={classnames(style.qnaRedirectNodeSelect, {
                      qnaCategoryError: invalidFields.redirectNode
                    })}
                    value={this.state.item.redirectNode}
                    options={nodeList}
                    onChange={this.handleSelect('redirectNode')}
                  />
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className={style.qnaModalFooter}>
            <Button onClick={this.closeAndClear}>Cancel</Button>
            <Button bsStyle="primary" type="button" onClick={this.handleSubmit}>
              {isEdit ? 'Edit' : 'Save'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    )
  }
}