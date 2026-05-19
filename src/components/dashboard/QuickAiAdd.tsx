'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { getIdToken } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Card,
  CardContent,
  Skeleton,
  CircularProgress,
  Collapse,
} from '@mui/material';
import { AutoAwesome, ArrowForward } from '@mui/icons-material';

async function apiFetch(path: string, user: any, opts: RequestInit = {}) {
  const token = await getIdToken(user);
  return fetch(path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

export function QuickAiAdd() {
  const { user } = useAuthContext();
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');

  // Fetch AI narrative insight
  const { data: narrativeData, isLoading: narrativeLoading } = useQuery({
    queryKey: ['ai-narrative', user?.uid],
    queryFn: async () => {
      const res = await apiFetch('/api/ai/dashboard-narrative', user);
      if (!res.ok) throw new Error('Failed to fetch narrative');
      return res.json();
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || parsing) return;

    setParsing(true);
    setError('');

    try {
      const res = await apiFetch('/api/ai/parse-transaction', user, {
        method: 'POST',
        body: JSON.stringify({ text: inputText }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse transaction');
      }

      const parsedData = await res.json();
      
      // Clear input
      setInputText('');

      // Redirect with prefilled parameters
      const type = parsedData.type || 'expense';
      const destination = type === 'income' ? '/incomes' : '/expenses';
      router.push(`${destination}?prefill=${encodeURIComponent(JSON.stringify(parsedData))}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'AI failed to parse. Try typing in simpler format.');
    } finally {
      setParsing(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* AI Narrative Section */}
      {narrativeLoading ? (
        <Card
          sx={{
            mb: 3,
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Box display="flex" gap={2} alignItems="center">
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="text" width="80%" height={24} />
            </Box>
          </CardContent>
        </Card>
      ) : (
        narrativeData?.narrative && (
          <Card
            sx={{
              mb: 3,
              background: 'linear-gradient(135deg, rgba(237, 233, 254, 0.6) 0%, rgba(219, 234, 254, 0.6) 100%)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.4)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
              overflow: 'hidden',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 4,
                height: '100%',
                background: 'linear-gradient(to bottom, #8b5cf6, #3b82f6)',
              }
            }}
          >
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 }, pl: 3 }}>
              <Box display="flex" gap={2} alignItems="flex-start">
                <AutoAwesome sx={{ color: '#8b5cf6', mt: 0.3, animation: 'pulse 2s infinite' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="primary.dark" sx={{ mb: 0.5 }}>
                    AI Cash Flow Narrative
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1e293b', lineHeight: 1.5, fontWeight: 500 }}>
                    {narrativeData.narrative}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )
      )}

      {/* Quick Add Bar */}
      <Box component="form" onSubmit={handleParse} sx={{ width: '100%' }}>
        <TextField
          fullWidth
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={parsing}
          placeholder="Quick Add with AI: 'Spent 500 on coffee from HDFC' or 'Received 12000 refund'..."
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 4,
              background: 'white',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
              '&:hover fieldset': {
                borderColor: '#8b5cf6',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#8b5cf6',
                borderWidth: '2px',
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AutoAwesome sx={{ color: '#8b5cf6' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {parsing ? (
                  <CircularProgress size={20} sx={{ color: '#8b5cf6' }} />
                ) : (
                  <IconButton
                    type="submit"
                    disabled={!inputText.trim()}
                    sx={{
                      color: '#8b5cf6',
                      background: inputText.trim() ? '#ede9fe' : 'transparent',
                      '&:hover': {
                        background: '#ddd6fe',
                      },
                    }}
                  >
                    <ArrowForward />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
        />
        <Collapse in={!!error}>
          <Typography color="error" variant="caption" sx={{ mt: 1, ml: 2, display: 'block' }}>
            {error}
          </Typography>
        </Collapse>
      </Box>
    </Box>
  );
}
