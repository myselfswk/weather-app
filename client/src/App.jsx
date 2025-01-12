import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const App = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const chatboxRef = useRef(null);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const getLocation = async () => {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by your browser.");
      return null;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          resolve({ latitude, longitude });
        },
        (err) => {
          console.error("Error retrieving location:", err.message);
          reject(err);
        }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setQuery("");
    setIsLoading(true);

    // Add user message to the chat
    const newMessage = { sender: "user", text: query };
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    try {
      // Get user location
      const userLocation = await getLocation();
      setLocation(userLocation); // Update location state

      const sessionId = "user-session-1234";
      const languageCode = "en";

      // Send query to backend with location
      const res = await axios.post("http://localhost:8080/dialogflow-webhook", {
        queryText: query,
        locationLatLong: userLocation,
        sessionId,
        languageCode,
      });

      const botResponseText = res.data.fulfillmentText;

      // Format response
      const formattedResponse = botResponseText
        .split("\n")
        .map((line, index) => {
          if (index === 0) {
            return <div key={index}>{line}</div>;
          } else {
            return (
              <div key={index} style={{ marginLeft: "20px" }}>
                • {line}
              </div>
            );
          }
        });

      const botResponse = {
        sender: "bot",
        text: formattedResponse,
      };
      setMessages((prevMessages) => [...prevMessages, botResponse]);
    } catch (error) {
      console.error("Error:", error.message);
      const errorMessage = {
        sender: "bot",
        text: "An error occurred while processing your request.",
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Scroll to the bottom of the chatbox when messages are updated
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Weather Chatbot</h1>
      <div style={styles.chatbox} ref={chatboxRef}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={
              message.sender === "user"
                ? { ...styles.messageContainer, justifyContent: "flex-end" }
                : { ...styles.messageContainer, justifyContent: "flex-start" }
            }
          >
            <div
              style={
                message.sender === "user"
                  ? styles.userMessage
                  : styles.botMessage
              }
            >
              {message.sender === "bot" ? message.text : message.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Type your message..."
          style={styles.input}
          disabled={isLoading}
        />
        <button type="submit" style={styles.button} disabled={isLoading}>
          {isLoading ? "Loading..." : "Send"}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    textAlign: "center",
    maxWidth: "600px",
    margin: "auto",
    backgroundColor: "#f4f4f4",
    borderRadius: "10px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    position: "relative",
    height: "96vh", // Full screen height
    display: "flex",
    flexDirection: "column",
  },
  header: {
    marginBottom: "20px",
    color: "#333",
  },
  chatbox: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "10px",
    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.1)",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px", // Add space between messages
  },
  messageContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px",
  },
  userMessage: {
    backgroundColor: "#007BFF",
    color: "white",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "70%",
  },
  botMessage: {
    backgroundColor: "#f1f1f1",
    color: "#333",
    padding: "10px",
    borderRadius: "10px",
    maxWidth: "70%",
  },
  form: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    borderTop: "1px solid #ccc",
  },
  input: {
    padding: "10px",
    width: "70%",
    borderRadius: "5px",
    border: "1px solid #ccc",
    marginRight: "10px",
  },
  button: {
    padding: "10px 15px",
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default App;