import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlassCard from '../components/ui/GlassCard'
import GlassInput from '../components/ui/GlassInput'
import IosButton from '../components/ui/IosButton'

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any invalid tokens on login page
    console.log('Login page mount')
    const token = localStorage.getItem('token')
    console.log('Token in localStorage:', !!token)
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    console.log('handleSubmit called with event:', e)
    e.preventDefault()
    console.log('Form data:', formData)
    
    if (!formData.username || !formData.password) {
      console.error('Username or password is empty')
      setError('Заполните оба поля')
      return
    }

    setLoading(true)
    setError('')

    console.log('Calling login with:', { username: formData.username, password: '***' })
    const result = await login(formData.username, formData.password)
    console.log('Login result:', result)

    if (result.success) {
      console.log('Login successful, navigating to /')
      navigate('/')
    } else {
      console.log('Login failed:', result.error)
      setError(result.error)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <GlassCard className="max-w-md w-full p-8">
        <div>
          <h2 className="glass-title">
            Войти в аккаунт
          </h2>
          <p className="glass-subtitle mt-2">
            Volunteer HQ
          </p>
          <p className="text-xs glass-subtitle mt-4 p-2 bg-blue-100 rounded">
            Тест: Откройте DevTools (F12) → Console для логов
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                Имя пользователя
              </label>
              <GlassInput
                id="username"
                name="username"
                type="text"
                required
                placeholder="Имя пользователя"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <GlassInput
                id="password"
                name="password"
                type="password"
                required
                placeholder="Пароль"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <IosButton
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Вход...' : 'Войти'}
            </IosButton>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Очистить кэш и перезагрузить
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

export default Login