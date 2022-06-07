const axios = require('axios')

class DemoApiClient {

  constructor(baseUrl){
    this.baseUrl = baseUrl
  }
  setAccessToken(access_token){
    this.access_token = access_token
  }
  
  async delete(clientId){

    const response = this.apiCall({
      method: 'delete',
      url: this.baseUrl+'/api/v1/demo/'+clientId
    })
    return response;
  }
  async readAllClients(){

    const response = this.apiCall({
      method: 'get',
      url: this.baseUrl+'/api/v1/demo'
    })
    return response;
  }
  async apiCall(request){

    request.headers = {'Authorization': 'Bearer '+this.access_token}
  
    const response = await axios(request)
    console.log('api response',response.data)
  
    return await response.data
  }
}

module.exports = DemoApiClient;