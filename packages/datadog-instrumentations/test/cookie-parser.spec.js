'use strict'

const getPort = require('get-port')
const dc = require('diagnostics_channel')
const axios = require('axios')
const agent = require('../../dd-trace/test/plugins/agent')

withVersions('cookie-parser', 'cookie-parser', version => {
  describe('cookie parser instrumentation', () => {
    const bodyParserReadCh = dc.channel('datadog:cookie-parser:read:finish')
    let port, server, requestBody

    before(() => {
      return agent.load(['express', 'cookie-parser'], { client: false })
    })
    before((done) => {
      const express = require('../../../versions/express').get()
      const cookieParser = require(`../../../versions/cookie-parser@${version}`).get()
      const app = express()
      app.use(cookieParser())
      app.post('/', (req, res) => {
        requestBody()
        res.end('DONE')
      })
      getPort().then(newPort => {
        port = newPort
        server = app.listen(port, () => {
          done()
        })
      })
    })
    beforeEach(async () => {
      requestBody = sinon.stub()
    })

    after(() => {
      server.close()
      return agent.close({ ritmReset: false })
    })

    it('should not abort the request by default', async () => {
      const res = await axios.post(`http://localhost:${port}/`, { key: 'value' })

      expect(requestBody).to.be.calledOnce
      expect(res.data).to.be.equal('DONE')
    })

    it('should not abort the request with non blocker subscription', async () => {
      function noop () { }
      bodyParserReadCh.subscribe(noop)

      const res = await axios.post(`http://localhost:${port}/`, { key: 'value' })

      expect(requestBody).to.be.calledOnce
      expect(res.data).to.be.equal('DONE')

      bodyParserReadCh.unsubscribe(noop)
    })

    it('should abort the request when abortController.abort() is called', async () => {
      function blockRequest ({ res, abortController }) {
        res.end('BLOCKED')
        abortController.abort()
      }
      bodyParserReadCh.subscribe(blockRequest)

      const res = await axios.post(`http://localhost:${port}/`, { key: 'value' })

      expect(requestBody).not.to.be.called
      expect(res.data).to.be.equal('BLOCKED')

      bodyParserReadCh.unsubscribe(blockRequest)
    })

    it('should stop the request even when res.end is not called on abort', async () => {
      function blockRequest ({ abortController }) {
        abortController.abort()
      }
      bodyParserReadCh.subscribe(blockRequest)

      await axios.post(`http://localhost:${port}/`, { key: 'value' })

      expect(requestBody).not.to.be.called

      bodyParserReadCh.unsubscribe(blockRequest)
    })
  })
})