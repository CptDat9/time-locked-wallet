import React from "react";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from "@chakra-ui/react";
import CreateQuest from "./AdminFeatures/CreateQuest";
import EndQuest from "./AdminFeatures/EndQuest";
import ViewQuestion from "./AdminFeatures/ViewQuestion";
import ViewTotalVotes from "./AdminFeatures/ViewTotalVotes";
import ViewAllActiveQuestions from "./AdminFeatures/ViewAllActiveQuestions";

const FeatureModalForAdmin = ({ featureId, onClose }) => {
  const renderFeatureContent = () => {
    switch (featureId) {
      case "createQuest":
        return <CreateQuest />;
      case "endQuest":
        return <EndQuest />;
      case "viewQuestion":
        return <ViewQuestion />;
      case "viewTotalVotes":
        return <ViewTotalVotes />;
      case "viewAllActiveQuestions":
        return <ViewAllActiveQuestions />;
      default:
        return <p>Unknown feature.</p>;
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Feature Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody>{renderFeatureContent()}</ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default FeatureModalForAdmin;