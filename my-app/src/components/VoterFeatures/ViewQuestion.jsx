import React, { useState } from "react";
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
  AlertIcon
} from "@chakra-ui/react";
import viewQuestionVoter from "../../utils/ViewQuestionUser";

const ViewQuestion = () => {
  const [questionId, setQuestionId] = useState("");
  const [questionData, setQuestionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
          View Question Details
        </Heading>
      </Box>

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

      {isLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <Spinner size="xl" color="teal.500" thickness="4px" />
        </Box>
      )}

      {questionData && (() => {
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
            <Box>
              <Text fontWeight="bold" mb={3} color="gray.700">
                Available choices:
              </Text>
              <List spacing={2}>
                {questionData.choices.map((choice, index) => (
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
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        );
      })()}
    </VStack>
  );
};

export default ViewQuestion;