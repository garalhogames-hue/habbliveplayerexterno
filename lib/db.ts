import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export { sql }

// Tipos para as tabelas
export interface RadioStats {
  key: string
  total: number
  updated_at: string
}

export interface LoveClick {
  id: number
  ip_hash: string | null
  user_agent: string | null
  created_at: string
}
