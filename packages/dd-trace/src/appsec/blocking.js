'use strict'

const log = require('../log')
const fs = require('fs')

// TODO: move template loading to a proper spot.
let templateLoaded = false
let templateHtml = '<html>blocked</html>'
let templateJson = '{"error": "blocked"}'

function block (req, res, rootSpan, abortController) {
  if (res.headersSent) {
    log.warn('Cannot send blocking response when headers have already been sent')
    return
  }

  let type
  let body

  // parse the Accept header, ex: Accept: text/html, application/xhtml+xml, application/xml;q=0.9, */*;q=0.8
  const accept = req.headers.accept && req.headers.accept.split(',').map((str) => str.split(';', 1)[0].trim())

  if (accept && accept.includes('text/html') && !accept.includes('application/json')) {
    type = 'text/html'
    body = templateHtml
  } else {
    type = 'application/json'
    body = templateJson
  }

  rootSpan.addTags({
    'appsec.blocked': 'true'
  })

  res.statusCode = 403
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Length', Buffer.byteLength(body))
  res.end(body)

  if (abortController) {
    abortController.abort()
  }
}

function loadBlockedTemplate () {
  return require('./templates/blocked')
}

function loadTemplates (config) {
  if (!templateLoaded) {
    try {
      templateHtml = config.appsec.blockedTemplateHtml
        ? fs.readFileSync(config.appsec.blockedTemplateHtml)
        : loadBlockedTemplate().html
    } catch (err) {
      log.warn(`Unable to read ${config.appsec.blockedTemplateHtml} from disk.`)
    }

    try {
      templateJson = config.appsec.blockedTemplateJson
        ? fs.readFileSync(config.appsec.blockedTemplateJson)
        : loadBlockedTemplate().json
    } catch (err) {
      log.warn(`Unable to read ${config.appsec.blockedTemplateJson} from disk.`)
    }
    templateLoaded = true
  }
}

async function loadTemplatesAsync (config) {
  if (!templateLoaded) {
    try {
      templateHtml = config.appsec.blockedTemplateHtml
        ? await fs.promises.readFile(config.appsec.blockedTemplateHtml)
        : loadBlockedTemplate().html
    } catch (err) {
      log.warn(`Unable to read ${config.appsec.blockedTemplateHtml} from disk.`)
    }

    try {
      templateJson = config.appsec.blockedTemplateJson
        ? await fs.promises.readFile(config.appsec.blockedTemplateJson)
        : loadBlockedTemplate().json
    } catch (err) {
      log.warn(`Unable to read ${config.appsec.blockedTemplateJson} from disk.`)
    }

    templateLoaded = true
  }
}

function resetTemplates () {
  templateLoaded = false
}

module.exports = {
  block,
  loadTemplates,
  loadTemplatesAsync,
  resetTemplates
}
