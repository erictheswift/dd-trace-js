'use strict'
const retry = require('retry')

const request = require('./request')
const log = require('../../../log')

const { AgentlessCiVisibilityEncoder } = require('../../../encode/agentless-ci-visibility')

class Writer {
  constructor ({ url, tags }) {
    const { 'runtime-id': runtimeId, env, service } = tags
    this._url = url
    this._encoder = new AgentlessCiVisibilityEncoder({ runtimeId, env, service })

    this._backoffTime = 1000
    this._backoffTries = 5
  }

  append (trace) {
    log.debug(() => `Encoding trace: ${JSON.stringify(trace)}`)

    this._encode(trace)
  }

  _sendPayload (data, done) {
    const operation = retry.operation({
      retries: this._backoffTries,
      minTimeout: this._backoffTime,
      randomize: true
    })

    operation.attempt((attempt) => {
      const timeout = this._backoffTime * Math.pow(2, attempt)
      makeRequest(data, this._url, timeout, (err, res) => {
        if (operation.retry(err)) {
          log.error(err)
          return
        }
        if (err) {
          log.error(err)
          done()
          return
        }
        log.debug(`Response from the intake: ${res}`)
        done()
      })
    })
  }

  setUrl (url) {
    this._url = url
  }

  _encode (trace) {
    this._encoder.encode(trace)
  }

  flush (done = () => {}) {
    const count = this._encoder.count()

    if (count > 0) {
      const payload = this._encoder.makePayload()

      this._sendPayload(payload, done)
    } else {
      done()
    }
  }
}

function makeRequest (data, url, timeout, cb) {
  const options = {
    path: '/api/v2/citestcycle',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout
  }
  if (process.env.DATADOG_API_KEY || process.env.DD_API_KEY) {
    options.headers['dd-api-key'] = process.env.DATADOG_API_KEY || process.env.DD_API_KEY
  }

  options.protocol = url.protocol
  options.hostname = url.hostname
  options.port = url.port

  log.debug(() => `Request to the intake: ${JSON.stringify(options)}`)

  request(data, options, (err, res) => {
    cb(err, res)
  })
}

module.exports = Writer
