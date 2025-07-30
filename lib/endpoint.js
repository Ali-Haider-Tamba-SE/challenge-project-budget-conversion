const express = require('express')
const db = require('./db')
const endpoints = express.Router()

async function executeQuery (sql, params = []) {
  return new Promise((resolve, reject) => {
    db.executeQuery(sql, params, (err, results) => {
      if (err) return reject(err)
      resolve(results)
    })
  })
}

function validateProjectId (id) {
  const projectId = parseInt(id)
  if (isNaN(projectId)) {
    throw new Error('Invalid project ID')
  }
  return projectId
}

function validateProjectInput (body) {
  const requiredFields = [
    'projectId',
    'projectName',
    'year',
    'currency',
    'initialBudgetLocal',
    'budgetUsd',
    'initialScheduleEstimateMonths',
    'adjustedScheduleEstimateMonths',
    'contingencyRate',
    'escalationRate',
    'finalBudgetUsd'
  ]

  const missing = requiredFields.filter(field => body[field] === undefined)

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`)
  }

  if (typeof body.projectId !== 'number') {
    throw new Error('projectId must be a number')
  }

  if (typeof body.year !== 'number') {
    throw new Error('year must be a number')
  }
}

endpoints.get('/ok', (req, res) => {
  res.status(200).json({ ok: true })
})

endpoints.get('/project/budget/:id', (req, res) => {
  try {
    const projectId = validateProjectId(req.params.id)
    const query = 'SELECT * FROM project WHERE projectId = ?'

    executeQuery(query, [projectId]).then(results => {
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      res.status(200).json(results[0])
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

endpoints.post('/project/budget', (req, res) => {
  const body = req.body

  try {
    validateProjectInput(body)
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    })
  }

  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  executeQuery(checkQuery, [body.projectId])
    .then(results => {
      if (results.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Project with this ID already exists'
        })
      }

      const insertQuery = `
        INSERT INTO project (
          projectId, projectName, year, currency, initialBudgetLocal,
          budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
          contingencyRate, escalationRate, finalBudgetUsd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const values = [
        body.projectId, body.projectName, body.year, body.currency,
        body.initialBudgetLocal, body.budgetUsd,
        body.initialScheduleEstimateMonths, body.adjustedScheduleEstimateMonths,
        body.contingencyRate, body.escalationRate, body.finalBudgetUsd
      ]

      return executeQuery(insertQuery, values).then(() => {
        res.status(201).json({
          success: true,
          message: 'Project created successfully',
          projectId: body.projectId
        })
      })
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({ success: false, error: 'Internal server error' })
    })
})

endpoints.put('/project/budget/:id', (req, res) => {
  try {
    const projectId = validateProjectId(req.params.id)
    const {
      projectName,
      year,
      currency,
      initialBudgetLocal,
      budgetUsd,
      initialScheduleEstimateMonths,
      adjustedScheduleEstimateMonths,
      contingencyRate,
      escalationRate,
      finalBudgetUsd
    } = req.body

    if (!projectName || !year || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: projectName, year, currency'
      })
    }

    const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
    executeQuery(checkQuery, [projectId]).then(results => {
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      const updateQuery = `
        UPDATE project SET 
          projectName = ?, year = ?, currency = ?, initialBudgetLocal = ?,
          budgetUsd = ?, initialScheduleEstimateMonths = ?, 
          adjustedScheduleEstimateMonths = ?, contingencyRate = ?, 
          escalationRate = ?, finalBudgetUsd = ?
        WHERE projectId = ?
      `

      const values = [
        projectName, year, currency, initialBudgetLocal,
        budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
        contingencyRate, escalationRate, finalBudgetUsd, projectId
      ]

      executeQuery(updateQuery, values).then(() => {
        res.status(200).json({
          success: true,
          message: 'Project updated successfully',
          projectId
        })
      })
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

endpoints.delete('/project/budget/:id', (req, res) => {
  try {
    const projectId = validateProjectId(req.params.id)
    const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'

    executeQuery(checkQuery, [projectId]).then(results => {
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        })
      }

      const deleteQuery = 'DELETE FROM project WHERE projectId = ?'
      executeQuery(deleteQuery, [projectId]).then(() => {
        res.status(200).json({
          success: true,
          message: 'Project deleted successfully',
          projectId
        })
      })
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

module.exports = endpoints
