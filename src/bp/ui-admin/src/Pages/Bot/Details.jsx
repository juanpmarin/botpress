import React, { Component } from 'react'

import { MdInfoOutline } from 'react-icons/lib/md'
import { connect } from 'react-redux'

import { BotEditSchema } from 'common/validation'
import Joi from 'joi'
import Select from 'react-select'
import { Row, Col, Button, FormGroup, Label, Input, Form, UncontrolledTooltip, Alert } from 'reactstrap'
import Avatar from 'react-avatar'
import Switch from 'react-switch'

import _ from 'lodash'

import { fetchBots, fetchBotCategories } from '../../reducers/bots'

import SectionLayout from '../Layouts/Section'

import api from '../../api'

const statusList = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Disabled', value: 'disabled' }
]

class Bots extends Component {
  state = {
    id: '',
    name: '',
    avatarUrl: '',
    welcomeMessage: '',
    showGetStarted: false,
    category: undefined,
    description: '',
    website: '',
    phoneNumber: '',
    termsConditions: '',
    emailAddress: '',
    error: undefined,
    categories: []
  }

  componentDidMount() {
    if (!this.props.botCategoriesFetched) {
      this.props.fetchBotCategories()
    }

    this.props.fetchBots()
    this.prepareCategories()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.bots !== this.props.bots) {
      this.loadBot()
    }
    if (prevProps.botCategories !== this.props.botCategories) {
      this.prepareCategories()
    }
  }

  prepareCategories = () => {
    if (this.props.botCategories) {
      this.setState({ categories: this.props.botCategories.map(cat => ({ label: cat, value: cat })) })
    }
  }

  loadBot() {
    const botId = this.props.match.params.botId
    const bot = this.props.bots.find(bot => bot.id === botId)
    const status = bot.disabled ? 'disabled' : bot.private ? 'private' : 'public'
    const details = _.get(bot, 'details', {})

    this.setState({
      botId,
      name: bot.name,
      description: bot.description,
      showGetStarted: bot.showGetStarted,
      website: details.website,
      phoneNumber: details.phoneNumber,
      termsConditions: details.termsConditions,
      emailAddress: details.emailAddress,
      avatarUrl: details.avatarUrl,
      welcomeMessage: details.welcomeMessage,
      status: statusList.find(x => x.value === status),
      category: this.state.categories.find(x => x.value === bot.category)
    })
  }

  saveChanges = async () => {
    this.setState({ error: undefined })

    const bot = {
      name: this.state.name,
      description: this.state.description,
      showGetStarted: this.state.showGetStarted,
      category: this.state.category && this.state.category.value,
      details: {
        avatarUrl: this.state.avatarUrl,
        welcomeMessage: this.state.welcomeMessage,
        website: this.state.website,
        phoneNumber: this.state.phoneNumber,
        termsConditions: this.state.termsConditions,
        emailAddress: this.state.emailAddress
      }
    }

    const status = this.state.status && this.state.status.value
    if (status === 'disabled') {
      bot.disabled = true
    } else {
      bot.disabled = false
      bot.private = status === 'private'
    }

    const { error } = Joi.validate(bot, BotEditSchema)
    if (error) {
      this.setState({ error: error })
      return
    }

    await api
      .getSecured()
      .put(`/admin/bots/${this.state.botId}`, bot)
      .catch(err => this.setState({ errorMessage: err }))

    await this.props.fetchBots()

    this.setState({ successMsg: `Bot configuration updated successfully` })

    window.setTimeout(() => {
      this.setState({ successMsg: undefined })
    }, 2000)
  }

  renderHelp(text, id) {
    return (
      <span>
        <MdInfoOutline id={`help${id}`} className="section-title-help" />
        <UncontrolledTooltip placement="right" target={`help${id}`}>
          {text}
        </UncontrolledTooltip>
      </span>
    )
  }

  handleInputChanged = event => this.setState({ [event.target.name]: event.target.value })
  handleChangedLanguage = status => this.setState({ status })
  handleCategoryChanged = category => this.setState({ category })

  handleFileChange = event => {
    const data = new FormData()
    data.append('file', event.target.files[0])

    this.setState({ error: null, uploading: true }, async () => {
      await api
        .getSecured()
        .post(`/bots/${this.state.botId}/media`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(response => {
          const { url } = response.data
          this.setState({ avatarUrl: window.location.origin + url })
        })
        .catch(e => {
          this.setState({ error: e.message })
        })
        .then(() => {
          this.setState({ uploading: false })
        })
    })
  }

  handleGetStartedSwitch = event => {
    this.setState({ showGetStarted: !this.state.showGetStarted })
  }

  renderDetails() {
    return (
      <div>
        {this.state.error && <Alert color="danger">{this.state.error.message}</Alert>}
        {this.state.successMsg && <Alert type="success">{this.state.successMsg}</Alert>}
        <Form>
          <Row form>
            <Col md={5}>
              <FormGroup>
                <Label for="name">
                  <strong>Name</strong>
                </Label>
                <Input type="text" name="name" value={this.state.name} onChange={this.handleInputChanged} />
              </FormGroup>
            </Col>
            <Col md={4}>
              {this.state.categories.length > 0 && (
                <FormGroup>
                  <Label>
                    <strong>Category</strong>
                  </Label>
                  <Select
                    options={this.state.categories}
                    value={this.state.category}
                    onChange={this.handleCategoryChanged}
                  />
                </FormGroup>
              )}
            </Col>
            <Col md={3}>
              <FormGroup>
                <Label for="status">
                  <strong>Status</strong>
                  {this.renderHelp(
                    `Public bots can be accessed by anyone, while private are only accessible by authenticated users`
                  )}
                </Label>
                <Select
                  options={statusList}
                  value={this.state.status}
                  onChange={this.handleChangedLanguage}
                  isSearchable={false}
                />
              </FormGroup>
            </Col>
          </Row>
          <FormGroup>
            <Label for="description">
              <strong>Description</strong>
            </Label>
            <Input
              type="textarea"
              name="description"
              value={this.state.description}
              onChange={this.handleInputChanged}
            />
          </FormGroup>

          <Row form>
            <Col md={7}>
              <FormGroup>
                <Label for="website">
                  <strong>Website</strong>
                </Label>
                <Input type="text" name="website" value={this.state.website} onChange={this.handleInputChanged} />
              </FormGroup>
            </Col>
            <Col md={1} />
            <Col md={4}>
              <FormGroup>
                <Label for="phoneNumber">
                  <strong>Phone Number</strong>
                </Label>
                <Input
                  type="text"
                  name="phoneNumber"
                  value={this.state.phoneNumber}
                  onChange={this.handleInputChanged}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row form>
            <Col md={7}>
              <FormGroup>
                <Label for="termsConditions">
                  <strong>Link to Terms & Conditions</strong>
                </Label>
                <Input
                  type="text"
                  name="termsConditions"
                  value={this.state.termsConditions}
                  onChange={this.handleInputChanged}
                />
              </FormGroup>
            </Col>
            <Col md={1} />
            <Col md={4}>
              <FormGroup>
                <Label for="emailAddress">
                  <strong>Contact E-mail</strong>
                </Label>
                <Input
                  type="text"
                  name="emailAddress"
                  value={this.state.emailAddress}
                  onChange={this.handleInputChanged}
                />
              </FormGroup>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Label>
                <strong>Show Get Started Page</strong>
              </Label>
              <br />
              <Switch onChange={this.handleGetStartedSwitch} checked={this.state.showGetStarted} />
            </Col>
            <Col md={6}>
              <Label>
                <strong>Cover Picture</strong>
              </Label>
              <Input type="file" name="coverPicture" />
            </Col>
            <Col md={6}>
              <Label>
                <strong>Bot Avatar</strong>
              </Label>
              <Input type="file" name="botAvatar" onChange={this.handleFileChange} />
              <Avatar name={this.state.name} src={this.state.avatarUrl} />
            </Col>
            <Col md={12}>
              <Label>
                <strong>Welcome Message</strong>
              </Label>
              <Input
                type="textarea"
                name="welcomeMessage"
                placeholder="Enter a welcome message for the users that join your bot. Explain what the bot is all about."
                value={this.state.welcomeMessage}
                onChange={this.handleInputChanged}
              />
            </Col>
          </Row>

          <Button color="primary" onClick={this.saveChanges}>
            Save
          </Button>
        </Form>
      </div>
    )
  }

  render() {
    return (
      <SectionLayout
        title={this.state.name}
        helpText="This page lists all the bots created under the default workspace."
        activePage="bots"
        currentTeam={this.props.team}
        mainContent={this.renderDetails()}
        sideMenu={null}
      />
    )
  }
}

const mapStateToProps = state => ({
  bots: state.bots.bots,
  botCategories: state.bots.botCategories,
  botCategoriesFetched: state.bots.botCategoriesFetched
})

const mapDispatchToProps = {
  fetchBots,
  fetchBotCategories
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Bots)
