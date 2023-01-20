'use strict'

const { expect } = require('chai')
const proxyquire = require('proxyquire')

const TelemetryPlugin = require('../../../../../src/appsec/iast/telemetry/api/plugin')

describe('TelemetryPlugin', () => {
  let onSendData, plugin, clock
  const config = {}
  const application = {}
  const host = 'host'

  beforeEach(() => {
    plugin = new TelemetryPlugin('pluginReqType')
    onSendData = sinon.spy(plugin, 'onSendData')
    clock = sinon.useFakeTimers()
  })

  afterEach(() => {
    sinon.reset()
    clock.restore()
  })

  describe('start', () => {
    it('should not set a periodic task to send metrics if no interval is provided', () => {
      plugin.start()
      clock.tick(1000)

      expect(onSendData).to.not.have.been.called
    })

    it('should set a periodic task to send metrics if interval is provided', () => {
      plugin.start(config, application, host, 60000)
      clock.tick(60000)

      expect(onSendData).to.have.been.called
      expect(plugin.interval).to.not.be.null
    })

    it('should call onStart and skip setting a periodic task if value returned by onStart is false', () => {
      const origOnStart = plugin.onStart
      plugin.onStart = () => false
      plugin.start(config, application, host, 60000)
      clock.tick(60000)

      expect(onSendData).to.not.have.been.called
      plugin.onStart = origOnStart
    })
  })

  describe('stop', () => {
    it('should call onStop', () => {
      const metricsOnStop = sinon.stub(plugin, 'onStop')
      plugin.start(config, application, host, 60000)
      plugin.stop()

      expect(metricsOnStop).to.have.been.calledOnce
      metricsOnStop.restore()
    })
  })

  describe('onSendData', () => {
    it('should obtain the payload and send it with sendData', () => {
      const sendDataMock = sinon.stub()
      const TelemetryPlugin = proxyquire('../../../../../src/appsec/iast/telemetry/api/plugin', {
        '../../../../telemetry/send-data': {
          sendData: sendDataMock
        }
      })
      const plugin = new TelemetryPlugin('pluginReqType')
      const getPayloadMock = sinon.stub(plugin, 'getPayload')
      const payload = { payload: '' }
      getPayloadMock.returns(payload)

      plugin.start(config, application, host)
      plugin.onSendData()

      expect(getPayloadMock).to.have.been.calledOnce
      expect(sendDataMock).to.have.been.calledOnceWith(config, application, host, 'pluginReqType', payload)
    })
  })
})
