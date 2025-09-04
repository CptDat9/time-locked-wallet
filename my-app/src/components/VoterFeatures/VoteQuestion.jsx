import React, { useState, useEffect } from "react";
import { 
  Input, 
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
  Badge,
  Divider,
  Alert,
  AlertIcon,
  Grid,
  GridItem,
  HStack
} from "@chakra-ui/react";
import viewQuestionVoter from "../../utils/ViewQuestionUser";
import getAllActiveQuestions from "../../utils/ViewActiveQuestion";
import voteForQuestion from "../../utils/voteForQuestion";

const ViewQuestion = () => {
  const [questionId, setQuestionId] = useState("");
  const [questionData, setQuestionData] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [viewMode, setViewMode] = useState("all"); // "all" or "single"
  const toast = useToast();

  const fetchQuestion = async () => {
    if (!questionId.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid Question ID",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setQuestionData(null);
    try {
      const data = await viewQuestionVoter(questionId);
      setQuestionData(data);
      toast({
        title: "Success",
        description: "Question data loaded successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
        console.error(error);
        toast({
            title: "Error fetching question",
            description: error.message,
            status: "error",
            duration: 3000,
            isClosable: true,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const fetchAllActiveQuestions = async () => {
    setIsLoadingAll(true);
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
      setIsLoadingAll(false);
    }
  };

  const handleVoteClick = async (questionId, choiceIndex) => {
    setIsVoting(true);
    try {
      await voteForQuestion(questionId, choiceIndex);
      toast({
        title: "Vote Successful!",
        description: "Your vote has been recorded",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      // Refresh the data to show updated vote counts
      if (viewMode === "all") {
        fetchAllActiveQuestions();
      } else {
        fetchQuestion();
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Voting Failed",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsVoting(false);
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
          Questions & Voting
        </Heading>
        <HStack spacing={4}>
          <Button
            colorScheme={viewMode === "all" ? "teal" : "gray"}
            onClick={() => setViewMode("all")}
            size="sm"
          >
            All Questions
          </Button>
          <Button
            colorScheme={viewMode === "single" ? "teal" : "gray"}
            onClick={() => setViewMode("single")}
            size="sm"
          >
            Single Question
          </Button>
          {viewMode === "all" && (
            <Button
              colorScheme="teal"
              onClick={fetchAllActiveQuestions}
              isLoading={isLoadingAll}
              loadingText="Loading..."
              size="sm"
            >
              Refresh
            </Button>
          )}
        </HStack>
      </Box>

      {/* Single Question View */}
      {viewMode === "single" && (
        <Box
          p={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <VStack spacing={4}>
            <Input
              placeholder="Enter Question ID"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              size="md"
            />
            <Button
              colorScheme="teal"
              onClick={fetchQuestion}
              isLoading={isLoading}
              loadingText="Loading..."
              width="100%"
              size="md"
            >
              View Question
            </Button>
          </VStack>
        </Box>
      )}

      {/* Loading States */}
      {isLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <Spinner size="xl" color="teal.500" thickness="4px" />
        </Box>
      )}

      {isLoadingAll && (
        <Box display="flex" justifyContent="center" py={8}>
          <Spinner size="xl" color="teal.500" thickness="4px" />
        </Box>
      )}

      {/* All Questions View */}
      {viewMode === "all" && !isLoadingAll && activeQuestions.length === 0 && (
        <Alert status="info">
          <AlertIcon />
          No active questions found
        </Alert>
      )}

      {viewMode === "all" && !isLoadingAll && activeQuestions.length > 0 && (
        <Grid templateColumns="repeat(auto-fit, minmax(500px, 1fr))" gap={6}>
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
                  minW="480px"
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
                  <Box mb={4}>
                    <Text fontWeight="bold" mb={3} color="gray.700">
                      Available choices:
                    </Text>
                    <List spacing={2}>
                      {question.choices.map((choice, index) => (
                        <ListItem 
                          key={index}
                          p={3}
                          bg="gray.50"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="gray.200"
                          _hover={{ 
                            bg: deadline.isExpired ? "gray.50" : "blue.50",
                            borderColor: deadline.isExpired ? "gray.200" : "blue.300",
                            cursor: deadline.isExpired ? "not-allowed" : "pointer"
                          }}
                          onClick={!deadline.isExpired ? () => handleVoteClick(question.id, index) : undefined}
                          transition="all 0.2s"
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Text fontSize="sm" flex="1">
                              <Text as="span" fontWeight="semibold" color="blue.600">
                                {index + 1}.
                              </Text>{" "}
                              {choice.description}
                            </Text>
                            {!deadline.isExpired && (
                              <Button
                                size="xs"
                                colorScheme="green"
                                isLoading={isVoting}
                                loadingText="Voting..."
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVoteClick(question.id, index);
                                }}
                              >
                                Vote
                              </Button>
                            )}
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>

                  {/* Info Text */}
                  <Box mb={4}>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      {deadline.isExpired ? "Voting has ended" : "Click on any choice above to vote"}
                    </Text>
                  </Box>
                </Box>
              </GridItem>
            );
          })}
        </Grid>
      )}

      {/* Single Question Display */}
      {viewMode === "single" && questionData && (() => {
        const deadline = formatDeadline(questionData.deadline);
        const totalVotes = getTotalVotesForQuestion(questionData.choices);

        return (
          <Box
            p={6}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="lg"
            boxShadow="md"
            bg="white"
            _hover={{ boxShadow: "lg" }}
            transition="box-shadow 0.2s"
            minW="500px"
            maxW="800px"
            mx="auto"
          >
            {/* Question Header */}
            <Box mb={4}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Badge colorScheme="green" fontSize="sm">
                  ID: {questionData.id}
                </Badge>
                <Badge 
                  colorScheme={deadline.isExpired ? "red" : "blue"} 
                  fontSize="sm"
                >
                  {deadline.isExpired ? "Expired" : "Active"}
                </Badge>
              </Box>
              
              <Heading size="md" mb={3} color="gray.800">
                {questionData.title}
              </Heading>

              {questionData.imageUri && (
                <Image 
                  src={questionData.imageUri} 
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
                  {questionData.nftAddress}
                </Text>
              </Text>
              
              <Text fontSize="sm">
                <Text as="span" fontWeight="bold">Active:</Text>{" "}
                <Text 
                  as="span" 
                  color={questionData.isActive ? "green.600" : "red.500"}
                  fontWeight="semibold"
                >
                  {questionData.isActive ? "Yes" : "No"}
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
                  {questionData.rewardPerVote.toLocaleString()}
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
            <Box mb={4}>
              <Text fontWeight="bold" mb={3} color="gray.700">
                Available choices:
              </Text>
              <List spacing={2}>
                {questionData.choices.map((choice, index) => (
                  <ListItem 
                    key={index}
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                    _hover={{ 
                      bg: (deadline.isExpired || !questionData.isActive) ? "gray.50" : "blue.50",
                      borderColor: (deadline.isExpired || !questionData.isActive) ? "gray.200" : "blue.300",
                      cursor: (deadline.isExpired || !questionData.isActive) ? "not-allowed" : "pointer"
                    }}
                    onClick={(!deadline.isExpired && questionData.isActive) ? () => handleVoteClick(questionData.id, index) : undefined}
                    transition="all 0.2s"
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Text fontSize="sm" flex="1">
                        <Text as="span" fontWeight="semibold" color="blue.600">
                          {index + 1}.
                        </Text>{" "}
                        {choice.description}
                      </Text>
                      {(!deadline.isExpired && questionData.isActive) && (
                        <Button
                          size="xs"
                          colorScheme="green"
                          isLoading={isVoting}
                          loadingText="Voting..."
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoteClick(questionData.id, index);
                          }}
                        >
                          Vote
                        </Button>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Info Text */}
            <Box mb={4}>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                {(deadline.isExpired || !questionData.isActive) ? "Voting has ended" : "Click on any choice above to vote"}
              </Text>
            </Box>

            {/* Info Text */}
            <Box mb={4}>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                {(deadline.isExpired || !questionData.isActive) ? "Voting has ended" : "Click on any choice above to vote"}
              </Text>
            </Box>
          </Box>
        );
      })()}
    </VStack>
  );
};

export default ViewQuestion;