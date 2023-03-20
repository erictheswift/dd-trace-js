'use strict'

const SnapshotKinds = Object.freeze({
  PERIODIC: 'periodic',
  ON_SHUTDOWN: 'on_shutdown',
  ON_OUT_OF_MEMORY: 'on_oom'
})

const OOMExportStrategies = Object.freeze({
  PROCESS: 'process',
  ASYNC_CALLBACK: 'async',
  INTERRUPT_CALLBACK: 'interrupt',
  LOGS: 'logs'
})

module.exports = { SnapshotKinds, OOMExportStrategies }
