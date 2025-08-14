import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Rate limiting simples em memória
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW = 3000 // 3 segundos

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : "unknown"
  return ip
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const lastRequest = rateLimitMap.get(key)

  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    return true
  }

  rateLimitMap.set(key, now)
  return false
}

async function ensureTablesExist() {
  try {
    // Verificar se DATABASE_URL está definida
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não está definida")
    }

    // Criar tabela de estatísticas se não existir
    await sql`
      CREATE TABLE IF NOT EXISTS radio_stats (
        key TEXT PRIMARY KEY,
        total INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `

    // Inserir linha inicial se não existir
    await sql`
      INSERT INTO radio_stats (key, total) 
      VALUES ('love_total', 0) 
      ON CONFLICT (key) DO NOTHING
    `

    // Criar tabela de logs se não existir
    await sql`
      CREATE TABLE IF NOT EXISTS love_clicks (
        id SERIAL PRIMARY KEY,
        ip_hash TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `
  } catch (error) {
    console.error("Erro ao criar tabelas:", error)
    throw error // Re-throw para que o erro seja capturado nas funções principais
  }
}

// GET - retorna total atual
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL não está definida")
      return NextResponse.json({ total: 0, error: "Configuração do banco não encontrada" })
    }

    await ensureTablesExist()

    const result = await sql`
      SELECT total FROM radio_stats WHERE key = 'love_total'
    `

    const total = result[0]?.total || 0

    return NextResponse.json({ total })
  } catch (error) {
    console.error("Erro ao buscar total de amores:", error)
    return NextResponse.json({
      total: 0,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

// POST - incrementa contador
export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL não está definida")
      return NextResponse.json({ error: "Configuração do banco não encontrada" }, { status: 500 })
    }

    await ensureTablesExist()

    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ error: "Muitas tentativas. Tente novamente em alguns segundos." }, { status: 429 })
    }

    // Incrementa atomicamente
    const result = await sql`
      UPDATE radio_stats 
      SET total = total + 1, updated_at = NOW() 
      WHERE key = 'love_total' 
      RETURNING total
    `

    const newTotal = result[0]?.total || 1

    // Opcional: log do clique para análises futuras
    try {
      const userAgent = request.headers.get("user-agent") || null
      const forwarded = request.headers.get("x-forwarded-for")
      const ip = forwarded ? forwarded.split(",")[0] : null

      // Hash simples do IP para privacidade
      const ipHash = ip ? Buffer.from(ip).toString("base64") : null

      await sql`
        INSERT INTO love_clicks (ip_hash, user_agent)
        VALUES (${ipHash}, ${userAgent})
      `
    } catch (logError) {
      console.warn("Erro ao registrar log do clique:", logError)
      // Não falha a operação principal
    }

    return NextResponse.json({ total: newTotal })
  } catch (error) {
    console.error("Erro ao incrementar amores:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno do servidor",
        total: 0,
      },
      { status: 500 },
    )
  }
}
