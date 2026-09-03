import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export const config = {
  env:  process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),

  db: {
    url: required('DATABASE_URL'),
  },

  jwt: {
    secret:    required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  s3: {
    endpoint:  process.env.S3_ENDPOINT   ?? 'http://localhost:9000',
    region:    process.env.S3_REGION     ?? 'us-east-1',
    bucket:    process.env.S3_BUCKET     ?? 'gulyay-media',
    accessKey: process.env.S3_ACCESS_KEY ?? 'gulyay',
    secretKey: process.env.S3_SECRET_KEY ?? 'gulyay123',
    // Публичный адрес хранилища для ссылок в <img> (в проде — CDN/же домен)
    publicUrl: process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  },

  yukassa: {
    shopId:    process.env.YUKASSA_SHOP_ID ?? '',
    secretKey: process.env.YUKASSA_SECRET_KEY ?? '',
  },

  commission: {
    rate: 0.10,   // 10% комиссия гуляй
  },
} as const
