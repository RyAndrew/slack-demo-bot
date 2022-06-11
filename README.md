# slack-demo-bot

This is a slack bot demo app that authenticates against Auth0 (slack-bot/app.js)

After authentication you can use the access token jwt to communicate with a REST API (demo-api/server.js). This is the "Demo API"

Oauth scopes are verified when calling the REST API via express middleware.

The "Demo API" further communicates with the Auth0 Management API to do full CRUD operations on the Applications / Clients in an Auth0 tenant

Authentication is handled by an [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628) Compliant OAuth 2.0 Device Authorization Grant Library

![Slack Bot Demo](https://user-images.githubusercontent.com/3945391/172761438-70c3b9da-2a9f-44b7-985b-5775ea03efab.jpg)

