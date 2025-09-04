import React, { useState, useEffect } from "react";
import { 
  Button, 
  VStack, 
  useToast, 
  Heading, 
  Box, 
  Spinner, 
  Text, 
  Image, 
  List, 
  ListItem,
  Grid,
  GridItem,
  Badge,
  Divider,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import getAllActiveQuestions from "../../utils/ViewActiveQuestion";

const ViewAllActiveQuestions = () => {
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const fetchAllActiveQuestions = async () => {
    setIsLoading(true);
    try {
      const questions = await getAllActiveQuestions();
      setActiveQuestions(questions);
      toast({
        title: "Success",
        description: `Found ${questions.length} active questions`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error fetching active questions",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load active questions when component mounts
  useEffect(() => {
    fetchAllActiveQuestions();
  }, []);

  const formatDeadline = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isExpired = date > now;
    
    return {
      formatted: date.toLocaleString('en-US'),
      isExpired
    };
  };

  const getTotalVotesForQuestion = (choices) => {
    return choices.reduce((total, choice) => total + choice.totalVotes, 0);
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="lg" color="teal.600">
          All Active Questions
        </Heading>
        <Button
          colorScheme="teal"
          onClick={fetchAllActiveQuestions}
          isLoading={isLoading}
          loadingText="Loading..."
          size="md"
        >
          Refresh
        </Button>
      </Box>

      {isLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <Spinner size="xl" color="teal.500" thickness="4px" />
        </Box>
      )}

      {!isLoading && activeQuestions.length === 0 && (
        <Alert status="info">
          <AlertIcon />
          No active questions found
        </Alert>
      )}

      {!isLoading && activeQuestions.length > 0 && (
        <Grid templateColumns="repeat(auto-fit, minmax(400px, 1fr))" gap={6}>
          {activeQuestions.map((question) => {
            const deadline = formatDeadline(question.deadline);
            const totalVotes = getTotalVotesForQuestion(question.choices);

            return (
              <GridItem key={question.id}>
                <Box
                  p={6}
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="lg"
                  boxShadow="md"
                  bg="white"
                  _hover={{ boxShadow: "lg" }}
                  transition="box-shadow 0.2s"
                >
                  {/* Question Header */}
                  <Box mb={4}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Badge colorScheme="green" fontSize="sm">
                        ID: {question.id}
                      </Badge>
                      <Badge 
                        colorScheme={deadline.isExpired ? "red" : "blue"} 
                        fontSize="sm"
                      >
                        {deadline.isExpired ? "Expired" : "Active"}
                      </Badge>
                    </Box>
                    
                    <Heading size="md" mb={3} color="gray.800">
                      {question.title}
                    </Heading>

                    {question.imageUri && (
                      <Image 
                        src={question.imageUri} 
                        alt="Question image" 
                        maxW="100%" 
                        maxH="200px"
                        objectFit="cover"
                        borderRadius="md"
                        mb={3} 
                      />
                    )}
                  </Box>

                  <Divider mb={4} />

                  {/* Question Details */}
                  <VStack align="stretch" spacing={2} mb={4}>
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="bold">NFT Address:</Text>{" "}
                      <Text as="span" fontFamily="mono" fontSize="xs">
                        {question.nftAddress}
                      </Text>
                    </Text>
                    
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="bold">Deadline:</Text>{" "}
                      <Text 
                        as="span" 
                        color={deadline.isExpired ? "red.500" : "blue.600"}
                        fontWeight={deadline.isExpired ? "bold" : "normal"}
                      >
                        {deadline.formatted}
                      </Text>
                    </Text>
                    
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="bold">Reward/vote:</Text>{" "}
                      <Text as="span" color="green.600" fontWeight="semibold">
                        {question.rewardPerVote.toLocaleString()}
                      </Text>
                    </Text>
                    
                    <Text fontSize="sm">
                      <Text as="span" fontWeight="bold">Total votes:</Text>{" "}
                      <Text as="span" color="purple.600" fontWeight="semibold">
                        {totalVotes}
                      </Text>
                    </Text>
                  </VStack>

                  <Divider mb={4} />

                  {/* Choices */}
                  <Box>
                    <Text fontWeight="bold" mb={3} color="gray.700">
                      Available choices:
                    </Text>
                    <List spacing={2}>
                      {question.choices.map((choice, index) => (
                        <ListItem 
                          key={index}
                          p={2}
                          bg="gray.50"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="gray.200"
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Text fontSize="sm" flex="1">
                              <Text as="span" fontWeight="semibold" color="blue.600">
                                {index + 1}.
                              </Text>{" "}
                              {choice.description}
                            </Text>
                            <Badge colorScheme="purple" ml={2}>
                              {choice.totalVotes} votes
                            </Badge>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Box>
              </GridItem>
            );
          })}
        </Grid>
      )}
    </VStack>
  );
};

export default ViewAllActiveQuestions;
