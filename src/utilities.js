import fs from 'fs'
export const GET = 'GET'
export const POST = 'POST'
const LOGFILE = 'logs.txt'
export const PROCESS_ARGUMENTS = getProcessArguments()

function parsePathFromUrl(url) {
  const urlParts = url.split('?')
  return urlParts[0]
}

function parseParamsFromUrl(url) {
  const urlParts = url.split('?')

  if (urlParts.length > 1) {
    return getObjectFromKeyValuePairs(urlParts[1].split('&'), '=')
  }
  return {}
}

function getObjectFromKeyValuePairs(list, delimiter) {
  return list.reduce((previousElement, nextElement) => {
    nextElement = nextElement.split(delimiter)
    nextElement.length > 0 ? previousElement[nextElement[0]] = nextElement[1] : ''
    return previousElement
  }, {})
}

function getProcessArguments() {
  const processArguments = getObjectFromKeyValuePairs(process.argv.splice(2), '=')
  for (const key in processArguments) {
    if (key === 'port' || key === 'lazyness') {
      if (isNaN(parseFloat(processArguments[key]))) {
        delete processArguments[key]
      } else {
        processArguments[key] = parseFloat(processArguments[key])
      }
    }
  }
  if (!processArguments.port) processArguments.port = 1215
  if (!processArguments.directory) processArguments.directory = 'getpeers'
  if (!processArguments.lazyness) processArguments.lazyness = 0
  return processArguments
}

function createLogFile(fileName) {
  fs.writeFile(`logs/${fileName}`, '', (err) => {
    if (err) {
      console.log(err)
    }
  })
}

function writeLog(message) {
  const dateTime = new Date().toUTCString()
  fs.appendFile(`logs/${LOGFILE}`, `${dateTime}\t${message}\n`, (err) => {
    if (err) throw err
  })
}

function superDecodeURIComponent(url) {
  return decodeURIComponent(decodeURIComponent(url))
}

export default { parsePathFromUrl, parseParamsFromUrl, getProcessArguments, createLogFile, writeLog, superDecodeURIComponent }
