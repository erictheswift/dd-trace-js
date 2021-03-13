'use strict'

const FormData = require('form-data')
const { URL } = require('url')
const { Encoder } = require('../encoders/pprof/encoder')

const typeMapping = {
  InspectorCpuProfiler: 'wall',
  InspectorHeapProfiler: 'space',
  NativeCpuProfiler: 'wall',
  NativeHeapProfiler: 'space'
}

class AgentExporter {
  constructor ({ url, hostname, port } = {}) {
    this._url = new URL(url || `http://${hostname || 'localhost'}:${port || 8126}`)
    this._encoder = new Encoder()
  }

  async export ({ profiles, start, end, tags }) {
    const form = new FormData()

    form.append('recording-start', start.toISOString())
    form.append('recording-end', end.toISOString())
    form.append('language', 'javascript')
    form.append('runtime', 'nodejs')
    form.append('format', 'pprof')

    form.append('tags[]', 'language:javascript')
    form.append('tags[]', `runtime:nodejs`)
    form.append('tags[]', 'format:pprof')

    for (const key in tags) {
      form.append('tags[]', `${key}:${tags[key]}`)
    }

    for (const [i, profile] of profiles.entries()) {
      const type = typeMapping[profile.source]
      const buffer = await this._encoder.encode(profile)

      form.append(`types[${i}]`, type)
      form.append(`data[${i}]`, buffer, {
        filename: `${type}.pb.gz`,
        contentType: 'application/octet-stream',
        knownLength: buffer.length
      })
    }

    const options = {
      method: 'POST',
      path: '/profiling/v1/input',
      timeout: 10 * 1000
    }

    if (this._url.protocol === 'unix:') {
      options.socketPath = this._url.pathname
    } else {
      options.protocol = this._url.protocol
      options.hostname = this._url.hostname
      options.port = this._url.port
    }

    return new Promise((resolve, reject) => {
      form.submit(options, (err, res) => {
        if (err) return reject(err)
        if (res.statusCode >= 400) {
          return reject(new Error(`Error from the agent: ${res.statusCode}`))
        }

        resolve()
      })
    })
  }
}

module.exports = { AgentExporter }
