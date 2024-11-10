import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react'

function UserDashboard({ user }) {
  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Heading>User Dashboard</Heading>
        <Text>Welcome, {user.username}!</Text>
        <Button colorScheme="blue">Browse Books</Button>
        <Button>My Library</Button>
        <Button>Purchase History</Button>
      </VStack>
    </Box>
  )
}

export default UserDashboard