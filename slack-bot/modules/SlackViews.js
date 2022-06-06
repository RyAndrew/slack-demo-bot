class SlackViews {

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

  static tenantInputView = {
    "type": "modal",
    "callback_id": "tenant-info",
    "title": {
        "type": "plain_text",
        "text": "Enter Your Tenant Info"
    },
    "submit": {
        "type": "plain_text",
        "text": "Submit"
    },
    "blocks": [
        {
            "type": "input",
            "element": {
                "type": "plain_text_input",
                "action_id": "tenantUrl"
            },
            "label": {
                "type": "plain_text",
                "text": "Tenant URL"
            }
        },
        {
            "type": "input",
            "element": {
                "type": "plain_text_input",
                "action_id": "clientId"
            },
            "label": {
                "type": "plain_text",
                "text": "Client ID"
            }
        },
        {
            "type": "input",
            "element": {
                "type": "plain_text_input",
                "action_id": "clientSecret"
            },
            "label": {
                "type": "plain_text",
                "text": "Client Secret"
            }
        }
    ]
}

static homeTabView = {
  user_id: 'userIdHere',
  view: {
      type: 'home',
      external_id: 'home-view',
      callback_id: 'home-view',
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Manage All Your Demp Apps via Slack* :squirrel:"
          }
        },
        {
          "type": "divider"
        },
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "Connect to Auth0 to begin provisioning"
          }
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "action_id": "home-login",
              "style":"danger",
              "text": {
                "type": "plain_text",
                "text": "Login"
              }
            },
            {
              "type": "button",
              "action_id": "home-show-auth",
              "style":"danger",
              "text": {
                "type": "plain_text",
                "text": "Show Auth"
              }
            },
            {
              "type": "button",
              "action_id": "home-list",
              "style":"danger",
              "text": {
                "type": "plain_text",
                "text": "List Demos"
              }
            },
            {
              "type": "button",
              "action_id": "home-create-demo",
              "style":"danger",
              "text": {
                "type": "plain_text",
                "text": "Create Demo"
              }
            }
          ]
        }
      ]
    }
  }
}

module.exports = SlackViews;