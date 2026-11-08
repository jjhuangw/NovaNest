// 指定管理員：npm run admin:set-role -- <email> [admin|user]
// 讀取 .env* 中的 DATABASE_URL（與 drizzle.config.ts 相同）
import nextEnv from '@next/env'
import pg from 'pg'

nextEnv.loadEnvConfig(process.cwd())

const [email, role = 'admin'] = process.argv.slice(2)
if (!email || !['admin', 'user'].includes(role)) {
  console.error('Usage: npm run admin:set-role -- <email> [admin|user]')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})
await client.connect()
try {
  const { rows } = await client.query('update users set role = $1 where lower(email) = lower($2) returning username, email, role', [role, email])
  if (rows.length === 0) {
    console.error(`No user with email ${email}`)
    process.exitCode = 1
  } else {
    console.log(`${rows[0].username} <${rows[0].email}> is now "${rows[0].role}"`)
  }
} finally {
  await client.end()
}
