import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            <span className="text-xl font-bold text-blue-900">Mãos Amigas</span>
          </div>
          <div className="flex gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              Entrar
            </Link>
            <a 
              href="#contato" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Fale Conosco
            </a>
          </div>
        </nav>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Cuidado Humanizado para Quem Você Ama
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Conectamos famílias a cuidadores qualificados para atendimento domiciliar 
              e acompanhamento hospitalar. Profissionais verificados, atendimento 24 horas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://wa.me/5511999999999?text=Olá" 
                className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"
              >
                <span>📱</span> Falar pelo WhatsApp
              </a>
              <a 
                href="#servicos" 
                className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-lg"
              >
                Conhecer Serviços
              </a>
            </div>
          </div>
        </section>

        <section id="servicos" className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Nossos Serviços
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-blue-50 p-8 rounded-xl">
                <div className="text-4xl mb-4">🏠</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Home Care</h3>
                <p className="text-gray-600">
                  Cuidado domiciliar personalizado com profissionais qualificados. 
                  Acompanhamento de idosos, pós-operatório e pacientes crônicos.
                </p>
              </div>
              <div className="bg-green-50 p-8 rounded-xl">
                <div className="text-4xl mb-4">🏥</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Acompanhamento Hospitalar</h3>
                <p className="text-gray-600">
                  Profissionais para acompanhar seu familiar durante internações. 
                  Plantões diurnos e noturnos com relatórios diários.
                </p>
              </div>
              <div className="bg-purple-50 p-8 rounded-xl">
                <div className="text-4xl mb-4">👩‍⚕️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Equipe Especializada</h3>
                <p className="text-gray-600">
                  Cuidadores, técnicos e auxiliares de enfermagem. 
                  Todos verificados, treinados e com experiência comprovada.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-blue-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">500+</div>
                <div className="text-blue-200">Famílias Atendidas</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">200+</div>
                <div className="text-blue-200">Profissionais Cadastrados</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">24h</div>
                <div className="text-blue-200">Atendimento</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">98%</div>
                <div className="text-blue-200">Satisfação</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Como Funciona
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="font-bold text-gray-900 mb-2">Entre em Contato</h3>
                <p className="text-gray-600 text-sm">Fale conosco pelo WhatsApp ou telefone</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="font-bold text-gray-900 mb-2">Avaliação</h3>
                <p className="text-gray-600 text-sm">Nossa equipe avalia as necessidades do paciente</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="font-bold text-gray-900 mb-2">Orçamento</h3>
                <p className="text-gray-600 text-sm">Receba um orçamento personalizado</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
                <h3 className="font-bold text-gray-900 mb-2">Início do Cuidado</h3>
                <p className="text-gray-600 text-sm">Profissional selecionado inicia o atendimento</p>
              </div>
            </div>
          </div>
        </section>

        <section id="contato" className="py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Precisa de Ajuda?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Nossa equipe está pronta para atender você. Entre em contato agora mesmo!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://wa.me/5511999999999?text=Olá,%20preciso%20de%20informações%20sobre%20cuidadores" 
                className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg flex items-center justify-center gap-2"
              >
                <span>📱</span> WhatsApp
              </a>
              <a 
                href="tel:08001234567" 
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg flex items-center justify-center gap-2"
              >
                <span>📞</span> 0800 123 4567
              </a>
            </div>
          </div>
        </section>

        <section className="py-12 bg-white border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              É Profissional de Saúde?
            </h3>
            <p className="text-gray-600 mb-4">
              Cadastre-se e faça parte da nossa equipe de cuidadores
            </p>
            <a 
              href="https://wa.me/5511999999999?text=Olá,%20sou%20profissional%20e%20quero%20me%20cadastrar" 
              className="inline-block px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              Quero me Cadastrar
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🤝</span>
                <span className="text-xl font-bold">Mãos Amigas</span>
              </div>
              <p className="text-gray-400">
                Cuidado humanizado para quem você ama. 
                Conectando famílias a profissionais qualificados desde 2020.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📞 0800 123 4567</li>
                <li>📱 (11) 99999-9999</li>
                <li>✉️ contato@maosamigas.com</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Horário de Atendimento</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Segunda a Sexta: 8h às 18h</li>
                <li>Sábado: 8h às 12h</li>
                <li>Emergências: 24 horas</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Mãos Amigas. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
