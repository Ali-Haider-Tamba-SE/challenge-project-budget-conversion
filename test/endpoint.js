process.env.NODE_ENV = 'test'

const http = require('http')
const test = require('tape')
const servertest = require('servertest')
const app = require('../lib/app')
const db = require('../lib/db')
require('../scripts/seed')

const server = http.createServer(app)

test('GET /health should return 200', function (t) {
  servertest(server, '/health', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

test('GET /api/ok should return 200', function (t) {
  servertest(server, '/api/ok', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.ok, 'Should return a body')
    t.end()
  })
})

test('GET /nonexistent should return 404', function (t) {
  servertest(server, '/nonexistent', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404')
    t.end()
  })
})

test('GET /api/project/budget/:id should return 200 and project data', function (t) {
  servertest(server, '/api/project/budget/1', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.ok(res.body.projectId, 'Should return projectId')
    t.ok(res.body.projectName, 'Should return projectName')
    t.ok(res.body.year, 'Should return year')
    t.end()
  })
})

test('GET /api/project/budget/:id should return 404 for nonexistent project', function (t) {
  servertest(server, '/api/project/budget/999999', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for missing project')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  })
})

test('GET /api/project/budget/:id should return 400 for invalid ID format', function (t) {
  servertest(server, '/api/project/budget/abc', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for invalid ID')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  })
})

test('GET /api/project/budget/:id should return full project data structure', function (t) {
  servertest(server, '/api/project/budget/1', { encoding: 'json' }, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    const body = res.body

    t.ok(body.projectId, 'Includes projectId')
    t.ok(body.projectName, 'Includes projectName')
    t.ok(body.currency, 'Includes currency')
    t.ok(body.initialBudgetLocal, 'Includes initialBudgetLocal')
    t.ok(body.budgetUsd, 'Includes budgetUsd')
    t.ok(body.initialScheduleEstimateMonths, 'Includes initialScheduleEstimateMonths')
    t.ok(body.adjustedScheduleEstimateMonths, 'Includes adjustedScheduleEstimateMonths')
    t.ok(body.contingencyRate, 'Includes contingencyRate')
    t.ok(body.escalationRate, 'Includes escalationRate')
    t.ok(body.finalBudgetUsd, 'Includes finalBudgetUsd')

    t.end()
  })
})

test.onFinish(() => {
  if (db.close) db.close()
  process.exit(0)
})
