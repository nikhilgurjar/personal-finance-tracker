'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { AutoAwesome, QuestionAnswer, Summarize } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { authedJson } from '@/lib/apiClient';

export default function AiPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [question, setQuestion] = useState('Can I repay INR 15000 this month?');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  const { data, isLoading, error } = useAuthedQuery<any>(
    user,
    ['monthly-review', user?.uid, month],
    `/api/ai/monthly-review?month=${month}`
  );

  const queryMutation = useMutation({
    mutationFn: async () => authedJson<any>(user, '/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
    onSuccess: (result) => setAnswer(result.answer),
  });

  if (!user) return null;

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: 'primary.main', color: 'white', borderRadius: 2, display: 'flex' }}>
              <AutoAwesome />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800}>AI Insights</Typography>
              <Typography variant="body2" color="text.secondary">
                Optional Gemini-powered review and natural language finance questions.
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Summarize color="primary" />
                    <Typography variant="h6" fontWeight={800}>Monthly Review</Typography>
                  </Box>
                  <TextField
                    label="Month"
                    type="month"
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  {error && <Alert severity="error">Failed to load review.</Alert>}
                  {isLoading || !data ? (
                    <Skeleton variant="rounded" height={220} />
                  ) : (
                    <>
                      {!data.aiEnabled && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Add GEMINI_API_KEY to enable AI wording. Showing deterministic review.
                        </Alert>
                      )}
                      <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', m: 0 }}>
                        {data.review}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <QuestionAnswer color="primary" />
                    <Typography variant="h6" fontWeight={800}>Ask Your Finances</Typography>
                  </Box>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Question"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => queryMutation.mutate()}
                    disabled={queryMutation.isPending || !question.trim()}
                  >
                    Ask
                  </Button>
                  {queryMutation.isError && <Alert severity="error" sx={{ mt: 2 }}>Failed to answer question.</Alert>}
                  {answer && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      {answer}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ResponsiveLayout>
  );
}
