import http from 'http'

import { GET, POST, PROCESS_ARGUMENTS } from './utilities'
import { handleGetRequest, handlePostRequest } from './allOfTheLogic'

const server = http.createServer((request, response) => {
  switch (request.method) {
    case GET:
      console.log('GET REQUEST CAME IN')
      handleGetRequest(request, response)
      break
    case POST:
      console.log('POST REQUEST CAME IN')
      handlePostRequest(request, response)
      break
    default:
      response.writeHead(405, { 'Content-Type': 'text/plain' })
      response.end()
  }
})

server.listen(PROCESS_ARGUMENTS.port, 'localhost')
