import http from 'http'

import { GET, POST, PROCESS_ARGUMENTS } from './utilities'
import Utilities from './utilities'

let requests = {}
let routing = {}
let peers = {}

function storeRequest(id, url) {
  requests[id] = { url, timestamp: new Date().valueOf() }
  Utilities.writeLog(`REQUEST\tid: ${id} \turl: ${url}`)
}

function storeRouting(id, downloadIp, fileIp) {
  Utilities.writeLog(`ROUTING\tid: ${id} \tdownloadIp: ${downloadIp} \tfileIp: ${fileIp}`)
  routing[id] = { downloadIp, fileIp }
}

function updatePeers() {
  setTimeout(() => {
    getPeers().then((result) => {
      for (let key in peers) {
        if (result.indexOf(key) < 0) peers[key] = 'dead'
      }
      for (let i = 0; i < result.length; i++) {
        peers[result[i]] = 'alive'
      }
      updatePeers()
    }).catch((err) => { throw err })
  }, 30000)
}

function download(url) {
  console.log('DOWNLOADING')
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

export function getPeers() {
  const options = { hostname: '192.168.3.11', port: 1215, timeout: 5000, path: 'getpeers' }

  return new Promise((resolve, reject) => {
    http.get(options, (response) => {
      let jsonString = ''
      response.on('data', (chunk) => jsonString += chunk)
      response.on('end', () => resolve(JSON.parse(jsonString)))
    }).on('error', error => {
      reject(error)
      // TODO: REMOVE SHOULD DELEGATE. Is only here for testing.
    }).on('timeout', () => resolve(['localhost:1220']))
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
  storeRequest(params.id, Utilities.superDecodeURIComponent(params.url), '')
  // Same for routing table.
  storeRouting(params.id, request.headers.host, '')
  console.log(request.headers.host)

  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.write('Possibly getting requested info.')
  response.end()

  if (shouldDelegateRequest() && PROCESS_ARGUMENTS.port != 1220) {
    // TODO send request to random neighbour
    delegateRequest('localhost', 1220, params.id, params.url)
  } else {
    download(Utilities.superDecodeURIComponent(params.url))
      .then(res => {
        const downloadIp = routing[params.id].downloadIp.split(':')[0]
        const port = routing[params.id].downloadIp.split(':')[1]
        console.log(downloadIp, port)
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
  // case when I requested the crap
  } else if (request.headers.host == `localhost:${PROCESS_ARGUMENTS.port}`) {
    let content = ''
    request.on('data', (chunk) => content += chunk)
    request.on('end', () => console.log(new Buffer(JSON.parse(content).content, 'base64').toString()))
  // if I didn't request it, soemone else did!
  } else {
    const downloadIp = routing[params.id].downloadIp.split(':')[0]
    const port = routing[params.id].downloadIp.split(':')[1]
    storeRouting(params.id, downloadIp, request.headers.host)
    let content = ''
    request.on('data', (chunk) => content += chunk)
    request.on('end', () => forwardRequest(params.id, downloadIp, port, content))
    forwardRequest(params.id, downloadIp, port, new Buffer(content).toString('base64'))
    // TODO: on this request I should forward the data to it's rightful heir.
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.write('I am post, the destroyer of worlds.')
    response.end()
  }
}

function forwardRequest(id, ip, port, data) {
  console.log('FORWARDING')
  // onsole.log(ip, port, id)
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

function getRandomNeighbour() {
  return peers[0]
}

function delegateRequest(ip, port, id, url) {
  console.log('DELEGATING')
  const options = {
    hostname: ip,
    port: port,
    path: `/download?id=${id}&url=${url}`,
    method: GET,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  }
  let request = http.request(options)
  request.end()
}

updatePeers()
