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
  const {
    projectId,
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

  if (!projectId || !projectName || !year || !currency) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: projectId, projectName, year, currency'
    })
  }

  const checkQuery = 'SELECT projectId FROM project WHERE projectId = ?'
  executeQuery(checkQuery, [projectId]).then(results => {
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
      projectId, projectName, year, currency, initialBudgetLocal,
      budgetUsd, initialScheduleEstimateMonths, adjustedScheduleEstimateMonths,
      contingencyRate, escalationRate, finalBudgetUsd
    ]

    executeQuery(insertQuery, values).then(() => {
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        projectId
      })
    })
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

module.exports = endpoints
