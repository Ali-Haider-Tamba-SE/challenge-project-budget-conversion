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

test('POST /api/project/budget should return 201', function (t) {
  const opts = {
    encoding: 'json',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const data = {
    projectId: 10001,
    projectName: 'Humitas Hewlett Packard',
    year: 2024,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }

  servertest(server, '/api/project/budget', opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 201, 'Should return 201')
    t.end()
  }).end(JSON.stringify(data))
})

test('POST /api/project/budget should return 400 if required fields are missing', function (t) {
  const opts = {
    encoding: 'json',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const invalidData = {
    projectId: 10002,
    // Missing projectName
    year: 2024,
    currency: 'EUR',
    initialBudgetLocal: 1000,
    budgetUsd: 900,
    initialScheduleEstimateMonths: 6,
    adjustedScheduleEstimateMonths: 5,
    contingencyRate: 1.2,
    escalationRate: 1.3,
    finalBudgetUsd: 950
  }

  servertest(server, '/api/project/budget', opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for missing field')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  }).end(JSON.stringify(invalidData))
})

test('POST /api/project/budget should return 409 for duplicate projectId', function (t) {
  const opts = {
    encoding: 'json',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const duplicateData = {
    projectId: 10001, // Already used in previous test
    projectName: 'Duplicate Test Project',
    year: 2025,
    currency: 'USD',
    initialBudgetLocal: 5000,
    budgetUsd: 5000,
    initialScheduleEstimateMonths: 6,
    adjustedScheduleEstimateMonths: 6,
    contingencyRate: 0,
    escalationRate: 0,
    finalBudgetUsd: 5000
  }

  servertest(server, '/api/project/budget', opts, function (err, res) {
    t.error(err, 'No error')
    t.ok(res.statusCode === 409 || res.statusCode === 400, 'Should return 409 or 400 for duplicate ID')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  }).end(JSON.stringify(duplicateData))
})

test('POST /api/project/budget should return 400 for invalid field type', function (t) {
  const opts = {
    encoding: 'json',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const invalidTypeData = {
    projectId: 'not-a-number', // Invalid type
    projectName: 'Invalid Type Project',
    year: 2024,
    currency: 'EUR',
    initialBudgetLocal: 1000,
    budgetUsd: 900,
    initialScheduleEstimateMonths: 6,
    adjustedScheduleEstimateMonths: 5,
    contingencyRate: 1.2,
    escalationRate: 1.3,
    finalBudgetUsd: 950
  }

  servertest(server, '/api/project/budget', opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for invalid projectId type')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  }).end(JSON.stringify(invalidTypeData))
})

test('PUT /api/project/budget/:id should return 200', function (t) {
  const projectId = '10001'
  const opts = {
    encoding: 'json',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const data = {
    projectName: 'Humitas Hewlett Packard',
    year: 2025,
    currency: 'EUR',
    initialBudgetLocal: 316974.5,
    budgetUsd: 233724.23,
    initialScheduleEstimateMonths: 13,
    adjustedScheduleEstimateMonths: 12,
    contingencyRate: 2.19,
    escalationRate: 3.46,
    finalBudgetUsd: 247106.75
  }

  servertest(server, `/api/project/budget/${projectId}`, opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  }).end(JSON.stringify(data))
})

test('PUT /api/project/budget/:id should return 404 if project not found', function (t) {
  const projectId = '999999' // Assumed non-existent
  const opts = {
    encoding: 'json',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const data = {
    projectName: 'Nonexistent Project',
    year: 2025,
    currency: 'USD',
    initialBudgetLocal: 1000,
    budgetUsd: 1000,
    initialScheduleEstimateMonths: 6,
    adjustedScheduleEstimateMonths: 6,
    contingencyRate: 1.2,
    escalationRate: 1.3,
    finalBudgetUsd: 1100
  }

  servertest(server, `/api/project/budget/${projectId}`, opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 if project not found')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  }).end(JSON.stringify(data))
})

test('PUT /api/project/budget/:id should return 400 for invalid projectId in URL', function (t) {
  const projectId = 'abc' // Invalid
  const opts = {
    encoding: 'json',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const data = {
    projectName: 'Invalid ID Project',
    year: 2025,
    currency: 'USD',
    initialBudgetLocal: 1000,
    budgetUsd: 1000,
    initialScheduleEstimateMonths: 6,
    adjustedScheduleEstimateMonths: 6,
    contingencyRate: 1.2,
    escalationRate: 1.3,
    finalBudgetUsd: 1100
  }

  servertest(server, `/api/project/budget/${projectId}`, opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for invalid ID format')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  }).end(JSON.stringify(data))
})

test('PUT /api/project/budget/:id should return 400 if required fields are missing', function (t) {
  const projectId = '10001'
  const opts = {
    encoding: 'json',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const invalidData = {
    // projectName is missing
    year: 2025,
    currency: 'USD',
    initialBudgetLocal: 1000,
    budgetUsd: 1000,
    initialScheduleEstimateMonths: 6,
    adjustedScheduleEstimateMonths: 6,
    contingencyRate: 1.2,
    escalationRate: 1.3,
    finalBudgetUsd: 1100
  }

  servertest(server, `/api/project/budget/${projectId}`, opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for missing field')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  }).end(JSON.stringify(invalidData))
})

test('DELETE /api/project/budget/:id should return 200', function (t) {
  const projectId = '10001'
  const opts = {
    encoding: 'json',
    method: 'DELETE'
  }

  servertest(server, `/api/project/budget/${projectId}`, opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 200, 'Should return 200')
    t.end()
  })
})

test('DELETE /api/project/budget/:id should return 404 if project does not exist', function (t) {
  const projectId = '999999' // Assumed non-existent
  const opts = {
    encoding: 'json',
    method: 'DELETE'
  }

  servertest(server, `/api/project/budget/${projectId}`, opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 404, 'Should return 404 for nonexistent project')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  })
})

test('DELETE /api/project/budget/:id should return 400 for invalid projectId format', function (t) {
  const projectId = 'invalid-id' // Not a number
  const opts = {
    encoding: 'json',
    method: 'DELETE'
  }

  servertest(server, `/api/project/budget/${projectId}`, opts, function (err, res) {
    t.error(err, 'No error')
    t.equal(res.statusCode, 400, 'Should return 400 for invalid ID format')
    t.ok(res.body && res.body.error, 'Should return error message')
    t.end()
  })
})

test.onFinish(() => {
  if (db.close) db.close()
  process.exit(0)
})
