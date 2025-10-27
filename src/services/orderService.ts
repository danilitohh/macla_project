import type { OrderPayload } from '../types'

const webhookUrl = import.meta.env.VITE_ORDER_WEBHOOK_URL

export const submitOrder = async (payload: OrderPayload) => {
  if (!webhookUrl) {
    console.info('VITE_ORDER_WEBHOOK_URL no configurado. Pedido en consola:', payload)
    return { ok: true, fallback: true }
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Error al enviar pedido: ${response.status}`)
  }

  return response.json().catch(() => ({ ok: true }))
}
