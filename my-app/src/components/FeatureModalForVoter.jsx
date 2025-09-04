import React from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton} from "@chakra-ui/react";
import VoteQuestion from "./VoterFeatures/VoteQuestion";
import ClaimReward from "./VoterFeatures/ClaimReward";
import ViewQuestion from "./VoterFeatures/ViewQuestion";

const FeatureModalForVoter = ({ featureId, onClose }) => {
  const renderFeatureContent = () => {
    switch (featureId) {
      case "voteQuestion":
        return <VoteQuestion />;
      case "claimReward":
        return <ClaimReward />;
      case "viewQuestion":
        return <ViewQuestion />;
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