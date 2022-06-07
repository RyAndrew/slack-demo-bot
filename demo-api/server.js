"use strict";

const express = require('express')
const app = express()
const { auth, requiredScopes } = require('express-oauth2-jwt-bearer')
const cors = require('cors')
const ManagementClient = require('auth0').ManagementClient

require('dotenv').config()

const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENTID,
  clientSecret: process.env.AUTH0_CLIENTSECRET,
  scope: 'read:clients update:clients delete:clients create:clients',
})

if (!process.env.ISSUER_BASE_URL || !process.env.AUDIENCE) {
  throw 'Make sure you have ISSUER_BASE_URL, and AUDIENCE in your .env file'
}

const corsOptions =  {
  origin: 'http://localhost:'+process.env.PORT
}

app.use(cors(corsOptions))

const checkJwt = auth()

app.get('/api/v1/public', function(req, res) {
  res.json({
    message: 'Hello from a public endpoint! You don\'t need to be authenticated to see this.'
  })
})

app.get('/api/v1/private', checkJwt, function(req, res) {
  res.json({
    message: 'Hello from a private endpoint! You need to be authenticated to see this.'
  })
})

app.delete('/api/v1/demo/:clientId([A-Za-z0-9]{32})', checkJwt, requiredScopes('manage:demos'), async function(req, res) {

  console.log('delete clientId',req.params.clientId)
  let response = await auth0.deleteClient({ client_id: req.params.clientId })

  res.json(response)
})

app.get('/api/v1/demo', checkJwt, requiredScopes('read:demos'), async function(req, res) {

  let clients = await auth0.getClients()
  console.log('clients',clients)
  let output = []
  clients.forEach(function(val){
    //filter default apps
    if(['All Applications','Default App'].indexOf(val.name) >= 0){
      return
    }

    output.push({name:val.name,client_id:val.client_id})
  })
  res.json(output)
})

app.use(function(err, req, res, next){
  console.error(err.stack)
  return res.set(err.headers).status(err.status).json({ message: err.message })
})

app.listen(process.env.PORT)
console.log('Listening on http://localhost:'+process.env.PORT)
