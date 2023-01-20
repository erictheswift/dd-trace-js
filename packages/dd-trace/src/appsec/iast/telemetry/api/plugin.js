'use strict'

const dc = require('diagnostics_channel')
const log = require('../../../../log')
const { sendData } = require('../../../../telemetry/send-data')

const telemetryStartChannel = dc.channel('datadog:telemetry:start')
const telemetryStopChannel = dc.channel('datadog:telemetry:stop')

module.exports = class TelemetryPlugin {
  constructor (reqType) {
    this.reqType = reqType

    this._onTelemetryStart = (msg) => {
      if (!msg) {
        log.info(`IAST telemetry ${this.reqType} start received but configuration is incorrect`)
        return false
      }
      this.start(msg.config, msg.application, msg.host, msg.heartbeatInterval)
    }
    this._onTelemetryStop = () => {
      this.stop()
    }

    telemetryStartChannel.subscribe(this._onTelemetryStart)
    telemetryStopChannel.subscribe(this._onTelemetryStop)
  }

  start (aConfig, appplicationObject, hostObject, heartbeatInterval) {
    this.config = aConfig
    this.application = appplicationObject
    this.host = hostObject
    this.heartbeatInterval = heartbeatInterval

    if (this.onStart() && this.heartbeatInterval) {
      this.startInterval()
    }
  }

  startInterval () {
    if (this.interval || !this.heartbeatInterval) return

    this.interval = setInterval(() => { this.onSendData() }, this.heartbeatInterval)
    this.interval.unref()
  }

  stopInterval () {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }

  onSendData () {
    try {
      const payload = this.getPayload()
      if (payload) {
        this.send(payload)
      }
    } catch (e) {
      log.error(e)
    }
  }

  send (payload) {
    sendData(this.config, this.application, this.host, this.reqType, payload)
  }

  onStart () { return true }

  onStop () {}

  getPayload () {}

  stop () {
    this.onStop()

    this.config = null
    this.application = null
    this.host = null

    if (this.interval) {
      clearInterval(this.interval)
    }

    if (telemetryStartChannel.hasSubscribers) {
      telemetryStartChannel.unsubscribe(this._onTelemetryStart)
    }

    if (telemetryStopChannel.hasSubscribers) {
      telemetryStopChannel.unsubscribe(this._onTelemetryStop)
    }
  }
}
