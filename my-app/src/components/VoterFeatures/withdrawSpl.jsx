import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  VStack,
  useToast,
  Heading,
  Box,
  Text,
  Divider,
  Progress,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import withdrawSpl from "../../utils/withdrawSpl";
import fetchLockSpl from "../../utils/fetchLockSpl";

const WithdrawSpl = () => {
  const [beneficiary, setBeneficiary] = useState("");
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const toast = useToast();

  // format countdown
  const formatTime = (seconds) => {
    if (seconds <= 0) return "Unlocked";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const handleSearch = async () => {
    if (!beneficiary) {
      toast({
        title: "Missing beneficiary",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const data = await fetchLockSpl(beneficiary);
      setLocks(data);
      if (data.length === 0) {
        toast({
          title: "No locks found",
          description: "Beneficiary không có SPL lock nào",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: "Fetch error",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (lock) => {
    setWithdrawingId(lock.lockAccount);
    try {
      const tx = await withdrawSpl(lock.unlockTimestamp, beneficiary, lock.mint);
      toast({
        title: "Withdraw Success",
        description: `Tx ID: ${tx}`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      // reload danh sách sau khi rút
      const data = await fetchLockSpl(beneficiary);
      setLocks(data);
    } catch (err) {
      toast({
        title: "Withdraw Failed",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Heading size="lg" color="purple.600">
        Withdraw SPL Tokens
      </Heading>

      {/* Search box */}
      <HStack>
        <Input
          placeholder="Beneficiary PublicKey"
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
        />
        <Button colorScheme="purple" onClick={handleSearch} isLoading={loading}>
          Search
        </Button>
      </HStack>

      <Divider />

      {/* Danh sách locks */}
      {locks.map((lock) => (
        <Box
          key={lock.lockAccount}
          p={4}
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          bg="white"
          boxShadow="sm"
        >
          <Text><b>Owner:</b> {lock.owner}</Text>
          <Text><b>Beneficiary:</b> {lock.beneficiary}</Text>
          <Text>
            <b>Amount:</b> {lock.amount / 10 ** lock.decimals} {lock.symbol}
          </Text>
          <Text><b>Description:</b> {lock.description}</Text>
          <Text><b>Mint:</b> {lock.mint}</Text>
          <Text><b>Unlock At:</b> {new Date(lock.unlockTimestamp * 1000).toLocaleString()}</Text>
          <Text color={lock.countdown > 0 ? "blue.600" : "green.600"}>
            {lock.countdown > 0
              ? `Time left: ${formatTime(lock.countdown)}`
              : "Unlocked and ready to withdraw"}
          </Text>

          {lock.countdown > 0 && (
            <Progress
              value={(1 - lock.countdown / (lock.countdown + 1)) * 100}
              size="sm"
              mt={2}
            />
          )}

          <Button
            mt={4}
            colorScheme="purple"
            onClick={() => handleWithdraw(lock)}
            isDisabled={lock.countdown > 0}
            isLoading={withdrawingId === lock.lockAccount}
          >
            Withdraw
          </Button>
        </Box>
      ))}

      {loading && <Spinner size="xl" alignSelf="center" />}
    </VStack>
  );
};

export default WithdrawSpl;
