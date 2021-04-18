var URL = require('url')
var http = require('http')
var cuid = require('cuid')
var Corsify = require('corsify')
var sendJson = require('send-data/json')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')
var HttpHashRouter = require('http-hash-router')

var redis = require('./redis')
var targets = require('./redis/targets')
var version = require('../package.json').version

var router = HttpHashRouter()
var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)
var cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})

router.set('/favicon.ico', empty)

router.set('/', (req, res) => {
  var app = require('../package.json')
  res.end(`app name: ${app.name} \napp version: ${app.version}`)
})

router.set('/api/targets', (req, res, query) => {
  if (req.method === 'POST') {
    // post a target
    // get request body
    const chunks = []
    req.on('data', data => chunks.push(data))
    req.on('end', () => {
      let body = Buffer.concat(chunks)

      if (req.headers['content-type'] === 'application/json') {
        try {
          body = JSON.parse(body)
          console.log('body ==>', body)

          targets
            .add(body)
            .then(() => {
              sendJson(req, res, {
                statusCode: res.statusCode,
                body: {
                  status: 'OK',
                  msg: 'Successfuly added'
                }
              })
            })
            .catch(() => {
              sendJson(req, res, {
                statusCode: res.statusCode,
                body: {
                  status: 'Error',
                  msg: 'Redis error'
                }
              })
            })
        } catch (error) {
          sendJson(req, res, {
            statusCode: 400,
            body: {
              status: 'Error',
              msg: 'Request body Json parse error'
            }
          })
        }
      } else {
        sendJson(req, res, {
          statusCode: 400,
          body: {
            status: 'Error',
            msg: 'Invalid request'
          }
        })
      }
    })
  } else if (req.method === 'GET') {
    // get all targets
    targets
      .getAll()
      .then((data) => {
        sendJson(req, res, {
          statusCode: res.statusCode,
          body: {
            status: 'OK',
            data: data
          }
        })
      })
      .catch(() => {
        sendJson(req, res, {
          statusCode: 400,
          body: {
            status: 'Error',
            msg: 'Redis error'
          }
        })
      })
  } else {
    // invalid request
    sendJson(req, res, {
      statusCode: 400,
      body: {
        status: 'Error',
        msg: 'Invalid request, request method is incorrect'
      }
    })
  }
})

router.set('/api/target/:id', (req, res, query) => {
  const pathname = URL.parse(req.url, true).pathname // eslint-disable-line
  const id = pathname.split('/').pop()
  console.log('id ==>', id)

  if (req.method === 'POST') {
    // update a target by id
    // get request body
    const chunks = []
    req.on('data', data => chunks.push(data))
    req.on('end', () => {
      let body = Buffer.concat(chunks)

      if (req.headers['content-type'] === 'application/json') {
        try {
          body = JSON.parse(body)

          targets
            .updateById(id, body)
            .then(() => {
              sendJson(req, res, {
                statusCode: res.statusCode,
                body: {
                  status: 'OK',
                  msg: 'Successfuly updated'
                }
              })
            })
            .catch(() => {
              sendJson(req, res, {
                statusCode: res.statusCode,
                body: {
                  status: 'Error',
                  msg: 'Redis error'
                }
              })
            })
        } catch (error) {
          sendJson(req, res, {
            statusCode: 400,
            body: {
              status: 'Error',
              msg: 'Request body Json parse error'
            }
          })
        }
      } else {
        sendJson(req, res, {
          statusCode: 400,
          body: {
            status: 'Error',
            msg: 'Invalid request'
          }
        })
      }
    })
  } else if (req.method === 'GET') {
    // get a target by id
    targets
      .getById(id)
      .then((data) => {
        sendJson(req, res, {
          statusCode: res.statusCode,
          body: {
            status: 'OK',
            data: data
          }
        })
      })
      .catch(() => {
        sendJson(req, res, {
          statusCode: 400,
          body: {
            status: 'Error',
            msg: 'Redis error'
          }
        })
      })
  } else {
    // invalid request
    sendJson(req, res, {
      statusCode: 400,
      body: {
        status: 'Error',
        msg: 'Invalid request, request method is incorrect'
      }
    })
  }
})

router.set('/route', (req, res) => {
  if (req.method === 'POST') {
    // post a target
    // get request body
    const chunks = []
    req.on('data', data => chunks.push(data))
    req.on('end', async () => {
      let body = Buffer.concat(chunks)

      if (req.headers['content-type'] === 'application/json') {
        try {
          body = JSON.parse(body)
          console.log('body ==>', body)

          let result = await targets.decision(body)

          if (result === true) {
            sendJson(req, res, {
              statusCode: 200,
              body: {
                status: 'OK',
                decision: 'passed'
              }
            })
          } else {
            sendJson(req, res, {
              statusCode: 400,
              body: {
                status: 'Error',
                decision: 'reject'
              }
            })
          }
        } catch (error) {
          sendJson(req, res, {
            statusCode: 400,
            body: {
              status: 'Error',
              msg: 'Request body Json parse error'
            }
          })
        }
      } else {
        sendJson(req, res, {
          statusCode: 400,
          body: {
            status: 'Error',
            msg: 'Invalid request'
          }
        })
      }
    })
  } else {
    // invalid request
    sendJson(req, res, {
      statusCode: 400,
      body: {
        status: 'Error',
        msg: 'Invalid request, request method is incorrect'
      }
    })
  }
})

module.exports = function createServer () {
  return http.createServer(cors(handler))
}

function handler (req, res) {
  if (req.url === '/health') return health(req, res)
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    console.log(info)
  })
  router(req, res, { query: getQuery(req.url) }, onError.bind(null, req, res))
}

function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  var logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty (req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery (url) {
  return URL.parse(url, true).query // eslint-disable-line
}
