import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Shield,
  Clock,
  Users,
  Phone,
  ArrowRight,
  CheckCircle,
  MapPin,
  Mail,
  Pill,
  Brain,
  Droplets,
  Baby,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import {
  COMPANY,
  SERVICES,
  CONDITIONS,
  WHY_CHOOSE_US,
  FOOTER_SERVICES,
  getWhatsAppUrl,
  getPhoneUrl,
} from "@/lib/company";

const SERVICE_ICONS = {
  Pill,
  Utensils: Sparkles,
  Baby,
  Brain,
  Bandage: Shield,
  MapPin,
  Sparkles,
  Droplets,
} as const;

const WHY_ICONS = {
  CheckCircle,
  Heart,
  Shield,
  Clock,
} as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src={COMPANY.branding.logo}
              alt={`${COMPANY.name} - ${COMPANY.tagline}`}
              width={40}
              height={40}
              className="rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
            />
            <span className="text-lg font-bold text-foreground tracking-tight">
              {COMPANY.name}
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#quem-somos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Quem Somos
            </a>
            <a href="#servicos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Serviços
            </a>
            <a href="#diferenciais" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Diferenciais
            </a>
            <a href="#condicoes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Especialidades
            </a>
            <a href="#contato" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Contato
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 text-sm font-semibold shadow-sm hover:shadow-md transition-all inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWNkgyVjRoMzR6TTIgMzRoMzR2Mkgydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="text-center max-w-4xl mx-auto text-white">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 mb-8">
                <div className="w-2 h-2 rounded-full bg-secondary-400 animate-pulse" />
                <span className="text-sm font-medium opacity-90">Atendimento 24 horas</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Cuidadores Especializados
                <span className="block text-secondary-300"> em Toledo</span>
              </h1>

              <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-4 opacity-95 font-semibold leading-relaxed">
                Cuidadores profissionais certificados disponíveis 24h.
                Acompanhamento hospitalar e domiciliar com carinho e segurança.
              </p>

              <p className="text-base sm:text-lg mb-10 opacity-85 max-w-2xl mx-auto">
                Sem carência no contrato. Cancele quando quiser. Atendemos
                Alzheimer, Parkinson, AVC e cuidados especiais.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 font-bold text-lg shadow-lg hover:shadow-xl border-2 border-white/20 hover:border-white/40 transition-all hover:scale-105"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar no WhatsApp Agora
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href={getPhoneUrl()}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 border-2 border-white/20 hover:border-white/40 font-semibold text-lg transition-all"
                >
                  <Phone className="w-5 h-5" />
                  Ligar: {COMPANY.contact.phone}
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/15 transition-all">
                  <h3 className="text-2xl font-bold mb-2">24h</h3>
                  <p className="opacity-90">Disponibilidade</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/15 transition-all">
                  <h3 className="text-2xl font-bold mb-2">100%</h3>
                  <p className="opacity-90">Profissionais Qualificados</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/15 transition-all">
                  <h3 className="text-2xl font-bold mb-2">Toledo</h3>
                  <p className="opacity-90">Atendimento Local</p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                  <span className="opacity-90">
                    CNPJ: {COMPANY.cnpj}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quem Somos ── */}
        <section id="quem-somos" className="py-20 lg:py-28 bg-gradient-to-br from-background to-secondary-50/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-12 lg:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
                Quem Somos
              </h2>
              <p className="text-lg text-muted-foreground">
                Cuidados profissionais no conforto do seu lar
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
                  Oferecemos cuidadores profissionais especializados, com foco principal
                  em cuidados de idosos. Proporcionamos o privilégio de envelhecer em
                  casa com carinho e segurança, além de atender outras necessidades de
                  cuidados domiciliares. Também oferecemos suporte em consultas e exames.
                </p>
                <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
                  Priorizamos segurança e confiabilidade com processo seletivo rigoroso
                  e atendimento personalizado. Oferecemos visita de enfermagem gratuita
                  para conhecer o paciente e alinhar expectativas.
                </p>
                <p className="text-base lg:text-lg text-foreground font-semibold">
                  Solicite um orçamento e conheça nossos cuidadores qualificados.
                  Especializados em idosos, também atendemos outras necessidades de
                  cuidados domiciliares, consultas e exames.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl p-6 shadow-sm text-center hover:shadow-md transition-all border border-border">
                  <Heart className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Cuidado</h3>
                  <p className="text-sm text-muted-foreground">Profissional e humanizado</p>
                </div>
                <div className="bg-card rounded-xl p-6 shadow-sm text-center hover:shadow-md transition-all border border-border">
                  <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Segurança</h3>
                  <p className="text-sm text-muted-foreground">Processo seletivo rigoroso</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Serviços Detalhados ── */}
        <section id="servicos" className="py-20 lg:py-28 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-6">
                Você já imaginou ter um cuidador profissional para te ajudar com:
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Especializados em cuidados de idosos, também atendemos outras
                necessidades com apoio domiciliar e suporte em consultas e exames
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {SERVICES.map((service, i) => {
                const IconComponent =
                  SERVICE_ICONS[service.icon as keyof typeof SERVICE_ICONS] || Heart;
                return (
                  <div
                    key={i}
                    className="bg-background rounded-2xl border border-border hover:border-primary-200 hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <div className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:gap-4 gap-2">
                        <div className="flex-shrink-0 bg-primary-50 p-2 md:p-3 rounded-lg self-center md:self-start">
                          <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                        </div>
                        <div className="text-center md:text-left">
                          <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base">
                            {service.title}
                          </h3>
                          <p className="text-muted-foreground text-xs md:text-sm">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Por que nos escolher ── */}
        <section id="diferenciais" className="py-20 lg:py-28 bg-gradient-to-br from-primary-50/50 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-6">
                Por que escolher a{" "}
                <span className="text-primary">{COMPANY.name}</span> para
                cuidar de idosos?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Oferecemos flexibilidade total no contrato e cuidado humanizado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {WHY_CHOOSE_US.map((item, i) => {
                const IconComponent =
                  WHY_ICONS[item.icon as keyof typeof WHY_ICONS] || Heart;
                return (
                  <div
                    key={i}
                    className="bg-card rounded-2xl border border-border hover:border-primary-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                  >
                    <div className="p-8 text-center">
                      <div className="flex justify-center mb-4">
                        <IconComponent className="h-8 w-8 text-secondary-600" />
                      </div>
                      <h3 className="text-xl font-semibold mb-4 text-foreground">
                        {item.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-16">
              <div className="bg-primary-50 border border-primary-200 rounded-2xl p-8 max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-primary">
                  A {COMPANY.name} quer cuidar dos seus idosos com excelência
                </h3>
                <p className="text-lg text-foreground">
                  Tranquilidade para sua família: atendimento em Toledo, em casa e
                  no hospital
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Condições Atendidas ── */}
        <section id="condicoes" className="py-20 lg:py-28 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-foreground tracking-tight">
                Cuidadores especializados, com foco em idosos, atuando com
                <span className="text-primary"> discrição, competência e respeito</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Nossos cuidadores são especializados principalmente em idosos,
                mas também atendemos outras necessidades de cuidados. Oferecemos
                suporte em consultas e exames. Veja algumas condições que assistimos:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto">
              {CONDITIONS.map((condition, i) => (
                <div
                  key={i}
                  className="bg-background rounded-xl border border-border hover:border-primary-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                >
                  <div className="p-4 md:p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-secondary-500 rounded-full flex-shrink-0" />
                      <span className="text-foreground font-medium">{condition}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <div className="bg-secondary-50 border border-secondary-200 rounded-2xl p-8 max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold mb-4 text-secondary-700">
                  Cuidadores profissionais em Toledo
                </h3>
                <p className="text-lg text-foreground">
                  Nossa equipe é especializada em cuidados de idosos e também
                  está preparada para atender outras necessidades, com
                  acompanhamento em consultas e exames, sempre com
                  profissionalismo e carinho
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Principal ── */}
        <section
          id="contato"
          className="py-20 lg:py-28 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Seu Familiar Merece o Melhor Cuidado
              </h2>
              <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto mb-4">
                <strong>Agende agora</strong> e tenha cuidadores profissionais em
                Toledo com suporte completo em consultas, exames e atenção
                domiciliar 24h
              </p>
              <p className="text-lg md:text-xl font-bold opacity-95">
                Atendimento Rápido &bull; Sem Carência &bull; Cancele Quando Quiser
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <a
                href={getPhoneUrl()}
                className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-white text-primary-800 rounded-xl hover:bg-white/90 hover:scale-105 shadow-xl hover:shadow-2xl transition-all font-bold text-lg"
              >
                <Phone className="h-6 w-6" />
                Ligar Agora: {COMPANY.contact.phone}
              </a>
              <a
                href={getWhatsAppUrl(
                  "Olá! Preciso de cuidadores especializados e quero um atendimento personalizado"
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 border-2 border-white/30 hover:border-white/50 shadow-xl hover:shadow-2xl hover:scale-105 transition-all font-bold text-lg"
              >
                <MessageCircle className="h-6 w-6" />
                Atendimento WhatsApp
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-white" />
                <h3 className="text-xl font-bold mb-2">Localização</h3>
                <p className="opacity-90">
                  Atendemos toda Toledo e região
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-white" />
                <h3 className="text-xl font-bold mb-2">Horário</h3>
                <p className="opacity-90">
                  Disponível 24h para emergências
                </p>
              </div>
            </div>

            <div className="text-center mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 inline-block">
                <p className="text-xl font-bold mb-2">
                  Resposta em Minutos &bull; Cuidadores Certificados &bull; Atendimento Humanizado
                </p>
                <p className="text-lg opacity-95">
                  <strong>Sem burocracia</strong> &bull;{" "}
                  <strong>Flexibilidade total</strong> &bull;{" "}
                  <strong>Confiança garantida</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Profissionais CTA ── */}
        <section className="py-16 bg-background border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-3">
              É Profissional de Saúde?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Cadastre-se e faça parte da nossa equipe de cuidadores qualificados.
            </p>
            <a
              href={getWhatsAppUrl(
                "Olá, sou profissional de saúde e quero me cadastrar como cuidador"
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-200 text-primary-700 rounded-xl hover:bg-primary-50 hover:border-primary-300 font-semibold transition-all"
            >
              <Users className="w-4 h-4" />
              Quero me Cadastrar
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-navy-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Image
                  src={COMPANY.branding.logo}
                  alt={COMPANY.name}
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-lg font-bold">{COMPANY.name}</span>
              </div>
              <p className="text-navy-300 text-sm leading-relaxed mb-4">
                Cuidado profissional e humanizado para idosos em Toledo. Nossa
                missão é proporcionar tranquilidade às famílias através de
                cuidadores qualificados.
              </p>
              <div className="bg-primary-900/50 rounded-md p-2">
                <span className="text-white font-semibold text-sm">
                  Empresa Registrada - CNPJ: {COMPANY.cnpj}
                </span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-navy-400">
                Contato
              </h4>
              <ul className="space-y-3 text-navy-300 text-sm">
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-secondary-400 flex-shrink-0" />
                  <a href={getPhoneUrl()} className="hover:text-white transition-colors">
                    {COMPANY.contact.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-secondary-400 flex-shrink-0" />
                  <a
                    href={`mailto:${COMPANY.contact.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {COMPANY.contact.email}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-secondary-400 flex-shrink-0" />
                  <span>{COMPANY.location.displayAddress}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-navy-400">
                Nossos Serviços
              </h4>
              <ul className="space-y-2 text-navy-300 text-sm">
                {FOOTER_SERVICES.map((service) => (
                  <li key={service} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-secondary-400 rounded-full" />
                    {service}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-navy-800 mt-12 pt-8 text-center text-navy-400 text-sm">
            <p>
              &copy; {new Date().getFullYear()} {COMPANY.name} - Cuidadores de
              Idosos. Todos os direitos reservados.
            </p>
            <p className="mt-2">
              Desenvolvido com cuidado para famílias de Toledo
            </p>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp FAB ── */}
      <a
        href={getWhatsAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-secondary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-secondary-700 hover:scale-110 transition-all"
        aria-label="Falar pelo WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
}
