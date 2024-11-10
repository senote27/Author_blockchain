import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react'

function SellerDashboard({ user }) {
  return (
    <Box p={8}>
      <VStack spacing={4} align="stretch">
        <Heading>Seller Dashboard</Heading>
        <Text>Welcome, {user.username}!</Text>
        <Button colorScheme="blue">List New Book</Button>
        <Button>View Inventory</Button>
        <Button>Sales History</Button>
      </VStack>
    </Box>
  )
}

export default SellerDashboard