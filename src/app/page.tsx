'use client';

import { useAuthContext } from '@/components/AuthProvider';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/auth';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Tabs,
  Tab,
  Alert,
  Fade,
  Paper,
} from '@mui/material';
import { AccountBalanceWallet } from '@mui/icons-material';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const hasRedirected = useRef(false);

  const goToDashboard = useCallback(() => {
    if (hasRedirected.current) {
      return;
    }

    hasRedirected.current = true;
    router.replace('/dashboard');
  }, [router]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      goToDashboard();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      setError('');
      await signInWithEmail(email, password);
      goToDashboard();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      setError('');
      await signUpWithEmail(email, password);
      goToDashboard();
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Redirect authenticated users to dashboard (must be in effect, not render body)
  useEffect(() => {
    if (user) {
      goToDashboard();
    }
  }, [user, goToDashboard]);

  if (user) {
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        p: 2,
      }}
    >
      <Fade in={true} timeout={800}>
        <Container maxWidth="sm">
          <Card 
            elevation={24}
            sx={{ 
              width: '100%', 
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <Box sx={{ bgcolor: 'primary.main', p: 4, textAlign: 'center', color: 'white' }}>
              <AccountBalanceWallet sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
              <Typography variant="h4" component="h1" fontWeight={800} gutterBottom>
                Finance Tracker
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>
                Track your income, expenses, savings, and goals seamlessly
              </Typography>
            </Box>
            
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="auth tabs">
                <Tab label="Sign In" />
                <Tab label="Sign Up" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box component="form" onSubmit={(event) => { event.preventDefault(); handleEmailSignIn(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  type="button"
                  variant="outlined"
                  fullWidth
                  onClick={handleGoogleSignIn}
                  sx={{ mb: 2 }}
                >
                  Sign in with Google
                </Button>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                >
                  Sign In
                </Button>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box component="form" onSubmit={(event) => { event.preventDefault(); handleEmailSignUp(); }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  type="button"
                  variant="outlined"
                  fullWidth
                  onClick={handleGoogleSignIn}
                  sx={{ mb: 2 }}
                >
                  Sign up with Google
                </Button>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                >
                  Sign Up
                </Button>
              </Box>
            </TabPanel>
            </CardContent>
          </Card>
        </Container>
      </Fade>
    </Box>
  );
}
