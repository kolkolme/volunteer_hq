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
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  // Parse DRF errors into flat { fieldName: string } map
  const parseErrors = (errorData) => {
    if (typeof errorData === 'string') return { _general: errorData }
    const result = {}
    for (const [key, val] of Object.entries(errorData)) {
      const msg = Array.isArray(val) ? val.join(' ') : String(val)
      if (key === 'non_field_errors' || key === 'detail') {
        result._general = msg
      } else {
        result[key] = msg
      }
    }
    return result
  }

  const handleRoleSelect = (roleCode) => {
    setFormData({ ...formData, role_code: roleCode })
    setStep(2)
    setErrors({})
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear field error on change
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    // Client-side validation
    const clientErrors = {}
    if (!formData.username.trim()) clientErrors.username = 'Обязательное поле'
    else if (/\s/.test(formData.username)) clientErrors.username = 'Логин не должен содержать пробелы'
    if (!formData.email.trim()) clientErrors.email = 'Обязательное поле'
    if (!formData.first_name.trim()) clientErrors.first_name = 'Обязательное поле'
    if (!formData.last_name.trim()) clientErrors.last_name = 'Обязательное поле'
    if (formData.password.length < 8) clientErrors.password = 'Минимум 8 символов'
    if (formData.password !== formData.password2) clientErrors.password2 = 'Пароли не совпадают'

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setLoading(false)
      return
    }

    const submitData = { ...formData }
    delete submitData.password2

    const result = await register(submitData)

    if (result.success) {
      navigate('/')
    } else {
      setErrors(parseErrors(result.error))
    }

    setLoading(false)
  }

  // Helper to render a field error
  const FieldError = ({ name }) =>
    errors[name] ? (
      <p className="text-red-500 text-xs mt-1">{errors[name]}</p>
    ) : null

  // Step 1: Role selection
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <GlassCard className="max-w-lg w-full p-4 sm:p-8">
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
      <GlassCard className="max-w-md w-full p-4 sm:p-8">
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
          {/* General error (non-field) */}
          {errors._general && (
            <div className="rounded-xl border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors._general}
            </div>
          )}

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
              className={`w-full${errors.username ? ' border-red-400' : ''}`}
              value={formData.username}
              onChange={handleChange}
            />
            <FieldError name="username" />
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
              className={`w-full${errors.email ? ' border-red-400' : ''}`}
              value={formData.email}
              onChange={handleChange}
            />
            <FieldError name="email" />
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
                className={`w-full${errors.first_name ? ' border-red-400' : ''}`}
                value={formData.first_name}
                onChange={handleChange}
              />
              <FieldError name="first_name" />
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
                className={`w-full${errors.last_name ? ' border-red-400' : ''}`}
                value={formData.last_name}
                onChange={handleChange}
              />
              <FieldError name="last_name" />
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
            <FieldError name="contact" />
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
              <FieldError name="birth_date" />
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
              <FieldError name="photo_url" />
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
              className={`w-full${errors.password ? ' border-red-400' : ''}`}
              value={formData.password}
              onChange={handleChange}
            />
            <FieldError name="password" />
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
              className={`w-full${errors.password2 ? ' border-red-400' : ''}`}
              value={formData.password2}
              onChange={handleChange}
            />
            <FieldError name="password2" />
          </div>

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