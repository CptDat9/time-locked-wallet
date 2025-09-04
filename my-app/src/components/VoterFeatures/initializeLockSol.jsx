import React, { useEffect, useMemo, useState } from "react";
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
  Tooltip,
  Tag,
  Progress,
  Alert,
  AlertIcon,
  Badge,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import initializeLockSol from "../../utils/initializeLockSol";
import { Buffer } from "buffer";

// Small helper to format seconds => d:h:m:s
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
  return { remaining, days, hours, minutes, seconds, now };
}

// Convert datetime-local input value to epoch seconds
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

// Explorer link for Devnet
function txLink(sig) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

export default function InitializeLockSol() {
  const toast = useToast();

  const [connectedPk, setConnectedPk] = useState(null);
  const [checkingWallet, setCheckingWallet] = useState(true);

  const [amount, setAmount] = useState(0.1); // SOL
  const [beneficiary, setBeneficiary] = useState("");
  const [description, setDescription] = useState("");
  const [unlockLocal, setUnlockLocal] = useState(""); // datetime-local string

  const unlockTs = useMemo(() => toEpochSeconds(unlockLocal), [unlockLocal]);
  const { remaining, days, hours, minutes, seconds } = useCountdown(unlockTs ?? 0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSig, setLastSig] = useState(null);

  // Detect Phantom connection
  useEffect(() => {
    const probe = async () => {
      try {
        if (window?.solana?.isPhantom) {
          // If already connected, Phantom exposes publicKey
          if (!window.solana.publicKey) {
            // try to connect silently
            await window.solana.connect({ onlyIfTrusted: true });
          }
          setConnectedPk(window.solana.publicKey?.toBase58() || null);
        }
      } catch {
        // ignore silent errors
      } finally {
        setCheckingWallet(false);
      }
    };
    probe();
  }, []);

  const handleConnect = async () => {
    try {
      if (!window?.solana?.isPhantom) {
        toast({
          title: "Phantom chưa được cài",
          description: "Hãy cài Phantom Wallet để tiếp tục.",
          status: "warning",
        });
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
    if (!connectedPk) return "Bạn chưa kết nối Phantom Wallet.";
    if (!amount || Number(amount) <= 0) return "Số SOL phải > 0.";
    if (!beneficiary) return "Nhập địa chỉ người nhận (beneficiary).";
    if (!unlockTs) return "Chọn thời điểm mở khóa.";
    if (unlockTs <= Math.floor(Date.now() / 1000)) return "Thời điểm mở khóa phải ở tương lai.";
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
      const sig = await initializeLockSol(Number(amount), unlockTs, description || "", beneficiary.trim());
      setLastSig(sig);
      toast({
        title: "Khởi tạo thành công",
        description: `Tx: ${sig.substring(0, 8)}...`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (e) {
      toast({ title: "Giao dịch thất bại", description: e.message, status: "error", duration: 7000 });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <Box p={{ base: 4, md: 8 }}>
      <VStack align="stretch" spacing={6} maxW="900px" mx="auto">
        <HStack justify="space-between">
          <Heading size="lg" color="teal.600">Time‑Locked SOL Wallet</Heading>
          <HStack>
            {connectedPk ? (
              <Tag colorScheme="green" size="lg">{connectedPk.slice(0, 4)}...{connectedPk.slice(-4)}</Tag>
            ) : (
              <Button colorScheme="teal" onClick={handleConnect} isLoading={checkingWallet}>Kết nối ví</Button>
            )}
          </HStack>
        </HStack>

        <Box p={6} bg="white" borderWidth="1px" borderRadius="lg" boxShadow="md">
          <VStack align="stretch" spacing={5}>
            <FormControl isRequired>
              <FormLabel>Mô tả (tuỳ chọn)</FormLabel>
              <Textarea placeholder="Ví dụ: Quỹ thưởng cho Dat vào ngày thi xong" value={description} onChange={(e) => setDescription(e.target.value)} />
            </FormControl>

            <HStack spacing={5} align="start" flexWrap="wrap">
              <FormControl isRequired minW={{ base: "100%", md: "250px" }}>
                <FormLabel>Số lượng SOL</FormLabel>
                <InputGroup>
                  <InputLeftAddon children="SOL" />
                  <NumberInput value={amount} min={0} precision={4} onChange={(_, v) => setAmount(v || 0)} w="full">
                    <NumberInputField placeholder="0.10" />
                  </NumberInput>
                </InputGroup>
                <Text fontSize="xs" color="gray.500" mt={1}>Số SOL sẽ được khoá trong ví.</Text>
              </FormControl>

              <FormControl isRequired minW={{ base: "100%", md: "320px" }}>
                <FormLabel>Thời điểm mở khoá</FormLabel>
                <Input type="datetime-local" value={unlockLocal} onChange={(e) => setUnlockLocal(e.target.value)} />
                <Text fontSize="xs" color="gray.500" mt={1}>Sử dụng múi giờ của hệ thống.</Text>
              </FormControl>
            </HStack>

            <FormControl isRequired>
              <FormLabel>Địa chỉ Beneficiary</FormLabel>
              <Input placeholder="Ví dụ: 7G1..." value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
              <Text fontSize="xs" color="gray.500" mt={1}>Sau khi tới thời điểm mở khoá, SOL có thể chuyển cho địa chỉ này.</Text>
            </FormControl>

            {/* Countdown / Preview */}
            {unlockTs ? (
              <Box>
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Badge colorScheme={remaining > 0 ? "blue" : "green"}>{remaining > 0 ? "Đếm ngược" : "Đã tới thời điểm mở khoá"}</Badge>
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
              <Alert status="info">
                <AlertIcon /> Chọn thời điểm mở khoá để xem đếm ngược.
              </Alert>
            )}

            <Divider />

            <HStack justify="space-between">
              <Button variant="outline" onClick={() => {
                setAmount(0.1);
                setBeneficiary("");
                setDescription("");
                setUnlockLocal("");
                setLastSig(null);
              }}>Reset</Button>

              <Button colorScheme="teal" onClick={onSubmit} isLoading={isSubmitting} loadingText="Đang khởi tạo">
                Khởi tạo Time‑Lock
              </Button>
            </HStack>

            {lastSig && (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <HStack spacing={2}>
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

        <Box>
          <Text fontSize="sm" color="gray.500">
            Lưu ý: Mạng Devnet. Bạn cần SOL Devnet để thực hiện giao dịch.
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
