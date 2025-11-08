const nodemailer = require('nodemailer')
const twilio = require('twilio')

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_SECURE = 'false',
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_FROM,
  SMTP_IGNORE_TLS = 'false',
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM_NUMBER
} = process.env

let mailTransport
let smsClient

const getMailTransport = () => {
  if (mailTransport) {
    return mailTransport
  }
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    return null
  }
  mailTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    ignoreTLS: SMTP_IGNORE_TLS === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD
    }
  })
  return mailTransport
}

const getSmsClient = () => {
  if (smsClient) {
    return smsClient
  }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return null
  }
  smsClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  return smsClient
}

const buildMessage = ({ type, code, token }) => {
  const isActivation = type === 'activation'
  const title = isActivation ? 'Activa tu cuenta en MACLA' : 'Recupera tu contraseña en MACLA'
  const intro = isActivation
    ? 'Usa este código para confirmar tu registro:'
    : 'Usa este código para restablecer tu contraseña:'
  const action = isActivation
    ? 'Ingresa a la sección "Activa tu cuenta" y digita el código para finalizar tu registro.'
    : 'Ingresa el código en la sección "Recuperar acceso" y define una nueva contraseña.'
  const textLines = [
    title,
    intro,
    code,
    action,
    token ? `Enlace alterno: ${token}` : null,
    'Si no solicitaste este código, ignora este mensaje.'
  ].filter(Boolean)

  const text = textLines.join('\n\n')
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111">
      <h2>${title}</h2>
      <p>${intro}</p>
      <p style="font-size: 1.5rem; letter-spacing: 3px;"><strong>${code}</strong></p>
      <p>${action}</p>
      ${
        token
          ? `<p>Si prefieres, copia y pega este enlace o token alterno: <code>${token}</code></p>`
          : ''
      }
      <p style="font-size: 0.9rem; color: #555;">Si no solicitaste este mensaje, simplemente ignóralo.</p>
    </div>
  `

  return { subject: title, text, html }
}

const sendEmail = async ({ to, subject, text, html }) => {
  const transport = getMailTransport()
  if (!transport || !to) {
    return false
  }
  await transport.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to,
    subject,
    text,
    html
  })
  return true
}

const sendSms = async ({ to, body }) => {
  const client = getSmsClient()
  if (!client || !to) {
    return false
  }
  await client.messages.create({
    to,
    from: TWILIO_FROM_NUMBER,
    body
  })
  return true
}

const sendVerificationNotification = async ({ type, code, token, email, phone, channel }) => {
  const message = buildMessage({ type, code, token })
  const deliveries = {
    email: false,
    sms: false
  }

  try {
    if (email) {
      deliveries.email = await sendEmail({
        to: email,
        subject: message.subject,
        text: message.text,
        html: message.html
      })
    }
  } catch (error) {
    console.error('[notifications] Error enviando correo:', error)
  }

  if ((channel === 'sms' || !deliveries.email) && phone) {
    try {
      deliveries.sms = await sendSms({
        to: phone,
        body: `${message.subject}\nCódigo: ${code}\n${channel === 'sms' ? '' : 'También te enviamos un correo con más detalles.'}`
      })
    } catch (error) {
      console.error('[notifications] Error enviando SMS:', error)
    }
  }

  if (!deliveries.email && !deliveries.sms) {
    console.warn('[notifications] No se enviaron notificaciones. Revisa la configuración SMTP/Twilio.')
  }

  return deliveries
}

module.exports = {
  sendVerificationNotification
}
