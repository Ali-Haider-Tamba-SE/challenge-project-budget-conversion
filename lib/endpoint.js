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

module.exports = endpoints
