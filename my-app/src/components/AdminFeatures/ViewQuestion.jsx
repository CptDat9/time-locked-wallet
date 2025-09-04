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
} from "@chakra-ui/react";
import viewQuestionAdmin from "../../utils/viewQuestionAdmin";

const ViewQuestion = () => {
  const [questionId, setQuestionId] = useState("");
  const [questionData, setQuestionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const fetchQuestion = async () => {
    setIsLoading(true);
    setQuestionData(null);
    try {
      const data = await viewQuestionAdmin(Number(questionId));
      setQuestionData(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lấy thông tin câu hỏi.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Heading size="md">Xem thông tin câu hỏi</Heading>
      <Input
        placeholder="Nhập Question ID"
        value={questionId}
        onChange={(e) => setQuestionId(e.target.value)}
      />
      <Button
        colorScheme="teal"
        onClick={fetchQuestion}
        isLoading={isLoading}
        loadingText="Đang tải..."
      >
        Xem câu hỏi
      </Button>

      {isLoading && <Spinner size="xl" color="teal.500" />}

      {questionData && (
        <Box
          p={5}
          border="1px solid #ccc"
          borderRadius="md"
          boxShadow="md"
          bg="gray.50"
        >
          <Text fontSize="xl" fontWeight="bold" mb={2}>
            {questionData.title}
          </Text>
          {questionData.imageUri && (
            <Image src={questionData.imageUri} alt="image" maxW="300px" mb={3} />
          )}
          <Text><strong>ID:</strong> {questionData.id}</Text>
          <Text><strong>Địa chỉ NFT:</strong> {questionData.nftAddress}</Text>
          <Text><strong>Đang hoạt động:</strong> {questionData.isActive ? "Có" : "Không"}</Text>
          <Text><strong>Hạn chót:</strong> {new Date(questionData.deadline * 1000).toLocaleString()}</Text>
          <Text><strong>Phần thưởng mỗi phiếu:</strong> {questionData.rewardPerVote}</Text>
          <Text><strong>Tổng phiếu:</strong> {questionData.totalVotes}</Text>

          <Text fontWeight="bold" mt={4}>Các phương án:</Text>
          <List spacing={2} mt={1}>
            {questionData.choices.map((choice, index) => (
              <ListItem key={index}>
                {index + 1}. {choice.description} — <strong>{choice.totalVotes}</strong> phiếu
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </VStack>
  );
};

export default ViewQuestion;
