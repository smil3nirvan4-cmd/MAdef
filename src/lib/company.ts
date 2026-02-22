// ══════════════════════════════════════════════════════════════
// MÃOS AMIGAS — Company Data (Single Source of Truth)
// ══════════════════════════════════════════════════════════════

export const COMPANY = {
  name: "Mãos Amigas",
  legalName: "Mãos Amigas Cuidadores",
  tagline: "Cuidadores de Idosos em Toledo",
  description:
    "Cuidadores especializados em Toledo. Sem carência no contrato, profissionais qualificados 24h. Alzheimer, Parkinson, AVC e cuidados especiais.",
  cnpj: "52.724.250/0001-78",
  foundedYear: 2025,

  contact: {
    phone: "(45) 9 8825-0695",
    phoneRaw: "+5545988250695",
    whatsapp: "5545988250695",
    whatsappMessage:
      "Olá! Preciso de cuidadores profissionais em Toledo. Quero saber mais sobre os serviços!",
    email: "contato@maosamigas.com",
  },

  location: {
    city: "Toledo",
    state: "PR",
    country: "Brasil",
    displayAddress: "Toledo - PR",
    serviceArea: "Toledo e região",
  },

  social: {
    website: "https://maosamigas.com",
  },

  analytics: {
    googleAdsId: "AW-17704201737",
  },

  branding: {
    logo: "/logo.png",
    favicon: "/favicon.png",
    ogImage: "/logo.png",
  },
} as const;

export const SERVICES = [
  {
    icon: "Pill" as const,
    title: "Administrar medicamentos",
    description: "No horário correto",
  },
  {
    icon: "Utensils" as const,
    title: "Preparar refeições",
    description: "Nutritivas e saborosas",
  },
  {
    icon: "Baby" as const,
    title: "Higiene íntima",
    description: "Troca de fraldas com cuidado",
  },
  {
    icon: "Brain" as const,
    title: "Estímulos cognitivos",
    description: "Respeitando limites e necessidades",
  },
  {
    icon: "Bandage" as const,
    title: "Fazer curativos",
    description: "Prevenção de escaras",
  },
  {
    icon: "MapPin" as const,
    title: "Acompanhamentos",
    description: "Passeios, consultas e exames",
  },
  {
    icon: "Sparkles" as const,
    title: "Organização",
    description: "Manter ambiente limpo e organizado",
  },
  {
    icon: "Droplets" as const,
    title: "Banho assistido",
    description: "Banho de chuveiro com segurança",
  },
] as const;

export const CONDITIONS = [
  "Alzheimer",
  "Parkinson",
  "Demência",
  "AVC",
  "Problemas psiquiátricos (depressão, ansiedade, bipolaridade)",
  "Risco de quedas e dificuldade de locomoção",
  "Cadeirante ou acamado",
  "Fraturas",
  "Câncer",
  "Diabetes",
  "Pressão alta",
  "Cuidados paliativos",
] as const;

export const WHY_CHOOSE_US = [
  {
    icon: "CheckCircle" as const,
    title: "Sem Carência no Contrato",
    description:
      "Cancele a qualquer momento. Só queremos que esteja conosco se realmente estiver satisfeito.",
  },
  {
    icon: "Heart" as const,
    title: "Cuidado com Amor",
    description:
      "A felicidade de ver quem você ama sendo bem cuidado por profissionais confiáveis e competentes.",
  },
  {
    icon: "Shield" as const,
    title: "Segurança Jurídica",
    description:
      "Esteja protegido de todos os problemas trabalhistas. Nós cuidamos da gestão e dos riscos.",
  },
  {
    icon: "Clock" as const,
    title: "Mais Tempo Juntos",
    description:
      "Prolongue os bons momentos com quem ama enquanto deixamos a parte complexa conosco.",
  },
] as const;

export const FOOTER_SERVICES = [
  "Cuidadores 24h",
  "Cuidados especializados",
  "Acompanhamento médico",
  "Fisioterapia domiciliar",
  "Cuidados paliativos",
] as const;

export const SERVICE_CITIES = [
  "Toledo",
  "Cascavel",
  "Marechal Cândido Rondon",
  "Quatro Pontes",
] as const;

export function getWhatsAppUrl(message?: string) {
  const msg = message || COMPANY.contact.whatsappMessage;
  return `https://wa.me/${COMPANY.contact.whatsapp}?text=${encodeURIComponent(msg)}`;
}

export function getPhoneUrl() {
  return `tel:${COMPANY.contact.phoneRaw}`;
}
