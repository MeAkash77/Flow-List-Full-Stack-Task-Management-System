"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  LinearProgress,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff, Refresh } from "@mui/icons-material";
import Link from "next/link";
import NavBar from "@/app/components/NavBar";
import { getAppTheme } from "@/app/theme";

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState<{ id: number; username: string } | null>(
    null,
  );
  const router = useRouter();
  
  const theme = useMemo(() => getAppTheme(isDarkMode), [isDarkMode]);

  // Load saved preferences after mount
  useEffect(() => {
    setMounted(true);
    
    const storedDarkMode = JSON.parse(
      localStorage.getItem("darkMode") || "true"
    );
    setIsDarkMode(storedDarkMode);

    const storedUser = JSON.parse(
      localStorage.getItem("currentUser") || "null"
    );
    if (storedUser) setUser(storedUser);
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("darkMode", JSON.stringify(next));
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
    router.push("/auth/login");
  };

  const handleRegister = async () => {
    // Client-side validation
    if (!username || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("Sending registration request for username:", username);
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          username, 
          password 
        }),
      });

      // Get response as text first for debugging
      const responseText = await response.text();
      console.log("Response status:", response.status);
      console.log("Response text:", responseText);

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error("Server returned an invalid response");
      }

      if (response.ok) {
        console.log("Registration successful:", data);
        router.push("/auth/login?registered=true");
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      console.error("Error during registration:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show a simple loading state on first render to match server
  if (!mounted) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        fontFamily: "sans-serif"
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: isDarkMode
            ? "radial-gradient(circle at 20% 20%, #0a3d2c 0, #060f0b 35%, #040907 100%)"
            : "radial-gradient(circle at 12% 18%, #d9f2e5 0, #eef7f2 45%, #f5f8f6 100%)",
          color: isDarkMode ? "#e6f3ec" : "#0d2621",
          transition: "background 0.3s ease",
        }}
      >
        <NavBar
          user={user}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          onLogout={logout}
        />

        <Container maxWidth="md" sx={{ py: 6 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              background: isDarkMode
                ? "linear-gradient(135deg, #0f3326, #0d5a3f)"
                : "linear-gradient(135deg, #0f8f5f, #0a6c45)",
              color: "#ffffff",
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  Join Flowlist
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Create your account to sync tasks, planner, focus sessions,
                  and insights everywhere you work.
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Refresh />}
                    onClick={() => {
                      setUsername("");
                      setPassword("");
                      setConfirmPassword("");
                      setError("");
                    }}
                    sx={{ color: "#ffffff" }}
                  >
                    Clear form
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 4,
              backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff",
              border: "1px solid",
              borderColor: isDarkMode
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            <Stack spacing={2} mb={2}>
              <Typography variant="h5" fontWeight={800}>
                Register
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Start with a username and password. Already have an account?{" "}
                <Link href="/auth/login" style={{ color: theme.palette.primary.main }}>
                  Login
                </Link>
              </Typography>
            </Stack>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                disabled={isLoading}
                required
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                disabled={isLoading}
                required
                inputProps={{ minLength: 6 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm password"
                type={showConfirmPassword ? "text" : "password"}
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                disabled={isLoading}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleRegister}
                disabled={isLoading}
                size="large"
                sx={{ 
                  mt: 2,
                  color: "#ffffff",
                  '&:disabled': {
                    opacity: 0.6
                  }
                }}
              >
                {isLoading ? "Creating account..." : "Register"}
              </Button>
            </Stack>

            <Stack direction="row" justifyContent="space-between" mt={3}>
              <Link href="/auth/login" style={{ color: theme.palette.primary.main }}>
                Back to login
              </Link>
              <Link href="/auth/forgot-password" style={{ color: theme.palette.primary.main }}>
                Forgot password?
              </Link>
            </Stack>

            {isLoading && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}