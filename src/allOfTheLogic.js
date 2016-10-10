import http from 'http'

import { POST, PROCESS_ARGUMENTS } from '../utilities/Utilities'
import Utilities from '../utilities/Utilities'

let requests = {}
let routing = {}

function storeRequest(id, url, timestamp) {
  requests[id] = { url, timestamp }
}

function storeRouting(id, downloadIp, fileIp) {
  routing[id] = { downloadIp, fileIp }
}

function download(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      const result = {
        status: response.statusCode,
        'mime-type': response.headers['content-type'],
        content: '',
      }
      response.on('data', (chunk) => result.content += chunk)
      response.on('end', () => {
        result.content = new Buffer(result.content).toString('base64')
        resolve(result)
      })

    }).on('error', (error) => {
      reject(error)
    })
  })
}

function getPeers() {
  return new Promise((resolve, reject) => {
    http.get('http://192.168.3.11:1215/getpeers', (response) => {
      response.on('data', (data) => console.log(data))
      response.on('end'. () => {
        resolve('')
      })
    })
  })
}

export function handleGetRequest(request, response) {
  const params = Utilities.parseParamsFromUrl(request.url)
  const path = Utilities.parsePathFromUrl(request.url)

  // Allow only download get requests.
  if (path !== '/download') {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end()
  }

  // Store the request for umm stuff.
  storeRequest(params.id, decodeURIComponent(params.url), '')
  // Same for routing table.
  storeRouting(params.id, request.headers.host, '')

  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.write('Possibly getting requested info.')
  response.end()

  if (shouldDelegateRequest()) {
    // TODO send request to random neighbour
    // getRandomNeighbour()
  } else {
    download(decodeURIComponent(params.url))
      .then(res => {
        const downloadIp = routing[params.id].downloadIp.split(':')[0]
        const port = routing[params.id].downloadIp.split(':')[1]
        forwardRequest(params.id, downloadIp, port, res)
      })
      .catch(err => console.log(err))
  }
}

export function handlePostRequest(request, response) {
  const params = Utilities.parseParamsFromUrl(request.url)
  const path = Utilities.parsePathFromUrl(request.url)

  // Allow only /file get requests that have an id param.
  if (path !== '/file' || !('id' in params)) {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end()
  } else {
    console.log('/file')
    const downloadIp = routing[params.id].downloadIp.split(':')[0]
    const port = routing[params.id].downloadIp.split(':')[1]
    let content = ''
    request.on('data', (chunk) => content += chunk)
    forwardRequest(params.id, downloadIp, port, new Buffer(content).toString('base64'))
    // TODO: on this request I should forward the data to it's rightful heir.
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.write('I am post, the destroyer of worlds.')
    response.end()
  }
}

function forwardRequest(id, ip, port, data) {
  const options = {
    hostname: ip,
    port: port,
    path: `/file?id=${id}`,
    method: POST,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(JSON.stringify(data)),
    }
  }
  let request = http.request(options)
  request.write(JSON.stringify(data))
  request.end()
}

function shouldDelegateRequest() {
  return PROCESS_ARGUMENTS.lazyness ? Math.random() < PROCESS_ARGUMENTS.lazyness : false
}
