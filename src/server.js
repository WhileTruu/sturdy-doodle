import http from 'http'

import { GET, POST, PROCESS_ARGUMENTS } from './utilities/Utilities'
import { handleGetRequest, handlePostRequest, getPeers } from './allOfTheLogic'

getPeers().then(rain => console.log(rain))

const server = http.createServer((request, response) => {
  switch (request.method) {
    case GET:
      handleGetRequest(request, response)
      break
    case POST:
      handlePostRequest(request, response)
      break
    default:
      response.writeHead(405, { 'Content-Type': 'text/plain' })
      response.end()
  }
})

server.listen(PROCESS_ARGUMENTS.port)
