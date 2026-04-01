import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import html2pdf from 'html2pdf.js';

// Material UI Core Imports
import { 
  ThemeProvider, createTheme, CssBaseline, 
  Container, Box, Typography, Button, TextField, 
  Card, CardContent, Divider, Grid, AppBar, 
  Toolbar, IconButton, CircularProgress, 
  LinearProgress, Select, MenuItem, InputLabel, 
  FormControl, Chip, Avatar, Tooltip, Paper, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Checkbox, FormControlLabel, Link
} from '@mui/material';

// Material UI Icons
import {
  UploadCloud, CheckCircle, XCircle, Map, Target, 
  ArrowLeft, Download, Moon, Sun, ExternalLink, 
  PlayCircle, BarChart, LogOut, LayoutDashboard, 
  PlusCircle, BookOpen, User as UserIcon, Briefcase, Calendar,
  ChevronRight, Play, Bell, Settings, BadgeCheck, Eye, EyeOff, Sparkles, TrendingUp, Youtube, ListChecks
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ROLES = [
    "Full Stack Developer", "Frontend Engineer", "Backend Developer", 
    "Data Scientist", "AI Prompt Engineer", "DevOps Engineer", 
    "Product Manager", "UI/UX Designer", "Cloud Architect",
    "Cyber Security Analyst", "Other (Custom Role)"
];

const TOP_SKILLS = [
  { name: "Python", val: 95 }, { name: "JS", val: 88 }, { name: "React", val: 82 }, 
  { name: "Node", val: 75 }, { name: "AWS", val: 70 }, { name: "Docker", val: 68 }, 
  { name: "K8s", val: 65 }, { name: "SQL", val: 60 }, { name: "Go", val: 55 }, { name: "Rust", val: 50 }
];

// ==========================================
// 1. CUSTOM THEME SYSTEM (INDUSTRIAL MODERN)
// ==========================================
const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
      contrastText: '#ffffff',
    },
  background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-1px' },
    h2: { fontWeight: 800, fontSize: '1.8rem' },
    h3: { fontWeight: 700, fontSize: '1.1rem' },
    h4: { fontWeight: 900, fontSize: '1.75rem' },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 2, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
  },
});

export default function App() {
  const mode = 'dark';
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  // Dark mode only - no persistence needed

  useEffect(() => {
    if (token) {
      axios.get(`${API_URL}/auth/profile`, { headers: { 'x-auth-token': token } })
        .then(res => setUser(res.data))
        .catch(() => logout());
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentView('auth');
    toast.success("Signed out safely.");
  };

  return (
      <ThemeProvider theme={getTheme('dark')}>
      <CssBaseline />
      <Toaster position="top-center" />
      
      {!token ? (
        <AuthScreen setToken={setToken} setCurrentView={setCurrentView} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            <Navbar 
             currentView={currentView} 
             setCurrentView={setCurrentView} 
             logout={() => setLogoutDialogOpen(true)} 
             user={user} 
          />
          <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }}>
            {currentView === 'dashboard' && <DashboardScreen token={token} setCurrentView={setCurrentView} setSelectedRoadmap={setSelectedRoadmap} user={user} />}
            {currentView === 'generator' && <GeneratorScreen token={token} setSelectedRoadmap={setSelectedRoadmap} selectedRoadmap={selectedRoadmap} />}
          </Container>

          <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)}>
            <DialogTitle sx={{ fontWeight: 800 }}>Confirm Sign-off</DialogTitle>
            <DialogContent>
               <Typography color="text.secondary">Ready to end your session?</Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setLogoutDialogOpen(false)} color="inherit">Stay</Button>
              <Button onClick={logout} variant="contained" color="error">Sign-off</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </ThemeProvider>
  );
}

// ==========================================
// NAVBAR COMPONENT
// ==========================================
function Navbar({ currentView, setCurrentView, logout, user }) {
  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Toolbar sx={{ justifyContent: 'space-between', px: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: 1, background: '#0ea5e9', color: '#fff', display: 'flex' }}>
              <Target size={22} />
            </Box>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 900, fontSize: '1.25rem' }}>Skillix AI</Typography>
            <Chip label="CLOUD ACTIVE" size="small" sx={{ borderRadius: 0, fontSize: '0.65rem', fontWeight: 900, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }} />
          </Box>

          <Box sx={{ display: 'flex', gap: { xs: 1, md: 3 }, alignItems: 'center' }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              <Button 
                onClick={() => setCurrentView('dashboard')} 
                startIcon={<LayoutDashboard size={18}/>}
                variant={currentView === 'dashboard' ? 'contained' : 'text'}
              > Dashboard </Button>
              <Button 
                onClick={() => setCurrentView('generator')} 
                startIcon={<UploadCloud size={18}/>}
                variant={currentView === 'generator' ? 'contained' : 'text'}
              > Career Analyst </Button>
            </Box>
            
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            {/* Toggle removed - Dark mode only */}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
               <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontWeight: 800, borderRadius: 1 }}>{user?.name?.charAt(0)}</Avatar>
               <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 900, lineHeight: 1 }}>{user?.name || 'User'}</Typography>
                  <Typography variant="caption" color="text.secondary">Member</Typography>
               </Box>
            </Box>

            <IconButton onClick={logout} color="error"><LogOut size={20}/></IconButton>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

// ==========================================
// DASHBOARD SCREEN
// ==========================================
function DashboardScreen({ token, setCurrentView, setSelectedRoadmap, user }) {
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/roadmaps/me`, { headers: { 'x-auth-token': token } })
            .then(res => setRoadmaps(res.data))
            .catch(() => toast.error("Database connection failure"))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
        <CircularProgress size={40} thickness={5} sx={{ mb: 2 }} />
        <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>LOADING ANALYTICS ENGINE...</Typography>
      </Box>
    );

    const activeRM = roadmaps[0];

    if (!activeRM) return (
        <Paper sx={{ textAlign: 'center', py: 10, borderRadius: 1, border: '2px dashed', borderColor: 'divider' }}>
            <Map size={60} style={{ opacity: 0.1, marginBottom: '24px' }}/>
            <Typography variant="h2" gutterBottom>No Roadmap Detected</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                Your professional footprint is currently unmapped. Initiate an AI analysis to begin.
            </Typography>
            <Button variant="contained" size="large" onClick={() => setCurrentView('generator')} startIcon={<PlusCircle size={20} />}>
                Build Now
            </Button>
        </Paper>
    );

    const steps = activeRM.analysisData?.roadmap || [];
    let totalT = 0, doneT = 0;
    const checkedData = activeRM.checkedTasks || {};
    steps.forEach((p, pIdx) => p.tasks?.forEach((t, tIdx) => {
        totalT++;
        if(checkedData[`${pIdx}-${tIdx}`]) doneT++;
    }));
    const progress = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;

    const cardStyle = {
      p: 3, height: '100%', borderRadius: 1,
      background: '#1e293b',
      border: '1px solid',
      borderColor: '#334155',
      transition: 'all 0.3s',
      '&:hover': { borderColor: 'primary.main', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
    };

    return (
        <Box>
            <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h1" sx={{ color: 'primary.main', textTransform: 'uppercase', fontSize: '1.25rem', mb: 1 }}>Skillix AI</Typography>
                  <Typography variant="h2" sx={{ mb: 0.5 }}>Welcome, {user?.name}</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.9rem' }}>Real Time AI analyst</Typography>
                </Box>
                <Button variant="contained" onClick={() => setCurrentView('generator')} sx={{ height: 44, px: 4 }}>New Analysis</Button>
            </Box>

            <Grid container spacing={4}>
                {/* Active Objective (Top Left) */}
                <Grid item xs={12} md={7}>
                    <Box sx={{ ...cardStyle, bgcolor: '#0f172a', border: '1px solid', borderColor: 'primary.main' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                           <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main' }}>CURRENT OBJECTIVE</Typography>
                           <Chip label="ACTIVE" size="small" color="primary" sx={{ borderRadius: 0, fontWeight: 900 }} />
                        </Box>
                        <Typography variant="h2" sx={{ fontSize: '1.5rem', mb: 1, textTransform: 'uppercase' }}>{activeRM.targetRole}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 700 }}>TERM: {activeRM.timeline}</Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                           <LinearProgress variant="determinate" value={progress} sx={{ flexGrow: 1, height: 6, borderRadius: 0 }} />
                           <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{progress}%</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>ANALYSIS EFFICIENCY: {progress}% COMPLETED</Typography>
                    </Box>
                </Grid>

                {/* Performance Metrics (Top Right) */}
                <Grid item xs={12} md={5}>
                    <Grid container spacing={2} sx={{ height: '100%' }}>
                        <Grid item xs={12}>
                            <Box sx={cardStyle}>
                               <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', display: 'block', mb: 1 }}>ATS MATCH EFFICIENCY</Typography>
                               <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                                  <Typography variant="h1" sx={{ fontWeight: 900, color: 'primary.main', lineHeight: 1 }}>{activeRM.analysisData?.atsScore || 0}%</Typography>
                                  <Box sx={{ pb: 1 }}>
                                     <TrendingUp size={24} color="#10b981" />
                                  </Box>
                               </Box>
                               <Typography variant="caption" sx={{ fontWeight: 900, color: '#10b981', mt: 2, display: 'block' }}>SYSTEM CALIBRATED: OPTIMAL</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Top Leading Skills (Wide Horizontal Card with Vertical Bars) */}
                <Grid item xs={12}>
                    <Box sx={cardStyle}>
                        <Typography variant="h3" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5, textTransform: 'uppercase' }}>
                           <BarChart size={24} /> Top Leading Skills
                        </Typography>
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-end', 
                            height: 240, 
                            gap: { xs: 1, md: 3 },
                            px: 2,
                            overflowX: 'auto',
                            pb: 4
                        }}>
                            {TOP_SKILLS.map((skill, i) => (
                                <Box key={i} sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    flexGrow: 1,
                                    height: '100%',
                                    minWidth: 40
                                }}>
                                    <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, transform: 'rotate(-45deg)', transformOrigin: 'center bottom' }}>{skill.name}</Typography>
                                    <Box sx={{ 
                                        width: '100%', 
                                        maxWidth: 40,
                                        height: `${skill.val}%`, 
                                        bgcolor: i < 3 ? 'primary.main' : 'divider',
                                        transition: 'all 1s ease-out',
                                        '&:hover': { bgcolor: 'primary.light' }
                                    }} />
                                    <Typography variant="caption" sx={{ fontWeight: 900, mt: 1, opacity: 0.5 }}>{skill.val}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Grid>

                {/* Action Phases (Timeline remains at bottom) */}
                <Grid item xs={12}>
                    <Box sx={cardStyle}>
                        <Typography variant="h3" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase' }}>
                           <Calendar size={22} /> ACTION PHASES
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
                            {steps.map((step, i) => (
                                <Box 
                                    key={i} 
                                    onClick={() => { setSelectedRoadmap(activeRM); setCurrentView('generator'); }}
                                    sx={{ 
                                        minWidth: 200, p: 2.5, border: '1px solid', borderColor: 'divider', 
                                        bgcolor: 'background.default', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' }
                                    }}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main' }}>PHASE 0{i+1}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 900, mt: 1, mb: 2, height: 40, overflow: 'hidden' }}>{step.phase.toUpperCase()}</Typography>
                                    <Chip label={`${step.tasks?.length || 0} GOALS`} size="small" sx={{ borderRadius: 0, fontWeight: 900, fontSize: '0.6rem' }} />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}

// ==========================================
// GENERATOR SCREEN
// ==========================================
function GeneratorScreen({ token, setSelectedRoadmap, selectedRoadmap }) {
    const [file, setFile] = useState(null);
    const [role, setRole] = useState('');
    const [customRole, setCustomRole] = useState('');
    const [timeline, setTimeline] = useState('4 Weeks');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState(selectedRoadmap ? selectedRoadmap.analysisData : null);
    const [checkedTasks, setCheckedTasks] = useState(selectedRoadmap ? selectedRoadmap.checkedTasks || {} : {});
    const roadmapRef = useRef();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalRole = role === "Other (Custom Role)" ? customRole : role;
        if(!file || !finalRole) return toast.error("Validation Error: Resume and Role Required.");
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('resume', file);
            formData.append('role', finalRole);
            formData.append('timeline', timeline);
            const res = await axios.post(`${API_URL}/analyze`, formData, { 
                headers: { 
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                } 
            });
            setAnalysis(res.data);
            setSelectedRoadmap(null);
            setCheckedTasks({});
            toast.success("Intelligence Analysis Complete.");
        } catch (err) { 
            console.error(err);
            toast.error(err.response?.data?.error || "Neural Link Critical Fault. Verify PDF."); 
        } finally { 
            setLoading(false); 
        }
    };

    const toggleTask = (pIdx, tIdx) => {
        const key = `${pIdx}-${tIdx}`;
        const newChecked = { ...checkedTasks, [key]: !checkedTasks[key] };
        setCheckedTasks(newChecked);
        if(selectedRoadmap?._id) {
            axios.patch(`${API_URL}/roadmaps/${selectedRoadmap._id}/tasks`, { checkedTasks: newChecked }, { headers: { 'x-auth-token': token } })
                .then(() => {})
                .catch(() => toast.error("Cloud Synced Failed. Verify link."));
        }
    };

    const handleExport = () => {
        const element = roadmapRef.current;
        const opt = {
          margin: 0.5, filename: `Skillix_Analysis_${role || 'Export'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    if (analysis) return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
                <Button onClick={() => setAnalysis(null)} startIcon={<ArrowLeft size={18}/>}>Back to Analyst</Button>
                <Button variant="contained" onClick={handleExport} startIcon={<Download size={18}/>}>Export to PDF</Button>
            </Box>
            
            <Paper ref={roadmapRef} sx={{ p: 5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900 }}>Automated Skill Mapping</Typography>
                <Typography variant="h1" sx={{ mb: 1, textTransform: 'uppercase' }}>{selectedRoadmap?.targetRole || role || 'User'} ROADMAP</Typography>
                <Typography variant="body1" sx={{ mb: 4, fontWeight: 800, opacity: 0.7 }}>ATS EFFICIENCY INDEX: {analysis.atsScore}%</Typography>
                <Grid container spacing={2} sx={{ mb: 6 }}>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#0f172a' }}>
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, display: 'block', mb: 1 }}>Verified Skills</Typography>
                            {analysis.verifiedSkills?.length ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {analysis.verifiedSkills.map((skill, idx) => (
                                        <Chip key={idx} label={skill} size="small" sx={{ bgcolor: '#111827', color: '#fff', border: '1px solid', borderColor: 'divider' }} />
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">No verified skills detected.</Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: '#0f172a' }}>
                            <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, display: 'block', mb: 1 }}>Missing Skills</Typography>
                            {analysis.missingSkills?.length ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {analysis.missingSkills.map((skill, idx) => (
                                        <Chip key={idx} label={skill} size="small" sx={{ bgcolor: '#111827', color: '#fff', border: '1px solid', borderColor: 'divider' }} />
                                    ))}
                                </Box>
                            ) : (
                                <Typography variant="body2" color="text.secondary">No missing skills identified.</Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>

                <Stack spacing={6}>
                    {analysis.roadmap?.map((p, pIdx) => (
                        <Box key={pIdx}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 900, borderRadius: 0, width: 32, height: 32, fontSize: '0.8rem' }}>{pIdx + 1}</Avatar>
                                <Typography variant="h3" sx={{ textTransform: 'uppercase' }}>{p.phase}</Typography>
                                <Divider sx={{ flexGrow: 1 }} />
                            </Box>
                            <Grid container spacing={1.5}>
                                {p.tasks?.map((t, tIdx) => (
                                    <Grid item xs={12} key={tIdx}>
                                        <Box 
                                            sx={{ 
                                                p: 2, border: '1px solid', borderColor: 'divider', 
                                                display: 'flex', flexDirection: 'column', gap: 1,
                                                bgcolor: checkedTasks[`${pIdx}-${tIdx}`] ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Checkbox 
                                                    checked={!!checkedTasks[`${pIdx}-${tIdx}`]} 
                                                    onChange={() => toggleTask(pIdx, tIdx)}
                                                    size="small" color="primary" 
                                                />
                                                <Typography variant="body2" sx={{ fontWeight: 700, textDecoration: checkedTasks[`${pIdx}-${tIdx}`] ? 'line-through' : 'none' }}>
                                                    {t}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ pl: 5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>FREE RESOURCES AVAILABLE:</Typography>
                                                <Button 
                                                    size="small" 
                                                    startIcon={<Youtube size={14}/>} 
                                                    component={Link}
                                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(t + ' ' + (selectedRoadmap?.targetRole || role))}`}
                                                    target="_blank"
                                                    sx={{ textTransform: 'none', fontWeight: 800, color: '#ef4444', fontSize: '0.65rem' }}
                                                >
                                                    YouTube Tutorial
                                                </Button>
                                            </Box>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))}
                </Stack>
            </Paper>
        </Box>
    );

    return (
        <Box maxWidth="sm" sx={{ mx: 'auto' }}>
            <Paper sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h1" align="center" gutterBottom sx={{ textTransform: 'uppercase', fontSize: '2.5rem', color: 'primary.main' }}>Skillix AI</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 6, fontWeight: 700 }}>AUTOMATED CAREER ANALYSIS & ROADMAP ENGINE</Typography>
                
                <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                        <Box sx={{ p: 6, border: '2px dashed', borderColor: file ? 'primary.main' : 'divider', bgcolor: 'rgba(14, 165, 233, 0.02)', position: 'relative' }}>
                            <input 
                              type="file" 
                              accept="application/pdf" 
                              onChange={e => setFile(e.target.files[0])} 
                              style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                            />
                            <UploadCloud size={48} style={{ color: '#0ea5e9', marginBottom: '16px' }} />
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>{file ? file.name : "UPLOAD RESUME"}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>DRAG & DROP OR PIN PDF FILE</Typography>
                        </Box>

                        <FormControl fullWidth variant="filled">
                            <InputLabel sx={{ fontWeight: 800 }}>TARGET PROFESSIONAL ROLE</InputLabel>
                            <Select value={role} onChange={e=>setRole(e.target.value)} required>
                                {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {role === "Other (Custom Role)" && (
                           <TextField 
                             label="Enter Custom Role Title" 
                             fullWidth 
                             variant="filled" 
                             value={customRole} 
                             onChange={e=>setCustomRole(e.target.value)} 
                             required
                           />
                        )}

                        <FormControl fullWidth variant="filled">
                            <InputLabel sx={{ fontWeight: 800 }}>TERM TIMELINE</InputLabel>
                            <Select value={timeline} onChange={e=>setTimeline(e.target.value)}>
                                <MenuItem value="4 Weeks">4 Weeks (EXECUTIVE)</MenuItem>
                                <MenuItem value="3 Months">3 Months (STANDARD)</MenuItem>
                                <MenuItem value="6 Months">6 Months (DEEP PHASE)</MenuItem>
                                <MenuItem value="12 Months">12 Months (FULL EVOLUTION)</MenuItem>
                            </Select>
                        </FormControl>

                        <Button 
                          variant="contained" 
                          type="submit" 
                          size="large" 
                          disabled={loading}
                          sx={{ height: 64, fontSize: '1.25rem' }}
                        >
                            {loading ? <CircularProgress size={30} color="inherit" /> : "Initiate AI Analysis"}
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Box>
    );
}

// ==========================================
// AUTH SCREEN
// ==========================================
function AuthScreen({ setToken, setCurrentView }) {
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (authMode === 'forgot') {
                const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
                toast.success(res.data.message);
                setAuthMode('reset');
            } else if (authMode === 'reset') {
                const res = await axios.post(`${API_URL}/auth/reset-password`, { email, resetToken, newPassword });
                toast.success(res.data.message);
                setAuthMode('login');
            } else {
                const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
                const payload = authMode === 'login' ? { email, password } : { name, email, password };
                const res = await axios.post(`${API_URL}${endpoint}`, payload);
                localStorage.setItem('token', res.data.token);
                setToken(res.data.token);
                setCurrentView('dashboard');
                toast.success("Login Successful.");
            }
        } catch (err) {
            toast.error(err.response?.data?.error || "Auth Sync Failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f172a' }}>
            <Paper sx={{ p: 5, width: '90%', maxWidth: '400px', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                   <Typography variant="h1" color="primary" sx={{ textTransform: 'uppercase', fontSize: '2rem' }}>Skillix AI</Typography>
                   <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.8 }}>REALTIME AI ANALYST</Typography>
                </Box>
                
                <form onSubmit={handleSubmit}>
                    <Stack spacing={2.5}>
                        {authMode === 'signup' && <TextField label="User Name" fullWidth variant="filled" value={name} onChange={e=>setName(e.target.value)} required />}
                        <TextField label="Email" type="email" fullWidth variant="filled" value={email} onChange={e=>setEmail(e.target.value)} required />
                        {(authMode === 'login' || authMode === 'signup') && (
                            <TextField 
                                label="Password" 
                                type={showPassword ? 'text' : 'password'} 
                                fullWidth variant="filled" value={password} onChange={e=>setPassword(e.target.value)} required 
                                InputProps={{
                                    endAdornment: <IconButton onClick={()=>setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</IconButton>
                                }}
                            />
                        )}
                        {authMode === 'reset' && (
                            <>
                                <TextField label="Code Token" fullWidth variant="filled" value={resetToken} onChange={e=>setResetToken(e.target.value)} required />
                                <TextField label="New Password" type="password" variant="filled" fullWidth value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
                            </>
                        )}

                        <Button variant="contained" type="submit" fullWidth size="large" sx={{ height: 50 }} disabled={loading}>
                            {loading ? <CircularProgress size={24} color="inherit" /> : authMode.toUpperCase()}
                        </Button>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Button size="small" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>{authMode === 'login' ? 'REGISTER' : 'GO TO LOGIN'}</Button>
                            {authMode === 'login' && <Button size="small" onClick={() => setAuthMode('forgot')}>FORGOT PASSWORD?</Button>}
                        </Box>
                    </Stack>
                </form>
            </Paper>
        </Box>
    );
}
