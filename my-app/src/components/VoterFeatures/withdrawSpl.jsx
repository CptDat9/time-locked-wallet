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
  Alert,
  AlertIcon,
  Progress,
} from "@chakra-ui/react";
import withdrawSpl from "../../utils/withdrawSpl";
import { getTokenAccountBalance } from "../../utils/tokenUtils";
import { Buffer } from "buffer";

const WithdrawSpl = () => {
  const [owner, setOwner] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [mint, setMint] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [txId, setTxId] = useState(null);
  const [balanceBefore, setBalanceBefore] = useState(null);
  const [balanceAfter, setBalanceAfter] = useState(null);
  const toast = useToast();

  // countdown timer update
  useEffect(() => {
    let interval;
    if (unlockDate) {
      interval = setInterval(() => {
        const unlockTs = Math.floor(new Date(unlockDate).getTime() / 1000);
        const now = Math.floor(Date.now() / 1000);
        const diff = unlockTs - now;
        setTimeLeft(diff > 0 ? diff : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [unlockDate]);

  const formatTime = (seconds) => {
    if (seconds <= 0) return "Unlocked";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  const fetchBalance = async (pubkey, mintAddr) => {
    try {
      const bal = await getTokenAccountBalance(pubkey, mintAddr);
      return bal;
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      return null;
    }
  };

  const handleWithdraw = async () => {
    if (!owner || !beneficiary || !unlockDate || !mint) {
      toast({
        title: "Missing fields",
        description: "Please fill all fields before withdrawing",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
    setIsWithdrawing(true);
    try {
      const before = await fetchBalance(beneficiary, mint);
      setBalanceBefore(before);

      const tx = await withdrawSpl(owner, unlockTimestamp, beneficiary, mint);
      setTxId(tx);

      const after = await fetchBalance(beneficiary, mint);
      setBalanceAfter(after);

      toast({
        title: "Withdraw Success",
        description: `Tx ID: ${tx}`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Withdraw Failed",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      <Heading size="lg" color="purple.600">Withdraw SPL Token</Heading>

      <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white" boxShadow="sm">
        <VStack spacing={4}>
          <Input placeholder="Owner PublicKey" value={owner} onChange={(e) => setOwner(e.target.value)} />
          <Input type="datetime-local" value={unlockDate} onChange={(e) => setUnlockDate(e.target.value)} />
          <Input placeholder="Beneficiary PublicKey" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
          <Input placeholder="Token Mint Address" value={mint} onChange={(e) => setMint(e.target.value)} />

          {timeLeft !== null && (
            <Box w="100%">
              <Text fontSize="sm" color={timeLeft > 0 ? "blue.600" : "green.600"}>
                {timeLeft > 0 ? `Time left: ${formatTime(timeLeft)}` : "Unlocked and ready to withdraw"}
              </Text>
              {timeLeft > 0 && (
                <Progress value={(1 - timeLeft / (timeLeft + 1)) * 100} size="sm" colorScheme="purple" mt={2} />
              )}
            </Box>
          )}

          <Button colorScheme="purple" onClick={handleWithdraw} isLoading={isWithdrawing} isDisabled={timeLeft > 0} w="100%">
            Withdraw SPL
          </Button>
        </VStack>
      </Box>

      {balanceBefore !== null && balanceAfter !== null && (
        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
          <Text fontSize="sm">Balance Before: {balanceBefore}</Text>
          <Text fontSize="sm" fontWeight="bold">Balance After: {balanceAfter}</Text>
        </Box>
      )}

      {txId && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          Transaction submitted: <a href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`} target="_blank" rel="noreferrer">View on Explorer</a>
        </Alert>
      )}
    </VStack>
  );
};

export default WithdrawSpl;
