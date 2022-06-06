const { Issuer } = require('openid-client')

class OauthDeviceAuthorization {

  constructor(auth0Config){
    this.auth0Config = auth0Config
  }
  
  async Authenticate(client, triggerId, resumeTask){
    const deviceCodeResponse = await this.RequestDeviceCode()
  
    this.RequestDeviceActivation(client, triggerId, deviceCodeResponse, resumeTask)
  
    return await this.RequestTokens(deviceCodeResponse)
  }
  async RequestDeviceCode(){

    console.time('Issuer.discover')
    const auth0 = await Issuer.discover(`https://${this.auth0Config.domain}`)
    console.timeEnd('Issuer.discover')
  
    const client = new auth0.Client({
        client_id: this.auth0Config.clientId,
        token_endpoint_auth_method: 'none',
        id_token_signed_response_alg: 'RS256',
    })
  
    console.time('deviceAuthorization')
    const handle = await client.deviceAuthorization({ scope: this.auth0Config.scope, audience: this.auth0Config.audience })
    console.timeEnd('deviceAuthorization')

    return handle
  }
  RequestDeviceActivation(client, triggerId, DeviceCodeResponse, resumeTask){
    const { verification_uri_complete, user_code, expires_in } = DeviceCodeResponse
  
    const qrImagePrefix = "https://chart.googleapis.com/chart?chs=300x300&cht=qr&choe=UTF-8&chl="
    let authDeviceCodeView = OauthDeviceAuthorization.authDeviceCodeView
    authDeviceCodeView.resumeTask = resumeTask
    authDeviceCodeView.blocks[3].image_url = qrImagePrefix + encodeURIComponent(verification_uri_complete)
    authDeviceCodeView.blocks[0].accessory.url = verification_uri_complete
    authDeviceCodeView.blocks[1].text.text = "Use Code "+user_code
  
    client.views.open({trigger_id: triggerId, view:authDeviceCodeView})
  }
  async RequestTokens(DeviceCodeResponse){
    let tokens
    try {
      tokens = await DeviceCodeResponse.poll()
    } catch (err) {
      switch (err.error) {
        case 'access_denied': // end-user declined the device confirmation prompt, consent or rules failed
          console.error('\n\ncancelled interaction')
          break
        case 'expired_token': // end-user did not complete the interaction in time
          console.error('\n\ndevice flow expired')
          break
        default:
          if (err instanceof OPError) {
            console.error(`\n\nerror = ${err.error}; error_description = ${err.error_description}`)
          } else {
            throw err
          }
      }
    }
  
    if (tokens) {
      return tokens
    }
  
    console.error('failed to get tokens')
  }
  
  static authDeviceCodeView = {
    "type": "modal",
    "callback_id": "auth-device-code-view",
    "title": {
      "type": "plain_text",
      "text": "Scan QR or Login"
    },
    "submit": {
      "type": "plain_text",
      "text": "I Logged In Successfully"
    },
    "blocks": [
      {
          "type": "section",
          "text": {
          "type": "mrkdwn",
          "text": "Click Here to Login"
          },
          "accessory": {
          "type": "button",
          "text": {
              "type": "plain_text",
              "text": "Login",
              "emoji": true
          },
          "value": "click_me_123",
          "url": "https://okta.com",
          "action_id": "button-action"
          }
      },
      {
          "type": "section",
          "text": {
          "type": "plain_text",
          "text": "Use Code ",
          "emoji": true
          }
      },
      {
          "type": "section",
          "text": {
          "type": "plain_text",
          "text": "Scan this code to Login",
          "emoji": true
          }
      },
      {
          "type": "image",
          "image_url": "https://qrurlhere",
          "alt_text": "QR Code"
      }
    ]
  }
}

module.exports = OauthDeviceAuthorization