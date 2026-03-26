import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlassCard from '../components/ui/GlassCard'
import GlassInput from '../components/ui/GlassInput'
import IosButton from '../components/ui/IosButton'
import { UserCheck, BookOpen } from 'lucide-react'

const Register = () => {
  const [step, setStep] = useState(1) // 1 = role choice, 2 = form
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    contact: '',
    birth_date: '',
    gender: '',
    photo_url: '',
    role_code: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleRoleSelect = (roleCode) => {
    setFormData({ ...formData, role_code: roleCode })
    setStep(2)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.password2) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    const submitData = { ...formData }
    delete submitData.password2

    const result = await register(submitData)

    if (result.success) {
      navigate('/')
    } else {
      setError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
    }

    setLoading(false)
  }

  // Step 1: Role selection
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <GlassCard className="max-w-lg w-full p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold glass-title">Регистрация</h2>
            <p className="glass-subtitle mt-2">Кто вы?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleRoleSelect('volunteer')}
              className="glass-card p-6 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 bg-opacity-20 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold glass-title mb-1">Волонтёр</h3>
              <p className="text-sm glass-subtitle">
                Я хочу проводить лекции и мероприятия
              </p>
            </button>

            <button
              onClick={() => handleRoleSelect('user')}
              className="glass-card p-6 rounded-2xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-bold glass-title mb-1">Посетитель</h3>
              <p className="text-sm glass-subtitle">
                Я хочу посещать лекции и мероприятия
              </p>
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm glass-subtitle">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Войти
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Step 2: Registration form
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <GlassCard className="max-w-md w-full p-8">
        <div className="mb-6">
          <button
            onClick={() => setStep(1)}
            className="text-sm glass-subtitle hover:opacity-70 transition-opacity mb-4 inline-flex items-center gap-1"
          >
            ← Назад
          </button>
          <h2 className="text-2xl font-bold glass-title">
            {formData.role_code === 'volunteer' ? 'Регистрация волонтёра' : 'Регистрация посетителя'}
          </h2>
          <p className="glass-subtitle mt-1">
            {formData.role_code === 'volunteer'
              ? 'Заполните данные для участия как лектор'
              : 'Заполните данные для посещения лекций'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium glass-subtitle mb-1">
              Имя пользователя
            </label>
            <GlassInput
              id="username"
              name="username"
              type="text"
              required
              placeholder="Логин"
              className="w-full"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium glass-subtitle mb-1">
              Email
            </label>
            <GlassInput
              id="email"
              name="email"
              type="email"
              required
              placeholder="email@example.com"
              className="w-full"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium glass-subtitle mb-1">
                Имя
              </label>
              <GlassInput
                id="first_name"
                name="first_name"
                type="text"
                required
                placeholder="Имя"
                className="w-full"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium glass-subtitle mb-1">
                Фамилия
              </label>
              <GlassInput
                id="last_name"
                name="last_name"
                type="text"
                required
                placeholder="Фамилия"
                className="w-full"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact" className="block text-sm font-medium glass-subtitle mb-1">
              Контакт (телефон)
            </label>
            <GlassInput
              id="contact"
              name="contact"
              type="text"
              placeholder="+7 999 000 0000"
              className="w-full"
              value={formData.contact}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="birth_date" className="block text-sm font-medium glass-subtitle mb-1">
                Дата рождения
              </label>
              <GlassInput
                id="birth_date"
                name="birth_date"
                type="date"
                className="w-full"
                value={formData.birth_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium glass-subtitle mb-1">
                Пол
              </label>
              <select
                id="gender"
                name="gender"
                className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>
          </div>

          {formData.role_code === 'volunteer' && (
            <div>
              <label htmlFor="photo_url" className="block text-sm font-medium glass-subtitle mb-1">
                Фото (URL)
              </label>
              <GlassInput
                id="photo_url"
                name="photo_url"
                type="text"
                placeholder="https://example.com/photo.jpg"
                className="w-full"
                value={formData.photo_url}
                onChange={handleChange}
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium glass-subtitle mb-1">
              Пароль
            </label>
            <GlassInput
              id="password"
              name="password"
              type="password"
              required
              placeholder="Минимум 8 символов"
              className="w-full"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label htmlFor="password2" className="block text-sm font-medium glass-subtitle mb-1">
              Подтверждение пароля
            </label>
            <GlassInput
              id="password2"
              name="password2"
              type="password"
              required
              placeholder="Повторите пароль"
              className="w-full"
              value={formData.password2}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <IosButton
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </IosButton>

          <div className="text-center">
            <p className="text-sm glass-subtitle">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Войти
              </Link>
            </p>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

export default Register