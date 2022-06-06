"use strict";

const { App, LogLevel } = require('@slack/bolt')

//monorepo stuff
require('dotenv').config()
const SlackViews = require('./modules/SlackViews.js')
const ODA = require('./modules/OauthDeviceAuthorization.js')
const DemoApiClient = require('./modules/DemoApiClient.js')

const auth0Config = {
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENTID,
  audience: process.env.AUTH0_API_AUDIENCE,
  scope: 'openid email profile offline_access read:demos manage:demos'
}
const OauthDeviceAuthorization = new ODA(auth0Config)

const demoApi = new DemoApiClient()

const slack = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  //logLevel: LogLevel.DEBUG,
  socketMode: true,
  auth0ClientId: process.env.AUTH0_CLIENTID
})

let userDataStorage = {}

async function userRead(userId){
  if(!userDataStorage.hasOwnProperty(userId)){
    userDataStorage[userId] = {
      userId: userId,
      resumeTask: null,
      authenticated: false,
      slackProfile: await readSlackUserProfile(userId)
    }
  }

  return userDataStorage[userId]
}

function userUpdate(user){
  userDataStorage[user.userId] = user
}

async function list(user){
  demoApi.setAccessToken(user.tokens.access_token)
  let clients = await demoApi.readAllClients()
  console.log('list: ',clients)

  sendDm(user.userId, 'list:\n'+JSON.stringify(clients,null,4))
}

async function authenticate(client, userId, triggerId, resumeTask){
  let user = await userRead(userId)
  console.log(user)
  if(!user.authenticated){

    //adds auth data to user
    console.time('Authenticate')
    user.tokens = await OauthDeviceAuthorization.Authenticate(client, triggerId, resumeTask)
    console.timeEnd('Authenticate')

    user.authenticated = true
    user.tokenClaims = user.tokens.claims()

    //persist user
    userUpdate(user)

    //if not authenticated dont proceed, will resume desired action after auth
    return null
  }
  return user
}
async function demoList(client, userId, triggerId){
  await sendDm(userId, 'List Demo Apps / Clients')

  const user = await authenticate(client, userId, triggerId)
  if(user === null){ return; }

  list(user)
}
async function demoCreate(client, userId, triggerId){
  await sendDm(userId, 'Lets Create a Demo')

  const user = await authenticate(client, userId, triggerId)
  if(user === null){ return; }

  list(user)
}

async function sendDm(userId, text){
  const result = await slack.client.chat.postMessage({
    channel: userId,
    text: text
  })
  return result
}

async function showAuth(userId){

  const user = await userRead(userId)

  let authenticatedUserNote = 'Not Authenticated'
  if(user.authenticated){
    authenticatedUserNote = `Authenticated as ${user.tokenClaims.nickname} ${user.tokenClaims.email}`
  }
  sendDm(userId, `DemoApi - ${authenticatedUserNote}\nSlack User ${user.slackProfile.profile.first_name} - ${user.slackProfile.profile.email}`)
}

slack.view( 'tenant-info', async ({payload, ack, client}) => {
  await ack()
    console.log('tenant-info view_submission',payload)
})

//main device auth page submit
slack.view( 'auth-device-code-view', async ({body, ack, client}) => {
  console.log('view auth-device-code-view view_submission body',body)
  await ack()
  //TODO add resumeTask handling here
  showAuth(body.user.id)
})

slack.action( 'home-create-demo', async ({body, ack, client}) => {
  console.log('action home-create-demo')
  await ack()
  demoCreate(client, body.user.id, body.trigger_id)
})
slack.action( 'home-list', async ({body, ack, client}) => {
  console.log('action home-create-demo')
  await ack()
  demoList(client, body.user.id, body.trigger_id)
})
slack.action( 'home-show-auth', async ({body, ack}) => {
  console.log('action home-show-auth')
  await ack()
  showAuth(body.user.id)
})
slack.action( 'home-login', async ({body, ack, client}) => {
  console.log('action home-create-demo')
  await ack()
  authenticate(client, body.user.id, body.trigger_id)
})


slack.shortcut( 'shortcut_show_auth', async ({body, ack, client}) => {
  await ack()
  console.log('shortcut_show_auth')
  showAuth(body.user.id)
})

slack.shortcut( 'shortcut_demo_create', async ({body, ack, client}) => {
  await ack()
  console.log('shortcut_demo_create')

  demoCreate(client, body.user.id, body.trigger_id)
})

slack.shortcut( 'shortcut_demo_list', async ({body, ack, client}) => {
  await ack()
  console.log('shortcut_demo_list')
  demoList(client, body.user.id, body.trigger_id)
})
slack.shortcut( 'shortcut_demo_login', async ({body, ack, client}) => {
  await ack()
  console.log('shortcut_demo_login')
  authenticate(client, body.user.id, body.trigger_id)
})


slack.command('/demos', async ({body, ack, client, say}) => {

  await ack()

  console.log('demos cmd')
  //console.log('body',body)
  //console.log('client',client)
  switch(body.text){
    default:
      await say('valid prompts are: showauth, login, create, read, list, update, delete')
      break
    case 'create':
      console.log('demos create!')
      demoCreate(client, body.user_id, body.trigger_id)
      break
    case 'read':
      break
    case 'showauth':
      showAuth(body.user_id)
      break
    case 'login':
      authenticate(client, body.user_id, body.trigger_id)
      break
    case 'list':
      demoList(client, body.user_id, body.trigger_id)
      break
    case 'delete':
      break
    case 'settenant':
      client.views.open({trigger_id: body.trigger_id, view:tenantInputView})
      break;
  }

})

// Reverse all messages the app can hear
slack.message(async ({ body, payload, say }) => {
    console.log('received message! sending back in reverse')
    
    if(payload.type==='message'){
      const reversedText = [...payload.text].reverse().join("")
      await say(reversedText)
    }

})

slack.event('app_home_opened', async ({ payload, view, event, client, context }) => {

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

async function readSlackUserProfile(userId){
  console.time('slack.client.users.info')
  const result = await slack.client.users.info({
    user: userId
  })
  console.timeEnd('slack.client.users.info')
  if(result.ok !== true){
      console.error('Error looking up user id '+userId)
      return
  }
  return result.user
}






(async () => {
  // Start the app
  await slack.start(process.env.PORT || 3000)

  console.log('⚡️ Bolt app is running!')
})()