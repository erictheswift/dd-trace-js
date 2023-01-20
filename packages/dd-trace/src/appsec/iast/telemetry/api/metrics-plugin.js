'use strict'

const TelemetryPlugin = require('./plugin')

const DD_TELEMETRY_METRICS_POLL_SECONDS = process.env.DD_TELEMETRY_METRICS_POLL_SECONDS
  ? Number(process.env.DD_TELEMETRY_METRICS_POLL_SECONDS) * 1000
  : 10000

class MetricsTelemetryPlugin extends TelemetryPlugin {
  constructor () {
    super('generate-metrics')
    this.metricProviders = new Set()
  }

  onStart () {
    this.heartbeatInterval = DD_TELEMETRY_METRICS_POLL_SECONDS
    return this.metricProviders.size > 0
  }

  getPayload () {
    const series = []
    this.metricProviders.forEach(provider => {
      const metrics = provider()
      if (metrics) {
        series.push(...metrics)
      }
    })
    if (series.length > 0) {
      return {
        namespace: 'tracers',
        series
      }
    }
  }

  registerProvider (provider) {
    this.metricProviders.add(provider)
    this.startInterval()
  }

  unregisterProvider (provider) {
    if (this.metricProviders.has(provider)) {
      this.metricProviders.delete(provider)
    }
    if (this.metricProviders.size === 0) {
      this.stopInterval()
    }
  }

  onStop () {
    this.metricProviders.clear()
  }
}

module.exports = new MetricsTelemetryPlugin()
