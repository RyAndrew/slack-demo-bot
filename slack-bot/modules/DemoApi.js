const axios = require('axios')

class DemoApi {

  setAccessToken(access_token){
    this.access_token = access_token
  }
  
  async readAllClients(request){

    const response = this.apiCall({
      method: 'get',
      url: 'http://localhost:3000/api/v1/demo'
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

module.exports = DemoApi;