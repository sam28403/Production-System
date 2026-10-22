import './environment.js'
import { openDatabase } from './database.js'
import { createApp } from './app.js'

const db = openDatabase()
const app = createApp(db)
const server = app.listen(3001, '127.0.0.1', () => {
  console.log('API ready: http://127.0.0.1:3001/api/health')
})

function shutdown() {
  server.close(async () => {
    await app.locals.closeGraph()
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
