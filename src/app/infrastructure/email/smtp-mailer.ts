import "server-only"

import nodemailer from "nodemailer"
import SMTPTransport from "nodemailer/lib/smtp-transport"

type SendHtmlMailInput = {
  to: string[]
  subject: string
  html: string
  text?: string
  inReplyTo?: string
  references?: string | string[]
}

export type SendHtmlMailResult = {
  messageId: string
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
  forceIpv4: boolean
  allowInternalNetworkInterfaces: boolean
}

function parseBooleanEnv(value: string | undefined) {
  return value === "true"
}

function readSmtpConfigFromEnv(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  const portRaw = process.env.SMTP_PORT?.trim()
  const secure = parseBooleanEnv(process.env.SMTP_SECURE?.trim())
  const from = process.env.SMTP_FROM?.trim()

  if (!host || !portRaw || !from) return null

  const port = Number(portRaw)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid number.")
  }

  const user = process.env.SMTP_USER?.trim() || undefined
  const pass = process.env.SMTP_PASS?.trim() || undefined

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    forceIpv4: parseBooleanEnv(process.env.SMTP_FORCE_IPV4?.trim()),
    allowInternalNetworkInterfaces: parseBooleanEnv(
      process.env.SMTP_ALLOW_INTERNAL_NETWORK_INTERFACES?.trim()
    ),
  }
}

declare global {
  var __smtpTransporter: nodemailer.Transporter | undefined
  var __smtpTransporterKey: string | undefined
}

function getTransporter(config: SmtpConfig) {
  const key = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    from: config.from,
    forceIpv4: config.forceIpv4,
    allowInternalNetworkInterfaces: config.allowInternalNetworkInterfaces,
  })

  if (global.__smtpTransporter && global.__smtpTransporterKey === key) {
    return global.__smtpTransporter
  }

  type ExtendedSmtpTransportOptions = SMTPTransport.Options & {
    family?: 4 | 6
    allowInternalNetworkInterfaces?: boolean
    disableFileAccess?: boolean
    disableUrlAccess?: boolean
  }

  const transportOptions: ExtendedSmtpTransportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user && config.pass
        ? {
            user: config.user,
            pass: config.pass,
          }
        : undefined,
    family: config.forceIpv4 ? 4 : undefined,
    allowInternalNetworkInterfaces: config.allowInternalNetworkInterfaces,
    disableFileAccess: true,
    disableUrlAccess: true,
  }

  const transporter = nodemailer.createTransport(transportOptions)

  global.__smtpTransporter = transporter
  global.__smtpTransporterKey = key
  return transporter
}

export async function sendHtmlMail(
  input: SendHtmlMailInput
): Promise<SendHtmlMailResult> {
  const config = readSmtpConfigFromEnv()
  if (!config) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, and SMTP_FROM (and optionally SMTP_USER/SMTP_PASS)."
    )
  }

  if (!input.to.length) {
    throw new Error("Email recipients are required.")
  }

  const transporter = getTransporter(config)
  const info = await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    inReplyTo: input.inReplyTo,
    references: input.references,
  })

  return {
    messageId: info.messageId,
  }
}
