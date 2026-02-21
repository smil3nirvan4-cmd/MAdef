import Link from "next/link";
import { Heart, Shield, Clock, Users, Phone, ArrowRight, Star, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Heart className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Mãos Amigas</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <a
              href="#contato"
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              Fale Conosco
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-background to-secondary-50" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-200 px-4 py-1.5 mb-8">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                <span className="text-sm font-medium text-primary-700">Atendimento 24 horas</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
                Cuidado Humanizado para
                <span className="text-gradient block sm:inline"> Quem Voce Ama</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Conectamos familias a cuidadores qualificados para atendimento domiciliar
                e acompanhamento hospitalar. Profissionais verificados, atendimento 24 horas.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://wa.me/5511999999999?text=Ola"
                  className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 font-semibold text-lg shadow-md hover:shadow-lg transition-all"
                >
                  <Phone className="w-5 h-5" />
                  Falar pelo WhatsApp
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a
                  href="#servicos"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary-200 text-primary-700 rounded-xl hover:bg-primary-50 hover:border-primary-300 font-semibold text-lg transition-all"
                >
                  Conhecer Servicos
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Services ── */}
        <section id="servicos" className="py-24 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
                Nossos Servicos
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Solucoes completas de cuidado domiciliar com profissionais qualificados.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="group bg-background rounded-2xl p-8 border border-border hover:border-primary-200 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-info-50 flex items-center justify-center mb-6 group-hover:bg-info-100 transition-colors">
                  <Heart className="w-7 h-7 text-info-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Home Care</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cuidado domiciliar personalizado com profissionais qualificados.
                  Acompanhamento de idosos, pos-operatorio e pacientes cronicos.
                </p>
              </div>

              <div className="group bg-background rounded-2xl p-8 border border-border hover:border-secondary-200 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-secondary-50 flex items-center justify-center mb-6 group-hover:bg-secondary-100 transition-colors">
                  <Shield className="w-7 h-7 text-secondary-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Acompanhamento Hospitalar</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Profissionais para acompanhar seu familiar durante internacoes.
                  Plantoes diurnos e noturnos com relatorios diarios.
                </p>
              </div>

              <div className="group bg-background rounded-2xl p-8 border border-border hover:border-accent-200 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-accent-50 flex items-center justify-center mb-6 group-hover:bg-accent-100 transition-colors">
                  <Users className="w-7 h-7 text-accent-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Equipe Especializada</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Cuidadores, tecnicos e auxiliares de enfermagem.
                  Todos verificados, treinados e com experiencia comprovada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="py-20 bg-primary-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWNkgyVjRoMzR6TTIgMzRoMzR2Mkgydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl lg:text-5xl font-bold mb-2 tabular-nums">500+</div>
                <div className="text-primary-200 font-medium">Familias Atendidas</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-bold mb-2 tabular-nums">200+</div>
                <div className="text-primary-200 font-medium">Profissionais Cadastrados</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-bold mb-2 tabular-nums">24h</div>
                <div className="text-primary-200 font-medium">Atendimento</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-bold mb-2 tabular-nums">98%</div>
                <div className="text-primary-200 font-medium">Satisfacao</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
                Como Funciona
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Processo simples e rapido para iniciar o cuidado.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { step: 1, icon: Phone, title: "Entre em Contato", desc: "Fale conosco pelo WhatsApp ou telefone" },
                { step: 2, icon: CheckCircle, title: "Avaliacao", desc: "Nossa equipe avalia as necessidades do paciente" },
                { step: 3, icon: Star, title: "Orcamento", desc: "Receba um orcamento personalizado" },
                { step: 4, icon: Heart, title: "Inicio do Cuidado", desc: "Profissional selecionado inicia o atendimento" },
              ].map((item) => (
                <div key={item.step} className="text-center group">
                  <div className="relative mx-auto mb-5">
                    <div className="w-16 h-16 bg-primary-50 border-2 border-primary-200 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary-100 group-hover:border-primary-300 transition-all">
                      <item.icon className="w-7 h-7 text-primary-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section id="contato" className="py-24 bg-card border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
              Precisa de Ajuda?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Nossa equipe esta pronta para atender voce. Entre em contato agora mesmo!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://wa.me/5511999999999?text=Ola,%20preciso%20de%20informacoes%20sobre%20cuidadores"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary-600 text-white rounded-xl hover:bg-secondary-700 font-semibold text-lg shadow-md hover:shadow-lg transition-all"
              >
                <Phone className="w-5 h-5" />
                WhatsApp
              </a>
              <a
                href="tel:08001234567"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover font-semibold text-lg shadow-md hover:shadow-lg transition-all"
              >
                <Clock className="w-5 h-5" />
                0800 123 4567
              </a>
            </div>
          </div>
        </section>

        {/* ── Professionals CTA ── */}
        <section className="py-16 bg-background border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-3">
              E Profissional de Saude?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Cadastre-se e faca parte da nossa equipe de cuidadores qualificados.
            </p>
            <a
              href="https://wa.me/5511999999999?text=Ola,%20sou%20profissional%20e%20quero%20me%20cadastrar"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-200 text-primary-700 rounded-xl hover:bg-primary-50 hover:border-primary-300 font-semibold transition-all"
            >
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
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">Maos Amigas</span>
              </div>
              <p className="text-navy-300 text-sm leading-relaxed">
                Cuidado humanizado para quem voce ama.
                Conectando familias a profissionais qualificados desde 2020.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-navy-400">Contato</h4>
              <ul className="space-y-3 text-navy-300 text-sm">
                <li>0800 123 4567</li>
                <li>(11) 99999-9999</li>
                <li>contato@maosamigas.com</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-navy-400">Horario de Atendimento</h4>
              <ul className="space-y-3 text-navy-300 text-sm">
                <li>Segunda a Sexta: 8h as 18h</li>
                <li>Sabado: 8h as 12h</li>
                <li>Emergencias: 24 horas</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-navy-800 mt-12 pt-8 text-center text-navy-400 text-sm">
            <p>&copy; {new Date().getFullYear()} Maos Amigas. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
