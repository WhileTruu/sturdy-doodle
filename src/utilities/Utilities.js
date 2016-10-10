export const GET = 'GET'
export const POST = 'POST'
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
  return processArguments
}

export default { parsePathFromUrl, parseParamsFromUrl, getProcessArguments }
