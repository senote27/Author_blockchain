import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react'

function AuthorDashboard({ user }) {
  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Heading>Author Dashboard</Heading>
        <Text>Welcome, {user.username}!</Text>
        <Button colorScheme="blue">Upload New Book</Button>
        <Button>View My Books</Button>
        <Button>Check Royalties</Button>
      </VStack>
    </Box>
  )
}

export default AuthorDashboard