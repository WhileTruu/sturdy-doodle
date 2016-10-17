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
      console.log(peers)
    }).catch((err) => { throw err })
  }, 10000)
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
  const options = { hostname: '192.168.3.11', port: 1215, timeout: 10000, path: 'getpeers' }

  return new Promise((resolve, reject) => {
    http.get(options, (response) => {
      let jsonString = ''
      response.on('data', (chunk) => jsonString += chunk)
      response.on('end', () => {
        console.log(jsonString)
        resolve(JSON.parse(jsonString))
      })
    }).on('error', error => {
      console.log(error)
      reject(error)
    }).on('timeout', () => reject('TIMEOUt'))
  })
}

export function handleGetRequest(request, response) {
  const params = Utilities.parseParamsFromUrl(request.url)
  const path = Utilities.parsePathFromUrl(request.url)

  // Allow only download get requests.
  if (path !== '/download') {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end()
    return
  }

  // Store the request for umm stuff.
  storeRequest(params.id, Utilities.superDecodeURIComponent(params.url), '')
  // Same for routing table.
  storeRouting(params.id, request.connection.remoteAddress, '')

  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.write('Possibly getting requested info.')
  response.end()

  if (shouldDelegateRequest()) {
    // TODO send request to random neighbour
    const randomNeighbour = getRandomNeighbour()
    delegateRequest(randomNeighbour, PROCESS_ARGUMENTS.port, params.id, params.url)
  } else {
    download(Utilities.superDecodeURIComponent(params.url))
      .then(res => {
        const downloadIp = routing[params.id].downloadIp
        const port = PROCESS_ARGUMENTS.port
        storeRouting(params.id, request.connection.remoteAddress, request.headers.host)
        forwardRequest(params.id, downloadIp, port, res)
      })
      .catch(err => console.log(err))
  }
}

export function handlePostRequest(request, response) {
  const params = Utilities.parseParamsFromUrl(request.url)
  const path = Utilities.parsePathFromUrl(request.url)
  // Allow only /file get requests that have an id param.
  const downloadIp = routing[params.id].downloadIp
  const port = PROCESS_ARGUMENTS.port

  storeRouting(params.id, `${downloadIp}`, `${request.connection.remoteAddress}:${port}`)

  if (path !== '/file' || !('id' in params)) {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end()
  } else if (`${downloadIp}:${port}` == `localhost:${PROCESS_ARGUMENTS.port}` || `${downloadIp}:${port}` == `::ffff:127.0.0.1:${PROCESS_ARGUMENTS.port}`) {
    let content = ''
    request.on('data', (chunk) => content += chunk)
    request.on('end', () => {
      if (content.trim() != '') console.log(new Buffer(JSON.parse(content).content, 'base64').toString().substring(0, 100))
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end()
    })
  } else {
    let content = ''
    request.on('data', (chunk) => content += chunk)
    request.on('end', () => {
      forwardRequest(params.id, downloadIp, port, content)
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end()
    })
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
  request.on('error', err => console.log(err))
}

function shouldDelegateRequest() {
  return PROCESS_ARGUMENTS.lazyness ? Math.random() < PROCESS_ARGUMENTS.lazyness : false
}

function getRandomNeighbour() {
  const peerIps = Object.keys(peers).filter(peerIp => peers[peerIp] == 'alive')
  return peerIps[Math.floor(Math.random() * peerIps.length)]
}

function delegateRequest(ip, port, id, url) {
  console.log('DELEGATING', ip)
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
  request.on('error', err => console.log(err))
}

updatePeers()
