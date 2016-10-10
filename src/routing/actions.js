import http from 'http'
import { POST } from '../utilities/Utilities'

// TODO: make getting a random neighbour possible
function getRandomNeighbour() {
  return
}

function updateNeighbourList() {
  let postData = JSON.stringify({
    'message': 'Hello World!',
  })
  const options = {
    hostname: '192.168.3.11',
    port: 1215,
    path: 'getpeers',
    method: POST,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    }
  }
  let request = http.request(options, (response) => {
    console.log(`Status: ${response.statusCode}`)
    console.log(`Headers: ${JSON.stringify(response.headers)}`)
    response.setEncoding('utf8')
    response.on('data', (chunk) => {
      console.log(`Body: ${chunk}`)
    })
    response.on('end', () => {
      console.log('No more data in response.')
    })
    response.on('Error: ', (error) => {
      console.log(`Problem with request: ${error.message}`)
    })
  })
  request.write(postData)
  request.end()
}

export default { updateNeighbourList, getRandomNeighbour }
