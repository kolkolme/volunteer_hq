import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Heart, Users, Calendar, Zap, ArrowRight, Sparkles, Shield, TrendingUp } from 'lucide-react'

const Home = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()

  // Если пользователь авторизован и пришел со страницы логина, редирект на dashboard
  if (isAuthenticated && location.state?.from?.pathname !== location.pathname) {
    return null // Layout будет обработана редирект
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="glass-panel sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Volunteer HQ
            </h1>
            <div className="flex gap-3">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="btn-ios-secondary px-6 py-2 rounded-2xl text-sm transition-all"
                  >
                    Вход
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="btn-ios px-6 py-2 rounded-2xl text-sm transition-all"
                  >
                    Регистрация
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-ios px-6 py-2 rounded-2xl text-sm transition-all flex items-center gap-2"
                >
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Heart className="h-8 w-8 text-pink-500" />
            <h2 className="text-5xl sm:text-6xl font-bold">
              Добро пожаловать в{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Volunteer HQ
              </span>
            </h2>
          </div>
          <p className="text-xl opacity-80 mt-4 max-w-2xl mx-auto">
            Платформа для организации волонтёрской деятельности и координации мероприятий по всему городу
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            {
              icon: Users,
              title: 'Сообщество',
              description: 'Присоединяйтесь к тысячам активных волонтёров'
            },
            {
              icon: Calendar,
              title: 'Мероприятия',
              description: 'Найдите и участвуйте в интересных проектах'
            },
            {
              icon: TrendingUp,
              title: 'Статистика',
              description: 'Отслеживайте свой вклад и прогресс'
            },
            {
              icon: Zap,
              title: 'Координация',
              description: 'Управляйте волонтёрами и мероприятиями'
            }
          ].map((feature, i) => (
            <div
              key={i}
              className="glass-panel rounded-2xl p-6 border border-white border-opacity-30 hover:border-opacity-50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="p-3 rounded-xl w-fit mb-4 bg-gradient-to-br from-purple-500 to-pink-500 bg-opacity-20">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="opacity-70 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="glass-panel rounded-3xl p-8 lg:p-12 border border-white border-opacity-30 mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="h-6 w-6" />
            <h3 className="text-3xl font-bold">Как это работает</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Зарегистрируйтесь',
                description: 'Создайте аккаунт и выберите вашу роль: волонтёр или координатор'
              },
              {
                step: '2',
                title: 'Найдите мероприятие',
                description: 'Просмотрите доступные волонтёрские мероприятия в вашем городе'
              },
              {
                step: '3',
                title: 'Участвуйте',
                description: 'Присоединитесь к проекту и внесите свой вклад в развитие сообщества'
              }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  {item.step}
                </div>
                <h4 className="text-lg font-semibold mb-2">{item.title}</h4>
                <p className="opacity-70">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-6 mb-16">
          <h3 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            Преимущества платформы
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              '✅ Полная управление волонтёрскими проектами',
              '✅ Удобная система назначения волонтёров',
              '✅ Отслеживание посещаемости и статистики',
              '✅ Рейтинговая система волонтёров',
              '✅ Уведомления о новых мероприятиях',
              '✅ Интеграция с городской координацией'
            ].map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 glass-panel rounded-xl p-4 border border-white border-opacity-30">
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-panel rounded-3xl p-8 lg:p-12 border border-white border-opacity-30 text-center bg-gradient-to-r from-purple-500 from-opacity-10 to-pink-500 to-opacity-10">
          <h2 className="text-3xl font-bold mb-4">Готовы начать?</h2>
          <p className="text-lg opacity-80 mb-8 max-w-2xl mx-auto">
            Присоединитесь к нашей растущей сообщества волонтёров и помогайте делать мир лучше
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-ios px-8 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                Перейти в Dashboard
                <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-ios px-8 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                >
                  Зарегистрироваться
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-ios-secondary px-8 py-3 rounded-2xl font-semibold"
                >
                  Уже есть аккаунт?
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-panel mt-24 border-t border-white border-opacity-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-3">Volunteer HQ</h4>
              <p className="opacity-70 text-sm">Платформа для волонтёрской деятельности</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Ссылки</h4>
              <ul className="space-y-2 text-sm opacity-70">
                <li><a href="#" className="hover:opacity-100 transition">О платформе</a></li>
                <li><a href="#" className="hover:opacity-100 transition">Контакты</a></li>
                <li><a href="#" className="hover:opacity-100 transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Контакты</h4>
              <p className="opacity-70 text-sm">support@volunteerhq.local</p>
            </div>
          </div>
          <div className="border-t border-white border-opacity-20 pt-8 text-center text-sm opacity-60">
            <p>&copy; 2026 Volunteer HQ. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home
