import { useState } from 'react'
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  ButtonGroup,
  useToast
} from '@chakra-ui/react'

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const toast = useToast()

  const handleLogin = async () => {
    try {
      // In a real app, this would call your backend API
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: selectedRole }),
      })

      if (!response.ok) throw new Error('Login failed')

      const userData = await response.json()
      onLogin(userData)
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    }
  }

  return (
    <Box p={8} maxWidth="400px" mx="auto">
      <VStack spacing={4}>
        <Heading>Book Marketplace</Heading>
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ButtonGroup spacing={4}>
          <Button
            onClick={() => setSelectedRole('AUTHOR')}
            colorScheme={selectedRole === 'AUTHOR' ? 'blue' : 'gray'}
          >
            Author
          </Button>
          <Button
            onClick={() => setSelectedRole('SELLER')}
            colorScheme={selectedRole === 'SELLER' ? 'blue' : 'gray'}
          >
            Seller
          </Button>
          <Button
            onClick={() => setSelectedRole('USER')}
            colorScheme={selectedRole === 'USER' ? 'blue' : 'gray'}
          >
            User
          </Button>
        </ButtonGroup>
        <Button
          colorScheme="blue"
          width="100%"
          onClick={handleLogin}
          isDisabled={!username || !password || !selectedRole}
        >
          Login
        </Button>
      </VStack>
    </Box>
  )
}

export default LoginForm