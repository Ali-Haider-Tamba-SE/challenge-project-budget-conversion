const express = require('express')
const db = require('./db')
const axios = require('axios')
const config = require('../config')

const endpoints = express.Router()

async function getExchangeRate (fromCurrency, toCurrency) {
  const apiKey = config.currency.apiKey
  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${fromCurrency}`
  const response = await axios.get(url)
  const rate = response.data.conversion_rates[toCurrency]
  return rate
}

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

endpoints.post('/project/budget/currency', async (req, res) => {
  try {
    const { year, projectName, currency } = req.body

    if (!year || !projectName || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: year, projectName, currency'
      })
    }

    const searchQuery = 'SELECT * FROM project WHERE projectName LIKE ? AND year = ?'
    const searchPattern = `%${projectName}%`

    executeQuery(searchQuery, [searchPattern, year]).then(async results => {
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No projects found matching the criteria'
        })
      }

      const convertedProjects = []

      for (const project of results) {
        try {
          const rate = await getExchangeRate('USD', currency)
          const convertedAmount = project.finalBudgetUsd * rate

          convertedProjects.push({
            ...project,
            [`finalBudget${currency}`]: parseFloat(convertedAmount.toFixed(2))
          })
        } catch (error) {
          console.error('Currency conversion error:', error)
          convertedProjects.push({
            ...project,
            [`finalBudget${currency}`]: null,
            conversionError: error.message
          })
        }
      }

      res.status(200).json({
        success: true,
        data: convertedProjects
      })
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
})

module.exports = endpoints
