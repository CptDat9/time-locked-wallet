import React, { useState } from "react";
import { Box, Button, Heading, Flex, Grid } from "@chakra-ui/react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FeatureModalForAdmin from "../components/FeatureModalForAdmin";
import {
  FaUserPlus,
  FaUserMinus,
  FaPlusCircle,
  FaUsers,
  FaCertificate,
  FaCog,
  FaMinusCircle,
  FaInfoCircle,
} from "react-icons/fa";

const AdminPage = () => {
  const [currentFeature, setCurrentFeature] = useState(null);

  const features = [
    { id: "createQuest", label: "Create Quest", icon: <FaCertificate /> },
    { id: "endQuest", label: "End Quest", icon: <FaMinusCircle /> },
    { id: "viewQuestion", label: "View Question", icon: <FaInfoCircle /> },
    { id: "viewTotalVotes", label: "View Total Votes", icon: <FaInfoCircle /> },
    { id: "viewAllActiveQuestions", label: "View All Active Questions", icon: <FaInfoCircle /> },
  ];

  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      position="relative"
      overflow="hidden"
    >
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
          opacity: 1.0,
        }}
      >
        <source src="/videos/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <Navbar isLoggedIn={true} title="Admin Panel" />
      <Box
        as="main"
        flex="1"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={4}
      >
        {/* Heading */}
        <Box
          bg="rgba(0, 0, 0, 0.7)"
          borderRadius="md"
          p={4}
          mb={8}
          boxShadow="lg"
        >
          <Heading
            color="yellow.300"
            fontSize="4xl"
            fontWeight="extrabold"
            textAlign="center"
          >
            ADMIN FEATURES
          </Heading>
        </Box>

        {/* Feature Grid */}
        <Grid
          templateColumns={{
            base: "repeat(1, 1fr)", // 1 column on small screens
            md: "repeat(2, 1fr)", // 2 columns on medium screens
            lg: "repeat(3, 1fr)", // 3 columns on large screens
          }}
          gap={6} // Reduce gap between buttons
          px={4}
          justifyContent="center"
        >
          {features.map((feature) => (
            <Button
              key={feature.id}
              leftIcon={feature.icon}
              colorScheme="teal"
              size="md" // Smaller size
              minWidth="180px" // Minimum width
              minHeight="70px" // Minimum height
              fontSize="lg" // Smaller font size
              fontWeight="bold"
              borderRadius="md"
              boxShadow="lg"
              textAlign="center"
              whiteSpace="normal"
              overflow="hidden"
              textOverflow="ellipsis"
              _hover={{
                transform: "translateY(-3px)",
                boxShadow: "2xl",
                backgroundColor: "teal.600",
              }}
              _active={{
                transform: "scale(0.95)",
                backgroundColor: "teal.700",
              }}
              onClick={() => setCurrentFeature(feature.id)}
            >
              {feature.label}
            </Button>
          ))}
        </Grid>
      </Box>
      <Footer />
      {currentFeature && (
        <FeatureModalForAdmin
          featureId={currentFeature}
          onClose={() => setCurrentFeature(null)}
        />
      )}
    </Box>
  );
};

export default AdminPage;