import React from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton} from "@chakra-ui/react";
import InitializeLockSol from "./VoterFeatures/initializeLockSol";
import InitializeLockSpl from "./VoterFeatures/initializeLockSpl";
import WithdrawSol from "./VoterFeatures/withdrawSol";
import WithdrawSpl from "./VoterFeatures/withdrawSpl";

const FeatureModalForVoter = ({ featureId, onClose }) => {
  const renderFeatureContent = () => {
    switch (featureId) {
      case "initializeLockSol":
        return <InitializeLockSol />;
      case "initializeLockSpl":
        return <InitializeLockSpl />;
      case "withdrawSol":
        return <WithdrawSol />;
      case "withdrawSpl":
        return <WithdrawSpl />;
      default:
        return <p>Unknown feature.</p>;
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} isCentered size="6xl">
      <ModalOverlay />
      <ModalContent maxW="90vw" minH="80vh">
        <ModalHeader>Feature Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6}>{renderFeatureContent()}</ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default FeatureModalForVoter;