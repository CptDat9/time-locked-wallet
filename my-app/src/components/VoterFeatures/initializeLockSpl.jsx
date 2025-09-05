import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  useToast,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  InputGroup,
  InputLeftAddon,
  Divider,
  Alert,
  AlertIcon,
  Tag,
  Badge,
  Tooltip,
  Progress,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import initializeLockSpl from "../../utils/initializeLockSpl";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";

// Countdown hook
function useCountdown(targetEpochSec) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, (targetEpochSec || 0) - now);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return { remaining, days, hours, minutes, seconds };
}

function toEpochSeconds(dtLocalValue) {
  try {
    if (!dtLocalValue) return null;
    const ms = new Date(dtLocalValue).getTime();
    if (Number.isNaN(ms)) return null;
    return Math.floor(ms / 1000);
  } catch {
    return null;
  }
}

function txLink(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export default function InitializeLockSpl() {
  const toast = useToast();

  const [connectedPk, setConnectedPk] = useState(null);
  const [checkingWallet, setCheckingWallet] = useState(true);

  const [amount, setAmount] = useState(10);
  const [mint, setMint] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [description, setDescription] = useState("");
  const [unlockLocal, setUnlockLocal] = useState("");

  const unlockTs = useMemo(() => toEpochSeconds(unlockLocal), [unlockLocal]);
  const { remaining, days, hours, minutes, seconds } = useCountdown(unlockTs ?? 0);

  const totalDuration = useMemo(() => {
    const start = Math.floor(Date.now() / 1000);
    if (!unlockTs || unlockTs <= start) return 0;
    return unlockTs - start;
  }, [unlockTs]);

  const progress = useMemo(() => {
    if (!totalDuration) return 0;
    const elapsed = totalDuration - remaining;
    const pct = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    return pct;
  }, [remaining, totalDuration]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSig, setLastSig] = useState(null);

  // Detect Phantom
  useEffect(() => {
    const probe = async () => {
      try {
        if (window?.solana?.isPhantom) {
          if (!window.solana.publicKey) {
            await window.solana.connect({ onlyIfTrusted: true });
          }
          setConnectedPk(window.solana.publicKey?.toBase58() || null);
        }
      } catch {
      } finally {
        setCheckingWallet(false);
      }
    };
    probe();
  }, []);

  const handleConnect = async () => {
    try {
      if (!window?.solana?.isPhantom) {
        toast({ title: "Chưa cài Phantom", status: "warning" });
        return;
      }
      const res = await window.solana.connect();
      setConnectedPk(res.publicKey?.toBase58() || null);
      toast({ title: "Đã kết nối Phantom", status: "success" });
    } catch (e) {
      toast({ title: "Kết nối ví thất bại", description: e.message, status: "error" });
    }
  };

  const validate = () => {
    if (!connectedPk) return "Bạn chưa kết nối ví.";
    if (!amount || Number(amount) <= 0) return "Số lượng SPL phải > 0.";
    if (!mint) return "Nhập địa chỉ mint của token.";
    if (!beneficiary) return "Nhập địa chỉ beneficiary.";
    if (!unlockTs) return "Chọn thời điểm mở khoá.";
    if (unlockTs <= Math.floor(Date.now() / 1000)) return "Thời điểm mở khoá phải ở tương lai.";
    return null;
  };

  const onSubmit = async () => {
  const err = validate();
  if (err) {
    toast({ title: "Thiếu dữ liệu", description: err, status: "warning" });
    return;
  }
  try {
    setIsSubmitting(true);

    const mintPk = new PublicKey(mint.trim());
    const beneficiaryPk = new PublicKey(beneficiary.trim());

    const sig = await initializeLockSpl(
      Number(amount),
      unlockTs,
      description || "",
      beneficiaryPk.toBase58(),
      mintPk.toBase58()
    );

    setLastSig(sig);
    toast({
      title: "Khởi tạo SPL lock thành công",
      description: `Tx: ${sig.substring(0, 8)}...`,
      status: "success",
    });
  } catch (e) {
    toast({ title: "Giao dịch thất bại", description: e.message, status: "error" });
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <Box p={{ base: 4, md: 8 }}>
      <VStack spacing={6} align="stretch" maxW="800px" mx="auto">
        <HStack justify="space-between">
          <Heading size="lg" color="purple.600">Time-Locked SPL Wallet</Heading>
          {connectedPk ? (
            <Tag colorScheme="green">{connectedPk.slice(0, 4)}...{connectedPk.slice(-4)}</Tag>
          ) : (
            <Button onClick={handleConnect} isLoading={checkingWallet} colorScheme="purple">
              Kết nối ví
            </Button>
          )}
        </HStack>

        <Box p={6} borderWidth="1px" borderRadius="lg" bg="white">
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Mô tả</FormLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Số lượng token</FormLabel>
              <InputGroup>
                <InputLeftAddon children="SPL" />
                <NumberInput value={amount} min={0} onChange={(_, v) => setAmount(v || 0)}>
                  <NumberInputField placeholder="10" />
                </NumberInput>
              </InputGroup>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Mint address</FormLabel>
              <Input value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Token mint..." />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Beneficiary</FormLabel>
              <Input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="Địa chỉ beneficiary..." />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Thời điểm mở khoá</FormLabel>
              <Input type="datetime-local" value={unlockLocal} onChange={(e) => setUnlockLocal(e.target.value)} />
            </FormControl>

            {/* Countdown preview */}
            {unlockTs ? (
              <Box mt={2}>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Badge colorScheme={remaining > 0 ? "blue" : "green"}>
                      {remaining > 0 ? "Đếm ngược" : "Đã tới thời điểm mở khoá"}
                    </Badge>
                    {remaining === 0 && <Tag colorScheme="green">Có thể rút</Tag>}
                  </HStack>
                  <Tooltip label="Tiến độ tới thời điểm mở khoá">
                    <Text fontSize="sm" color="gray.600">{progress.toFixed(0)}%</Text>
                  </Tooltip>
                </HStack>
                <Progress value={progress} size="sm" borderRadius="full" />
                <HStack mt={2} spacing={4}>
                  <Tag size="lg">{days}d</Tag>
                  <Tag size="lg">{hours}h</Tag>
                  <Tag size="lg">{minutes}m</Tag>
                  <Tag size="lg">{seconds}s</Tag>
                </HStack>
                <Text mt={2} fontSize="sm" color="gray.600">
                  Mở khoá vào: {new Date(unlockTs * 1000).toLocaleString()}
                </Text>
              </Box>
            ) : (
              <Alert status="info"><AlertIcon />Chọn thời điểm mở khoá để xem đếm ngược.</Alert>
            )}

            <Divider />

            <Button colorScheme="purple" onClick={onSubmit} isLoading={isSubmitting}>
              Khởi tạo Lock SPL
            </Button>

            {lastSig && (
              <Alert status="success">
                <AlertIcon />
                <HStack>
                  <Text>Tx:</Text>
                  <a href={txLink(lastSig)} target="_blank" rel="noreferrer">
                    <HStack>
                      <Text fontFamily="mono">{lastSig.slice(0, 10)}...</Text>
                      <ExternalLinkIcon />
                    </HStack>
                  </a>
                </HStack>
              </Alert>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
