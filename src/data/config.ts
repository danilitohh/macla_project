import type { PaymentMethod, ShippingOption } from "../types";

export const shippingOptions: ShippingOption[] = [
  {
    id: "medellin",
    label: "Envío Medellín",
    description:
      "Entrega en 1 a 3 días hábiles dentro del área metropolitana. Tarifa plana $15.000 COP.",
    price: 15000,
    regions: ["Medellín"],
  },
  {
    id: "nacional",
    label: "Envío nacional",
    description:
      "Cobertura nacional con transportadora aliada. Tiempo estimado de 2 a 7 días hábiles.",
    price: 25000,
    regions: ["Colombia"],
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: "contraentrega",
    label: "Contra-entrega",
    description:
      "Disponible en Medellín y municipios cercanos, paga al recibir.",
  },
  {
    id: "pasarela",
    label: "Pasarela de pago",
    description:
      "Pagos con tarjeta débito y crédito a través de plataforma aliada.",
  },
];

export const valueProposition = [
  "Garantía de funcionamiento de hasta 3 meses en herramientas de calor.",
  "Inventario rotativo según tendencias de belleza y temporada.",
  "Soporte para emprendedores: asesoría comercial y material digital.",
  "Atención ágil por WhatsApp, correo e Instagram.",
];

export const faqs = [
  {
    question: "¿Cuánto tardan los envíos?",
    answer:
      "Medellín y área metropolitana toman entre 1 y 3 días hábiles. En el resto del país, el tiempo estimado es de 2 a 5 días hábiles. En envíos internacionales el tiempo depende del destino.",
  },
  {
    question: "¿Qué métodos de pago puedo usar?",
    answer:
      "Disponemos de pago contra-entrega (según cobertura), transferencias bancarias, efectivo en Medellín y pasarela de pago para tarjetas.",
  },
  {
    question: "¿Los productos tienen garantía?",
    answer:
      "Planchas, secadoras y onduladoras cuentan con garantía de funcionamiento por 3 meses. Es importante conservar empaques y no exceder las recomendaciones de uso.",
  },
  {
    question: "¿Puedo comprar al por mayor?",
    answer:
      "Sí. Escríbenos por WhatsApp o correo para obtener precios especiales por volumen y disponibilidad de inventario.",
  },
];
