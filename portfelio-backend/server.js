const express = require('express')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, 'leaderboard.json')

app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return []
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// POST /score — add or update player score
app.post('/score', (req, res) => {
  const { nickname, financialIQ, totalReturn, decisions } = req.body
  if (!nickname || financialIQ == null) return res.status(400).json({ error: 'missing fields' })

  const board = readData()
  const existing = board.findIndex(e => e.nickname === nickname)
  const entry = { nickname, financialIQ, totalReturn: totalReturn ?? 0, decisions: decisions ?? 0 }

  if (existing >= 0) {
    // keep best score
    if (financialIQ > board[existing].financialIQ) {
      board[existing] = entry
    }
  } else {
    board.push(entry)
  }

  board.sort((a, b) => b.financialIQ - a.financialIQ)
  writeData(board)
  res.json({ rank: board.findIndex(e => e.nickname === nickname) + 1 })
})

// GET /leaderboard — top 20
app.get('/leaderboard', (req, res) => {
  const board = readData().slice(0, 20)
  res.json(board)
})

app.listen(PORT, () => console.log(`Leaderboard server running on port ${PORT}`))
