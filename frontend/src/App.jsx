import { useState } from 'react'
import LoginForm from './components/LoginForm'
import AuthorDashboard from './components/AuthorDashboard'
import SellerDashboard from './components/SellerDashboard'
import UserDashboard from './components/UserDashboard'

function App() {
  const [user, setUser] = useState(null)

  const renderDashboard = () => {
    if (!user) return <LoginForm onLogin={setUser} />
    
    switch (user.role) {
      case 'AUTHOR':
        return <AuthorDashboard user={user} />
      case 'SELLER':
        return <SellerDashboard user={user} />
      case 'USER':
        return <UserDashboard user={user} />
      default:
        return <LoginForm onLogin={setUser} />
    }
  }

  return (
    <div className="app">
      {renderDashboard()}
    </div>
  )
}

export default App