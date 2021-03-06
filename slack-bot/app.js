"use strict";

const { App, LogLevel } = require('@slack/bolt')

//monorepo stuff
require('dotenv').config()
const SlackViews = require('./modules/SlackViews.js')
const OauthDeviceAuthorization = require('./modules/OauthDeviceAuthorization.js')
const DemoApiClient = require('./modules/DemoApiClient.js')

class SlackBot {

constructor(){
  this.OauthDeviceAuthorization = new OauthDeviceAuthorization({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENTID,
    audience: process.env.AUTH0_API_AUDIENCE,
    scope: 'openid email profile offline_access read:demos manage:demos'
  })
  this.OauthDeviceAuthorization.Initialize()
  
  this.DemoApiClient = new DemoApiClient(process.env.DEMO_API_URL)
  
  this.slack = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    //logLevel: LogLevel.DEBUG,
    socketMode: true,
    auth0ClientId: process.env.AUTH0_CLIENTID
  })
  
  this.userDataStorage = {}

  this.setupListeners()
  this.slack.start(process.env.PORT || 3000)
  console.log('⚡️ Bolt app is running!')
}

async userRead(userId){
  if(!this.userDataStorage.hasOwnProperty(userId)){
    this.userDataStorage[userId] = {
      userId: userId,
      resumeTask: null,
      authenticated: false,
      slackProfile: await this.readSlackUserProfile(userId)
    }
  }

  return this.userDataStorage[userId]
}

userUpdate(user){
  this.userDataStorage[user.userId] = user
}

async authenticate(client, userId, triggerId, resumeTask){
  let user = await this.userRead(userId)
  
  if(!user.authenticated){
    await this.sendDm(userId, 'Not Authenticated, Please wait for Authentication')

    //adds auth data to user
    console.time('Authenticate')
    user.tokens = await this.OauthDeviceAuthorization.Authenticate(client, triggerId, resumeTask)
    console.timeEnd('Authenticate')

    user.authenticated = true
    user.tokenClaims = user.tokens.claims()

    //persist user
    this.userUpdate(user)

    //if not authenticated dont proceed, will resume desired action after auth
    return null
  }
  return user
}
async demoList(client, userId, triggerId){
  await this.sendDm(userId, 'List Demo Apps / Clients')

  const user = await this.authenticate(client, userId, triggerId, 'demoList')
  if(user === null){ return }

  this.DemoApiClient.setAccessToken(user.tokens.access_token)
  let clients = await this.DemoApiClient.readAllClients()

  let slackBlocks = [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": ":mag: List of your *Demo Apps*"
      }
    },
    {
      "type": "divider"
    }
  ]

let editAccessory = {
  "type": "static_select",
  "action_id": "manage-app",
  "placeholder": {
    "type": "plain_text",
    "emoji": true,
    "text": "Manage"
  },
  "options": [
    {
      "text": {
        "type": "plain_text",
        "emoji": true,
        "text": "✏️ Edit App"
      },
      "value": "update-app"
    },
    {
      "text": {
        "type": "plain_text",
        "emoji": true,
        "text": "❌ Delete App"
      },
      "value": "delete-app"
    },
    {
      "text": {
        "type": "plain_text",
        "emoji": true,
        "text": "🗝️ Rotate Secret"
      },
      "value": "rotate-secret"
    }
  ]
}

  clients.forEach(function(client){

    slackBlocks.push(
      {
        "type": "section",
        "block_id": client.client_id,
        "text": {
          "type": "mrkdwn",
          "text": `*${client.name}*\n${client.description}`
        },
        "accessory": editAccessory
      }
    )

  })

  //console.log(JSON.stringify(slackBlocks,null,4))

  this.sendBlocks(user.userId, 'List of Apps', slackBlocks)
}
async demoUpdateShowModal(client, userId, triggerId, clientId){
  await this.sendDm(userId, 'Update Demo '+clientId)

  const user = await this.authenticate(client, userId, triggerId)
  if(user === null){ return }

  this.DemoApiClient.setAccessToken(user.tokens.access_token)
  let app = await this.DemoApiClient.read(clientId)

  let view = Object.assign({},SlackViews.updateAppView)
  view.private_metadata = JSON.stringify({clientId:clientId})
  view.blocks[0].element.initial_value = app.name
  view.blocks[1].element.initial_value = app.description

  client.views.open({trigger_id: triggerId, view:view})
}
async demoUpdate(client, userId, triggerId, clientId, app){

  const user = await this.authenticate(client, userId, triggerId)
  if(user === null){ return }

  this.DemoApiClient.setAccessToken(user.tokens.access_token)
  let response = await this.DemoApiClient.update(clientId, app)
}

async demoCreateShowModal(client, userId, triggerId){
  await this.sendDm(userId, 'Creating Demo')

  const user = await this.authenticate(client, userId, triggerId, 'demoCreateShowModal')
  if(user === null){ return }

  client.views.open({trigger_id: triggerId, view:SlackViews.createAppView})
}

async demoCreate(client, userId, triggerId, appName){
  const user = await this.authenticate(client, userId, triggerId, 'demoCreateShowModal')
  if(user === null){ return }

  this.DemoApiClient.setAccessToken(user.tokens.access_token)
  let response = await this.DemoApiClient.create({
    name:appName
  })

  await this.sendDm(userId, 'Created Successfully!')
}

async demoDelete(client, userId, triggerId, client_id){
  await this.sendDm(userId, 'Deleting Demo client_id '+client_id)

  const user = await this.authenticate(client, userId, triggerId)
  if(user === null){ return }

  this.DemoApiClient.setAccessToken(user.tokens.access_token)
  this.DemoApiClient.delete(client_id)

  this.demoList(client, userId, triggerId)
}

async demoRotateSecret(client, userId, triggerId, client_id){
  await this.sendDm(userId, 'Rotating Secret for client_id '+client_id)

  const user = await this.authenticate(client, userId, triggerId)
  if(user === null){ return }

  this.DemoApiClient.setAccessToken(user.tokens.access_token)
  this.DemoApiClient.rotateSecret(client_id)

  await this.sendDm(userId, 'Rotating Secret Complete')
}

async sendDm(userId, text){
  return await this.slack.client.chat.postMessage({
    channel: userId,
    text: text
  })
}
async sendBlocks(userId, text, blocks){
  return await this.slack.client.chat.postMessage({
    channel: userId,
    text:text,
    blocks: blocks
  })
}

async sendAuthStateDm(userId){

  const user = await this.userRead(userId)

  let authenticatedUserNote = 'Not Authenticated'
  if(user.authenticated){
    authenticatedUserNote = `User: ${user.tokenClaims.nickname} / ${user.tokenClaims.email}`
  }
  this.sendDm(userId, `DemoApi ${authenticatedUserNote}\nSlack User: ${user.slackProfile.profile.first_name} / ${user.slackProfile.profile.email}`)
}

async readSlackUserProfile(userId){
  console.time('this.slack.client.users.info')
  const result = await this.slack.client.users.info({
    user: userId
  })
  console.timeEnd('this.slack.client.users.info')
  if(result.ok !== true){
      throw 'Error looking up user id '+userId
  }
  return result.user
}

resumeTask(task, body, client){
  switch(task){
    case 'demoList':
      this.demoList(client, body.user.id, body.trigger_id)
      break
    case 'demoCreateShowModal':
      this.demoCreateShowModal(client, body.user.id, body.trigger_id)
  }
}

setupListeners(){
  this.slack.view( 'tenant-info', async ({payload, ack, client}) => {
    await ack()
    console.log('tenant-info view_submission',payload)
  })

  this.slack.view( 'update-app-modal', async ({body, ack, client}) => {
    console.log('view update-app-modalview_submission', )
    await ack()

    let updates = {
      name: body.view.state.values.name.name.value,
      description: body.view.state.values.description.description.value
    }

    const private_metadata = JSON.parse(body.view.private_metadata)
    
    this.demoUpdate(client, body.user.id, body.trigger_id, private_metadata.clientId, updates)
  })

  this.slack.view( 'create-app', async ({body, ack, client}) => {
    console.log('view create-app view_submission')
    await ack()
    this.demoCreate(client, body.user.id, body.trigger_id, body.view.state.values['create-app-name']['create-app-name'].value)
  })

  //main device auth page submit
  this.slack.view( 'auth-device-code-view', async ({body, ack, client}) => {
    console.log('view auth-device-code-view view_submission')
    await ack()
    
    this.sendAuthStateDm(body.user.id)

    //check if there is a task to resume for after authentication
    if(body.view && body.view.private_metadata){
        let private_metadata = JSON.parse(body.view.private_metadata)
        if(private_metadata.resumeTask){
          this.resumeTask(private_metadata.resumeTask, body, client)
        }
    }
  })
  
  this.slack.action( 'manage-app', async ({body, ack, client}) => {
    console.log('action manage-app')
    await ack()
    switch(body.actions[0].selected_option.value){
      case 'update-app':
        this.demoUpdateShowModal(client, body.user.id, body.trigger_id, body.actions[0].block_id)
        break
      case 'rotate-secret':
        this.demoRotateSecret(client, body.user.id, body.trigger_id, body.actions[0].block_id)
        break
      case 'delete-app':
        this.demoDelete(client, body.user.id, body.trigger_id, body.actions[0].block_id)
        break
    }
  })
  
  this.slack.action( 'home-create-demo', async ({body, ack, client}) => {
    console.log('action home-create-demo')
    await ack()
    this.demoCreateShowModal(client, body.user.id, body.trigger_id)
  })
  this.slack.action( 'list-delete-app', async ({body, ack, client}) => {
    console.log('action list-delete-app body',body)
    await ack()
    this.demoDelete(client, body.user.id, body.trigger_id, body.actions[0].value)
    
  })
  this.slack.action( 'home-list', async ({body, ack, client}) => {
    console.log('action home-list')
    await ack()
    this.demoList(client, body.user.id, body.trigger_id)
  })
  this.slack.action( 'home-show-auth', async ({body, ack}) => {
    console.log('action home-show-auth')
    await ack()
    this.sendAuthStateDm(body.user.id)
  })
  this.slack.action( 'home-login', async ({body, ack, client}) => {
    console.log('action home-login')
    await ack()
    this.authenticate(client, body.user.id, body.trigger_id)
  })
  
  
  this.slack.shortcut( 'shortcut_show_auth', async ({body, ack, client}) => {
    await ack()
    console.log('shortcut_show_auth')
    this.sendAuthStateDm(body.user.id)
  })
  
  this.slack.shortcut( 'shortcut_demo_create', async ({body, ack, client}) => {
    await ack()
    console.log('shortcut_demo_create')
  
    this.demoCreateShowModal(client, body.user.id, body.trigger_id)
  })
  
  this.slack.shortcut( 'shortcut_demo_list', async ({body, ack, client}) => {
    await ack()
    console.log('shortcut_demo_list')
    this.demoList(client, body.user.id, body.trigger_id)
  })
  this.slack.shortcut( 'shortcut_demo_login', async ({body, ack, client}) => {
    await ack()
    console.log('shortcut_demo_login')
    this.authenticate(client, body.user.id, body.trigger_id)
  })
  
  
  this.slack.command('/demos', async ({body, ack, client, say}) => {
    console.log('demos cmd')
  
    await ack()
      
    switch(body.text){
      default:
        await say('valid prompts are: showauth, login, create, list')
        break
      case 'showauth':
        this.sendAuthStateDm(body.user_id)
        break
      case 'login':
        this.authenticate(client, body.user_id, body.trigger_id)
        break
      case 'create':
        this.demoCreateShowModal(client, body.user_id, body.trigger_id)
        break
      case 'list':
        this.demoList(client, body.user_id, body.trigger_id)
        break
      case 'settenant':
        client.views.open({trigger_id: body.trigger_id, view:tenantInputView})
        break
    }
  
  })
  
  // Reverse all messages the app can hear
  this.slack.message(async ({ body, payload, say }) => {
      console.log('received message! sending back in reverse')
      
      if(payload.type==='message'){
        const reversedText = [...payload.text].reverse().join("")
        await say(reversedText)
      }
  
  })
  
  this.slack.event('app_home_opened', async ({ payload, view, event, client, context }) => {
  
   console.log('app_home_opened')
  
   if(payload.tab !== 'home'){
     console.log('not home - doing nothing!')
     return
   }
  
    try {
      let homeTabView = SlackViews.homeTabView
      homeTabView.user_id = event.user
      const result = await client.views.publish(homeTabView)
    }
    catch (error) {
      console.error(error)
    }
  })
}

}

new SlackBot()