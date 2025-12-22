module.exports = {
    apps: [
      {
        name: 'Trecurity (Primary)',
        port: '3002',
        exec_mode: 'cluster',
        instances: '1',
        script: './.output/server/index.mjs'
      },
      {
        name: 'Trecurity (Replica)',
        port: '3001',
        exec_mode: 'cluster',
        instances: 'max',
        script: './.output/server/index.mjs'
      }
    ]
  }