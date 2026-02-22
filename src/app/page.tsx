import Link from "next/link";
import {
  Heart, Shield, Clock, Users, Phone, MessageCircle,
  Star, CheckCircle, ArrowRight, Home, Stethoscope,
  UserCheck, ClipboardCheck, FileText, Handshake,
  MapPin, Mail, ChevronDown,
} from "lucide-react";

function NavBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-navy-900 tracking-tight">Maos Amigas</span>
            <span className="hidden sm:block text-[10px] text-muted-foreground -mt-1 tracking-wide uppercase">Home Care</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-navy-700">
          <a href="#servicos" className="hover:text-primary transition-colors">Servicos</a>
          <a href="#como-funciona" className="hover:text-primary transition-colors">Como Funciona</a>
          <a href="#diferenciais" className="hover:text-primary transition-colors">Diferenciais</a>
          <a href="#depoimentos" className="hover:text-primary transition-colors">Depoimentos</a>
          <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-navy-700 hover:text-primary transition-colors hidden sm:block"
          >
            Entrar
          </Link>
          <a
            href="#contato"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover text-sm font-semibold shadow-sm transition-all"
          >
            Fale Conosco
          </a>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-100/40 to-transparent" />

      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-primary-100/30 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-secondary-50/50 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100/60 text-primary-800 text-xs font-semibold mb-6 border border-primary-200/40">
              <Heart className="h-3.5 w-3.5" />
              Cuidado Profissional e Humanizado
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-navy-900 leading-tight tracking-tight">
              Cuidado que Faz a{" "}
              <span className="text-primary">Diferenca</span>{" "}
              na Vida de Quem Voce Ama
            </h1>

            <p className="mt-6 text-lg text-navy-600 leading-relaxed max-w-xl">
              Conectamos familias a cuidadores qualificados para atendimento domiciliar
              e acompanhamento hospitalar. Profissionais verificados, treinados e
              supervisionados. Atendimento 24 horas.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#contato"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 font-semibold text-base shadow-md hover:shadow-lg transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                Falar pelo WhatsApp
              </a>
              <a
                href="#servicos"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border-2 border-navy-200 text-navy-700 rounded-xl hover:bg-navy-50 font-semibold text-base transition-all"
              >
                Conhecer Servicos
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex items-center gap-6 text-sm text-navy-500">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                <span>Profissionais verificados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                <span>Atendimento 24h</span>
              </div>
            </div>
          </div>

          {/* Right: Stats cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary-700" />
              </div>
              <p className="text-3xl font-bold text-navy-900">500+</p>
              <p className="text-sm text-navy-500 mt-1">Familias Atendidas</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-100 hover:shadow-xl transition-shadow mt-8">
              <div className="w-12 h-12 bg-secondary-50 rounded-xl flex items-center justify-center mb-4">
                <UserCheck className="h-6 w-6 text-secondary-700" />
              </div>
              <p className="text-3xl font-bold text-navy-900">200+</p>
              <p className="text-sm text-navy-500 mt-1">Profissionais Cadastrados</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-info-50 rounded-xl flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-info-600" />
              </div>
              <p className="text-3xl font-bold text-navy-900">24h</p>
              <p className="text-sm text-navy-500 mt-1">Atendimento Ininterrupto</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-neutral-100 hover:shadow-xl transition-shadow mt-8">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-warning-600" />
              </div>
              <p className="text-3xl font-bold text-navy-900">98%</p>
              <p className="text-sm text-navy-500 mt-1">Satisfacao dos Clientes</p>
            </div>
          </div>
        </div>

        {/* Mobile stats strip */}
        <div className="grid grid-cols-4 gap-3 mt-12 lg:hidden">
          {[
            { value: "500+", label: "Familias" },
            { value: "200+", label: "Profissionais" },
            { value: "24h", label: "Atendimento" },
            { value: "98%", label: "Satisfacao" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/80 rounded-xl p-3 text-center border border-neutral-100 shadow-sm">
              <p className="text-xl font-bold text-navy-900">{stat.value}</p>
              <p className="text-[11px] text-navy-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-12">
          <a href="#servicos" className="animate-bounce text-navy-300 hover:text-primary transition-colors">
            <ChevronDown className="h-6 w-6" />
          </a>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  {
    icon: Home,
    title: "Home Care",
    description: "Cuidado domiciliar personalizado com profissionais qualificados. Acompanhamento de idosos, pos-operatorio e pacientes cronicos.",
    color: "bg-primary-100 text-primary-700",
    border: "border-primary-100",
  },
  {
    icon: Stethoscope,
    title: "Acompanhamento Hospitalar",
    description: "Profissionais para acompanhar seu familiar durante internacoes. Plantoes diurnos e noturnos com relatorios diarios.",
    color: "bg-secondary-50 text-secondary-700",
    border: "border-secondary-50",
  },
  {
    icon: UserCheck,
    title: "Equipe Especializada",
    description: "Cuidadores, tecnicos e auxiliares de enfermagem. Todos verificados, treinados e com experiencia comprovada.",
    color: "bg-info-50 text-info-600",
    border: "border-info-50",
  },
];

function ServicesSection() {
  return (
    <section id="servicos" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Nossos Servicos</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            Solucoes Completas em Cuidado
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            Oferecemos atendimento personalizado para cada necessidade, com profissionais
            qualificados e supervisionados.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className={`group relative rounded-2xl border ${service.border} bg-white p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              <div className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-5`}>
                <service.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-navy-900 mb-3">{service.title}</h3>
              <p className="text-navy-500 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: MessageCircle,
    title: "Entre em Contato",
    description: "Fale conosco pelo WhatsApp ou telefone. Nossa equipe esta pronta para ouvir voce.",
  },
  {
    icon: ClipboardCheck,
    title: "Avaliacao",
    description: "Nossa equipe avalia as necessidades do paciente com escalas clinicas validadas.",
  },
  {
    icon: FileText,
    title: "Orcamento",
    description: "Receba uma proposta personalizada com cenarios e valores transparentes.",
  },
  {
    icon: Handshake,
    title: "Inicio do Cuidado",
    description: "Profissional selecionado e alocado inicia o atendimento na data combinada.",
  },
];

function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Como Funciona</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            Processo Simples e Transparente
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            Do primeiro contato ao inicio do cuidado, acompanhamos cada etapa com atencao e profissionalismo.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {STEPS.map((step, index) => (
            <div key={step.title} className="relative text-center group">
              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary-200 to-primary-100" />
              )}

              <div className="relative z-10 w-20 h-20 bg-white border-2 border-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm group-hover:border-primary-400 group-hover:shadow-md transition-all">
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <step.icon className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="font-bold text-navy-900 mb-2 text-lg">{step.title}</h3>
              <p className="text-sm text-navy-500 leading-relaxed max-w-[220px] mx-auto">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const DIFFERENTIALS = [
  {
    icon: Shield,
    title: "Profissionais Verificados",
    description: "Todos os cuidadores passam por triagem rigorosa, verificacao de antecedentes e entrevista presencial.",
  },
  {
    icon: Clock,
    title: "Disponibilidade 24h",
    description: "Atendimento ininterrupto com plantoes diurnos e noturnos, incluindo finais de semana e feriados.",
  },
  {
    icon: Star,
    title: "Avaliacao Clinica",
    description: "Utilizamos escalas validadas (KATZ, Lawton, ABEMID) para dimensionar o cuidado ideal.",
  },
  {
    icon: FileText,
    title: "Proposta Transparente",
    description: "Orcamento detalhado com cenarios comparativos. Sem surpresas, sem taxas ocultas.",
  },
  {
    icon: Stethoscope,
    title: "Supervisao Continua",
    description: "Acompanhamento constante da qualidade do servico com relatorios e feedback.",
  },
  {
    icon: Heart,
    title: "Cuidado Humanizado",
    description: "Cada paciente e unico. Personalizamos o atendimento para garantir conforto e dignidade.",
  },
];

function DifferentialsSection() {
  return (
    <section id="diferenciais" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Diferenciais</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
            Por que Escolher a Maos Amigas?
          </h2>
          <p className="mt-4 text-lg text-navy-500">
            Compromisso com excelencia em cada detalhe do cuidado.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DIFFERENTIALS.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-6 rounded-xl bg-neutral-50 hover:bg-primary-50/40 border border-transparent hover:border-primary-100 transition-all duration-300"
            >
              <div className="w-11 h-11 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <item.icon className="h-5 w-5 text-primary-700" />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 mb-1">{item.title}</h3>
                <p className="text-sm text-navy-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  {
    name: "Maria S.",
    role: "Filha de paciente",
    text: "A Maos Amigas transformou a qualidade de vida do meu pai. Os cuidadores sao atenciosos e profissionais. Nao tenho palavras para agradecer.",
    stars: 5,
  },
  {
    name: "Carlos R.",
    role: "Familiar de paciente",
    text: "Desde o primeiro contato ate a alocacao do profissional, tudo foi rapido e transparente. O orcamento detalhou cada centavo. Recomendo!",
    stars: 5,
  },
  {
    name: "Ana L.",
    role: "Responsavel por paciente",
    text: "Minha mae precisava de acompanhamento hospitalar e a equipe foi excepcional. Relatorios diarios e muita dedicacao.",
    stars: 5,
  },
];

function TestimonialsSection() {
  return (
    <section id="depoimentos" className="py-20 bg-navy-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-primary-300 uppercase tracking-wider">Depoimentos</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            O que Dizem Nossos Clientes
          </h2>
          <p className="mt-4 text-lg text-navy-300">
            A confianca das familias e nosso maior reconhecimento.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-2xl p-7 hover:bg-navy-800/80 transition-all"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.stars }).map((_, i) => (
                  <Star key={`star-${testimonial.name}-${i}`} className="h-4 w-4 text-warning-500 fill-warning-500" />
                ))}
              </div>
              <p className="text-navy-100 leading-relaxed mb-5">&ldquo;{testimonial.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-700/30 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-300">{testimonial.name[0]}</span>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{testimonial.name}</p>
                  <p className="text-xs text-navy-400">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section id="contato" className="py-20 bg-gradient-to-br from-primary-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Heart className="h-8 w-8 text-primary-700" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight">
          Precisa de Ajuda?
        </h2>
        <p className="mt-4 text-lg text-navy-500 max-w-2xl mx-auto">
          Nossa equipe esta pronta para atender voce. Entre em contato agora mesmo
          e receba uma avaliacao sem compromisso.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/5511999999999?text=Ola,%20preciso%20de%20informacoes%20sobre%20cuidadores"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </a>
          <a
            href="tel:08001234567"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl hover:bg-primary-hover font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Phone className="h-5 w-5" />
            0800 123 4567
          </a>
        </div>
      </div>
    </section>
  );
}

function ProfessionalCTA() {
  return (
    <section className="py-14 bg-white border-t border-neutral-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-navy-50 rounded-2xl p-8 border border-navy-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-6 w-6 text-primary-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-navy-900">E Profissional de Saude?</h3>
              <p className="text-sm text-navy-500">Cadastre-se e faca parte da nossa equipe de cuidadores</p>
            </div>
          </div>
          <a
            href="https://wa.me/5511999999999?text=Ola,%20sou%20profissional%20e%20quero%20me%20cadastrar"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-xl hover:bg-primary hover:text-white font-semibold transition-all whitespace-nowrap"
          >
            Quero me Cadastrar
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
                <Heart className="h-5 w-5 text-primary-300" />
              </div>
              <span className="text-lg font-bold tracking-tight">Maos Amigas</span>
            </div>
            <p className="text-sm text-navy-400 leading-relaxed">
              Cuidado humanizado para quem voce ama.
              Conectando familias a profissionais qualificados.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-navy-300 mb-4">Navegacao</h4>
            <ul className="space-y-2.5 text-sm text-navy-400">
              <li><a href="#servicos" className="hover:text-white transition-colors">Servicos</a></li>
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Como Funciona</a></li>
              <li><a href="#diferenciais" className="hover:text-white transition-colors">Diferenciais</a></li>
              <li><a href="#depoimentos" className="hover:text-white transition-colors">Depoimentos</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-navy-300 mb-4">Contato</h4>
            <ul className="space-y-2.5 text-sm text-navy-400">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-navy-500" />
                0800 123 4567
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-navy-500" />
                (11) 99999-9999
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-navy-500" />
                contato@maosamigas.com
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-navy-500" />
                Sao Paulo, SP
              </li>
            </ul>
          </div>

          {/* Schedule */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-navy-300 mb-4">Atendimento</h4>
            <ul className="space-y-2.5 text-sm text-navy-400">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-navy-500" />
                Seg-Sex: 8h as 18h
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-navy-500" />
                Sabado: 8h as 12h
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-secondary-500" />
                Emergencias: 24 horas
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-navy-500">
            &copy; {currentYear} Maos Amigas. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-navy-500">
            <Link href="/login" className="hover:text-white transition-colors">
              Area Administrativa
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main>
        <HeroSection />
        <ServicesSection />
        <HowItWorksSection />
        <DifferentialsSection />
        <TestimonialsSection />
        <CTASection />
        <ProfessionalCTA />
      </main>
      <Footer />
    </div>
  );
}
