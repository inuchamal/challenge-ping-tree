process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
var fs = require('fs')
var path = require('path')
var bl = require('bl')

var server = require('../lib/server')

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Post api/targets', function (t) {
  var url = '/api/targets'
  // servertest is a duplex stream when posting data
  var serverStream = servertest(server(), url, { method: 'POST', headers: { ...{ 'content-type': 'application/json' } } })

  // pipe data to the POST request
  fs.createReadStream(path.join(__dirname, 'newTarget.json')).pipe(serverStream)

  // pipe data from the response
  serverStream.pipe(bl(function (err, res) {
    res = JSON.parse(res)
    console.log(res)
    t.falsy(err, 'no error')

    t.is(res.status, 'OK', 'status is ok')
    t.end()
  }))
})

test.serial.cb('GET api/targets', function (t) {
  var url = '/api/targets'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('GET api/target/:id', function (t) {
  var url = '/api/target/1'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Post api/target/:id', function (t) {
  var url = '/api/target/1'
  // servertest is a duplex stream when posting data
  var serverStream = servertest(server(), url, { method: 'POST', headers: { ...{ 'content-type': 'application/json' } } })

  // pipe data to the POST request
  fs.createReadStream(path.join(__dirname, 'updateTarget.json')).pipe(serverStream)

  // pipe data from the response
  serverStream.pipe(bl(function (err, res) {
    res = JSON.parse(res)
    console.log(res)
    t.falsy(err, 'no error')

    t.is(res.status, 'OK', 'status is ok')
    t.end()
  }))
})

test.serial.cb('Post route', function (t) {
  var url = '/route'
  // servertest is a duplex stream when posting data
  var serverStream = servertest(server(), url, { method: 'POST', headers: { ...{ 'content-type': 'application/json' } } })

  // pipe data to the POST request
  fs.createReadStream(path.join(__dirname, 'visitorInfo.json')).pipe(serverStream)

  // pipe data from the response
  serverStream.pipe(bl(function (err, res) {
    res = JSON.parse(res)
    console.log(res)
    t.falsy(err, 'no error')

    t.is(res.status, 'OK', 'status is ok')
    t.end()
  }))
})
