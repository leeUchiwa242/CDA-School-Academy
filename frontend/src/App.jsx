import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  TrendingUp, 
  Settings, 
  LogOut, 
  LogIn, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  FileDown, 
  ShieldAlert, 
  CheckCircle,
  AlertTriangle,
  History,
  X,
  ClipboardCheck,
  UserCog,
  Bell,
  CalendarClock,
  ArrowLeft,
  Filter,
  UserX,
  Layers,
  Percent
} from 'lucide-react';
import gsap from 'gsap';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  Legend
} from 'recharts';

const API_BASE = 'http://127.0.0.1:5000/api';

// Soft / muted SaaS palette used by the redesigned dashboard (violet, blue,
// pink kept deliberately low-saturation so nothing feels too vivid).
const PALETTE = {
  violet: '#6D5BD0', violetBg: '#F1EFFC',
  blue: '#4C7EDB', blueBg: '#EEF3FA',
  pink: '#C96BA0', pinkBg: '#FBF0F6',
  ink: '#1E2233'
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // App Global state
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [scales, setScales] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);

  // Notification Center (Administrateur only)
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  
  // Selected Academic Context
  const [term, setTerm] = useState('Trimestre 1');
  const [academicYear, setAcademicYear] = useState('2025-2026');

  // Loaders & Alerts
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // View wrapper ref for animations
  const viewRef = useRef(null);

  // Auto load user profile if token is set
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setUser(null);
    }
  }, [token]);

  // Route a Professeur straight to their own space, since they have no access to the admin views
  useEffect(() => {
    if (user?.role === 'Professeur' && currentView === 'dashboard') {
      setCurrentView('teacher_space');
    }
  }, [user]);

  // Load database entities when logged in & view or term/year changes
  useEffect(() => {
    if (token && user) {
      fetchGlobalData();
    }
  }, [token, user, currentView, term, academicYear]);

  // Poll the unread notification count for the bell icon, independently of
  // which view is currently open. Administrateur only — a Professeur must
  // never see these notifications.
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count);
      }
    } catch (e) {
      // silent: the badge simply keeps its last known value
    }
  };

  useEffect(() => {
    if (token && user?.role === 'Administrateur') {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 20000);
      return () => clearInterval(interval);
    }
  }, [token, user]);

  // GSAP transition when currentView changes
  useEffect(() => {
    if (viewRef.current) {
      gsap.fromTo(viewRef.current, 
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [currentView]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (e) {
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setStudents([]);
    setClasses([]);
    setSubjects([]);
    setScales([]);
    setStats(null);
    setLogs([]);
    setTeachers([]);
    setAssignments([]);
    setMyAssignments([]);
    setUnreadCount(0);
    setSelectedTeacherId(null);
    setCurrentView('dashboard');
  };

  const showNotification = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const fetchGlobalData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // Load Students
      if ((currentView === 'students' || currentView === 'grades' || currentView === 'bulletins' || currentView === 'dashboard') && user?.role !== 'Professeur') {
        const res = await fetch(`${API_BASE}/students`, { headers });
        if (res.ok) setStudents(await res.json());
      }

      // Load Classes (Seconde, Première, Terminale)
      if (currentView === 'students' || currentView === 'teachers' || currentView === 'bulletins' || currentView === 'dashboard') {
        const res = await fetch(`${API_BASE}/classes`, { headers });
        if (res.ok) setClasses(await res.json());
      }
      
      // Load Subjects
      if (currentView === 'grades' || currentView === 'config' || currentView === 'bulletins' || currentView === 'dashboard' || currentView === 'teachers') {
        const res = await fetch(`${API_BASE}/grades/subjects`, { headers });
        if (res.ok) setSubjects(await res.json());
      }

      // Load Conversion Scales
      if (currentView === 'config' || currentView === 'grades') {
        const res = await fetch(`${API_BASE}/grades/scale`, { headers });
        if (res.ok) setScales(await res.json());
      }

      // Load Dashboard Stats
      if (currentView === 'dashboard' && user?.role !== 'Professeur') {
        const res = await fetch(`${API_BASE}/dashboard/stats?term=${term}&academic_year=${academicYear}`, { headers });
        if (res.ok) setStats(await res.json());
      }

      // Load Logs (Admin Only)
      if (currentView === 'logs' && user?.role === 'Administrateur') {
        const res = await fetch(`${API_BASE}/auth/logs`, { headers });
        if (res.ok) setLogs(await res.json());
      }

      // Load Teachers & Assignments (Admin Only, "Professeurs" view)
      if (currentView === 'teachers' && user?.role === 'Administrateur') {
        const [tRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/teachers`, { headers }),
          fetch(`${API_BASE}/teachers/assignments`, { headers })
        ]);
        if (tRes.ok) setTeachers(await tRes.json());
        if (aRes.ok) setAssignments(await aRes.json());
      }

      // Load Teachers count only (Dashboard KPI card; the /teachers route is Administrateur-only)
      if (currentView === 'dashboard' && user?.role === 'Administrateur') {
        const res = await fetch(`${API_BASE}/teachers`, { headers });
        if (res.ok) setTeachers(await res.json());
      }

      // Load the logged-in teacher's own class/subject assignments
      if (currentView === 'teacher_space' && user?.role === 'Professeur') {
        const res = await fetch(`${API_BASE}/teachers/me/assignments`, { headers });
        if (res.ok) setMyAssignments(await res.json());
      }
    } catch (e) {
      showNotification("Erreur lors de la récupération des données.", false);
    } finally {
      setLoading(false);
    }
  };

  // Render routing based on state
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Top Banner Notifications */}
      {errorMsg && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444',
          color: '#991B1B', padding: '1rem', borderRadius: '8px', zIndex: 2000, boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <ShieldAlert size={20} />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', padding: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', backgroundColor: '#ECFDF5', borderLeft: '4px solid #10B981',
          color: '#065F46', padding: '1rem', borderRadius: '8px', zIndex: 2000, boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#065F46', cursor: 'pointer', padding: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {!token ? (
        <LoginView setToken={setToken} showNotification={showNotification} />
      ) : (
        <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
          {/* Sidebar */}
          <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} handleLogout={handleLogout} />
          
          {/* Main Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '2rem', overflowX: 'hidden' }}>
            {/* Header / Context Switcher */}
            <header style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              paddingBottom: '1.5rem', borderBottom: '1px solid var(--slate-200)', marginBottom: '2rem'
            }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                  {currentView === 'dashboard' && "Tableau de Bord / KPI"}
                  {currentView === 'students' && "Gestion des Étudiants"}
                  {currentView === 'grades' && "Saisie des Notes"}
                  {currentView === 'bulletins' && "Centre de Bulletins PDF"}
                  {currentView === 'config' && "Configuration Académique"}
                  {currentView === 'logs' && "Journal d'Audit"}
                  {currentView === 'teachers' && "Gestion des Professeurs"}
                  {currentView === 'teacher_space' && "Mon Espace Professeur"}
                  {currentView === 'notifications' && "Centre de Notifications"}
                  {currentView === 'teacher_calendar' && "Calendrier des Professeurs"}
                  {currentView === 'teacher_detail' && "Fiche Professeur"}
                </h1>
                <p style={{ color: 'var(--slate-700)', fontSize: '0.9rem' }}>
                  Connecté en tant que <strong>{user?.email}</strong> ({user?.role})
                </p>
              </div>

              {/* Context Selector */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {user?.role === 'Administrateur' && (
                  <button
                    onClick={() => setCurrentView('notifications')}
                    title="Centre de notifications"
                    style={{
                      position: 'relative', background: 'none', border: '1px solid var(--slate-200)',
                      borderRadius: '8px', width: '40px', height: '40px', padding: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                  >
                    <Bell size={19} style={{ color: currentView === 'notifications' ? 'var(--primary)' : 'var(--slate-700)' }} />
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#EF4444', color: 'white',
                        borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, minWidth: '18px', height: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                )}
                <div>
                  <label htmlFor="academic-year-select" style={{ display: 'none' }}>Année académique</label>
                  <select id="academic-year-select" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }}>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="term-select" style={{ display: 'none' }}>Période / Trimestre</label>
                  <select id="term-select" value={term} onChange={(e) => setTerm(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }}>
                    <option value="Trimestre 1">Trimestre 1</option>
                    <option value="Trimestre 2">Trimestre 2</option>
                    <option value="Trimestre 3">Trimestre 3</option>
                  </select>
                </div>
              </div>
            </header>

            {/* View Container */}
            <main ref={viewRef} style={{ flex: 1 }}>
              {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-700)' }}>Chargement en cours...</div>}
              
              {!loading && currentView === 'dashboard' && (
                <DashboardView token={token} user={user} term={term} academicYear={academicYear} students={students} classes={classes} teachers={teachers} unreadCount={unreadCount} />
              )}
              {!loading && currentView === 'students' && (
                <StudentsView token={token} user={user} students={students} classes={classes} term={term} academicYear={academicYear} fetchStudents={fetchGlobalData} showNotification={showNotification} />
              )}
              {!loading && currentView === 'grades' && (
                <GradesView token={token} user={user} students={students} subjects={subjects} fetchGlobalData={fetchGlobalData} term={term} academicYear={academicYear} showNotification={showNotification} />
              )}
              {!loading && currentView === 'bulletins' && (
                <BulletinsView token={token} students={students} classes={classes} term={term} academicYear={academicYear} showNotification={showNotification} />
              )}
              {!loading && currentView === 'config' && (
                <ConfigView token={token} user={user} subjects={subjects} scales={scales} classes={classes} academicYear={academicYear} fetchGlobalData={fetchGlobalData} showNotification={showNotification} />
              )}
              {!loading && currentView === 'logs' && user?.role === 'Administrateur' && (
                <LogsView logs={logs} />
              )}
              {!loading && currentView === 'teachers' && user?.role === 'Administrateur' && (
                <TeachersAdminView
                  token={token} teachers={teachers} assignments={assignments} classes={classes} subjects={subjects}
                  academicYear={academicYear} fetchGlobalData={fetchGlobalData} showNotification={showNotification}
                  onViewTeacher={(id) => { setSelectedTeacherId(id); setCurrentView('teacher_detail'); }}
                />
              )}
              {!loading && currentView === 'teacher_space' && user?.role === 'Professeur' && (
                <TeacherSpaceView token={token} myAssignments={myAssignments} term={term} academicYear={academicYear} showNotification={showNotification} />
              )}
              {!loading && currentView === 'notifications' && user?.role === 'Administrateur' && (
                <NotificationsView token={token} showNotification={showNotification} onUnreadCountChange={setUnreadCount} />
              )}
              {!loading && currentView === 'teacher_calendar' && user?.role === 'Administrateur' && (
                <TeacherCalendarView
                  token={token} academicYear={academicYear} showNotification={showNotification}
                  onViewTeacher={(id) => { setSelectedTeacherId(id); setCurrentView('teacher_detail'); }}
                />
              )}
              {!loading && currentView === 'teacher_detail' && user?.role === 'Administrateur' && (
                <TeacherDetailView
                  token={token} teacherId={selectedTeacherId} showNotification={showNotification}
                  onBack={() => setCurrentView('teachers')}
                />
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: LOGIN
// ==========================================
function LoginView({ setToken, showNotification }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        showNotification("Connexion réussie ! Bienvenue.");
      } else {
        showNotification(data.message || "Erreur de connexion", false);
      }
    } catch (err) {
      showNotification("Impossible de joindre le serveur backend.", false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)', padding: '1rem'
    }}>
      <div style={{
        background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: 'var(--shadow-lg)',
        maxWidth: '440px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem'
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ backgroundColor: '#EFF6FF', color: 'var(--primary)', padding: '1rem', borderRadius: '50%' }}>
            <GraduationCap size={40} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>CDA - Académie scolaire</h2>
          <p style={{ color: 'var(--slate-700)', fontSize: '0.875rem' }}>Accédez à votre espace d'administration</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="login-email">Adresse Email</label>
            <input 
              id="login-email"
              type="email" 
              placeholder="ex: admin@school.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required
            />
          </div>
          <div>
            <label htmlFor="login-password">Mot de Passe</label>
            <input 
              id="login-password"
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required
            />
          </div>
          
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-700)', display: 'flex', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.5rem', borderRadius: '6px' }}>
            <ShieldAlert size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span>Sécurisé. Les tentatives infructueuses répétées bloquent temporairement le compte (limite: 5).</span>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '0.75rem' }}>
            {loading ? "Vérification..." : "Se connecter"} <LogIn size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: SIDEBAR
// ==========================================
function Sidebar({ currentView, setCurrentView, user, handleLogout }) {
  // A Professeur only ever sees their own restricted space
  if (user?.role === 'Professeur') {
    return (
      <aside style={{
        width: '260px', backgroundColor: '#0F172A', color: '#F1F5F9', display: 'flex', flexDirection: 'column',
        padding: '1.5rem 1rem', justifyContent: 'space-between', borderRight: '1px solid #1E293B'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem' }}>
            <GraduationCap size={32} style={{ color: '#3B82F6' }} />
            <div>
              <h1 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 850, margin: 0, lineHeight: 1.25 }}>CDA - Académie scolaire</h1>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Espace Professeur</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <button
              onClick={() => setCurrentView('teacher_space')}
              style={{
                width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px',
                backgroundColor: '#1E3A8A', color: 'white',
                display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none',
                fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <ClipboardCheck size={18} style={{ color: '#3B82F6' }} />
              <span>Présence &amp; Notes</span>
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid #1E293B', paddingTop: '1.25rem' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
              backgroundColor: 'transparent', color: '#EF4444', border: 'none', fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    );
  }

  const links = [
    { id: 'dashboard', label: 'KPI & Dashboard', icon: TrendingUp },
    { id: 'students', label: 'Étudiants', icon: Users },
    { id: 'grades', label: 'Saisie Notes', icon: BookOpen },
    { id: 'bulletins', label: 'Bulletins PDF', icon: FileSpreadsheet },
    { id: 'config', label: 'Configuration', icon: Settings }
  ];

  return (
    <aside style={{
      width: '260px', backgroundColor: '#0F172A', color: '#F1F5F9', display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1rem', justifyContent: 'space-between', borderRight: '1px solid #1E293B'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem' }}>
          <GraduationCap size={32} style={{ color: '#3B82F6' }} />
          <div>
            <h1 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 850, margin: 0, lineHeight: 1.25 }}>CDA - Académie scolaire</h1>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Portail de Gestion</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {links.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px',
                  backgroundColor: active ? '#1E3A8A' : 'transparent', color: active ? 'white' : '#94A3B8',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', transition: 'all 0.2s',
                  fontSize: '0.9rem', cursor: 'pointer'
                }}
              >
                <Icon size={18} style={{ color: active ? '#3B82F6' : '#64748B' }} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Teachers management (Admin Only) */}
          {user?.role === 'Administrateur' && (
            <button
              onClick={() => setCurrentView('teachers')}
              style={{
                width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px',
                backgroundColor: currentView === 'teachers' ? '#1E3A8A' : 'transparent', color: currentView === 'teachers' ? 'white' : '#94A3B8',
                display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', transition: 'all 0.2s',
                fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <UserCog size={18} style={{ color: currentView === 'teachers' ? '#3B82F6' : '#64748B' }} />
              <span>Professeurs</span>
            </button>
          )}

          {/* Teacher Calendar / Presence (Admin Only) */}
          {user?.role === 'Administrateur' && (
            <button
              onClick={() => setCurrentView('teacher_calendar')}
              style={{
                width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px',
                backgroundColor: currentView === 'teacher_calendar' ? '#1E3A8A' : 'transparent', color: currentView === 'teacher_calendar' ? 'white' : '#94A3B8',
                display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', transition: 'all 0.2s',
                fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <CalendarClock size={18} style={{ color: currentView === 'teacher_calendar' ? '#3B82F6' : '#64748B' }} />
              <span>Calendrier Profs</span>
            </button>
          )}

          {/* Notification Center (Admin Only) */}
          {user?.role === 'Administrateur' && (
            <button
              onClick={() => setCurrentView('notifications')}
              style={{
                width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px',
                backgroundColor: currentView === 'notifications' ? '#1E3A8A' : 'transparent', color: currentView === 'notifications' ? 'white' : '#94A3B8',
                display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', transition: 'all 0.2s',
                fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <Bell size={18} style={{ color: currentView === 'notifications' ? '#3B82F6' : '#64748B' }} />
              <span>Notifications</span>
            </button>
          )}

          {/* Audit Logs (Admin Only) */}
          {user?.role === 'Administrateur' && (
            <button
              onClick={() => setCurrentView('logs')}
              style={{
                width: '100%', textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '8px',
                backgroundColor: currentView === 'logs' ? '#1E3A8A' : 'transparent', color: currentView === 'logs' ? 'white' : '#94A3B8',
                display: 'flex', alignItems: 'center', gap: '0.75rem', border: 'none', transition: 'all 0.2s',
                fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              <History size={18} style={{ color: currentView === 'logs' ? '#3B82F6' : '#64748B' }} />
              <span>Logs de Connexion</span>
            </button>
          )}
        </nav>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid #1E293B', paddingTop: '1.25rem' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
            backgroundColor: 'transparent', color: '#EF4444', border: 'none', fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

// ==========================================
// VIEW: DASHBOARD
// ==========================================
// Small reusable KPI card for the dashboard: icon chip + value + subtitle + optional delta
function KpiCard({ icon: Icon, label, value, sub, tone = 'violet', delta }) {
  const tones = {
    violet: { fg: PALETTE.violet, bg: PALETTE.violetBg },
    blue: { fg: PALETTE.blue, bg: PALETTE.blueBg },
    pink: { fg: PALETTE.pink, bg: PALETTE.pinkBg }
  };
  const t = tones[tone] || tones.violet;
  return (
    <div style={{
      background: 'white', padding: '1.25rem 1.4rem', borderRadius: '16px',
      border: '1px solid var(--slate-200)', boxShadow: '0 1px 2px rgba(30, 34, 51, 0.04)',
      display: 'flex', flexDirection: 'column', gap: '0.85rem', transition: 'box-shadow 0.2s, transform 0.2s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '11px', backgroundColor: t.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={19} style={{ color: t.fg }} />
        </div>
        {delta !== undefined && delta !== null && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px',
            color: delta >= 0 ? '#3F7A56' : '#B4553F',
            backgroundColor: delta >= 0 ? '#EEF6F0' : '#FBF0EC'
          }}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div>
        <h2 style={{ fontSize: '1.6rem', margin: 0, color: 'var(--slate-900)', fontWeight: 800, lineHeight: 1.15 }}>{value}</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--slate-700)', fontWeight: 600 }}>{label}</span>
      </div>
      {sub && <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{sub}</span>}
    </div>
  );
}

// Compact card wrapper for a chart: smaller padding/title than before, so charts
// take noticeably less space on the dashboard.
function ChartCard({ title, height = 180, children }) {
  return (
    <div style={{ background: 'white', padding: '1rem 1.1rem', borderRadius: '14px', border: '1px solid var(--slate-200)', boxShadow: '0 1px 2px rgba(30, 34, 51, 0.04)' }}>
      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 0, marginBottom: '0.6rem', color: 'var(--slate-700)' }}>{title}</h3>
      <div style={{ width: '100%', height }}>
        {children}
      </div>
    </div>
  );
}

const CHART_SLICE_COLORS = [PALETTE.violet, PALETTE.blue, PALETTE.pink, '#9C93DD', '#8FB3E8'];

function DashboardView({ token, user, term, academicYear, students, classes, teachers = [], unreadCount = 0 }) {
  const [classFilter, setClassFilter] = useState('Toutes');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [profileStudent, setProfileStudent] = useState(null);
  const [termSeries, setTermSeries] = useState([]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const selectedClass = classes.find(c => c.name === classFilter);
      const classParam = selectedClass ? `&class_id=${selectedClass.id}` : '';
      const res = await fetch(`${API_BASE}/dashboard/stats?term=${term}&academic_year=${academicYear}${classParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      // stays on loading/empty state
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetches the class average for the 3 trimesters (reusing the existing
  // /dashboard/stats endpoint) to plot "évolution des moyennes par trimestre".
  const loadTermSeries = async () => {
    try {
      const selectedClass = classes.find(c => c.name === classFilter);
      const classParam = selectedClass ? `&class_id=${selectedClass.id}` : '';
      const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];
      const results = await Promise.all(terms.map(t =>
        fetch(`${API_BASE}/dashboard/stats?term=${t}&academic_year=${academicYear}${classParam}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => (r.ok ? r.json() : null)).catch(() => null)
      ));
      setTermSeries(terms.map((t, i) => ({
        name: t.replace('Trimestre ', 'T'),
        Moyenne: results[i] ? Number(results[i].class_average.toFixed(2)) : 0
      })));
    } catch (e) {
      setTermSeries([]);
    }
  };

  useEffect(() => {
    loadStats();
    loadTermSeries();
  }, [classFilter, term, academicYear, classes.length]);

  const filteredStudents = students.filter(s => classFilter === 'Toutes' || s.class_name === classFilter);

  if (loadingStats && !stats) return <div style={{ color: 'var(--slate-700)' }}>Génération des statistiques...</div>;
  if (!stats) return <div style={{ color: 'var(--slate-700)' }}>Aucune donnée disponible.</div>;

  // Recharts conversion of subject averages
  const chartData = Object.entries(stats.subject_averages || {}).map(([subject, avg]) => ({
    name: subject,
    Moyenne: avg
  }));

  // Recharts conversion of grade distribution
  const distData = Object.entries(stats.distribution || {}).map(([label, count]) => ({
    name: label.split(' ')[0], // takes letter
    "Nombre d'élèves": count
  }));

  // Gender split, computed from the students already loaded (no extra call)
  const genderCounts = filteredStudents.reduce((acc, s) => {
    const g = s.gender || 'Non renseigné';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});
  const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

  // Attendance comparison: élèves vs professeurs
  const attendanceCompareData = [
    { name: 'Élèves', Présence: stats.attendance_rate || 0 },
    { name: 'Professeurs', Présence: stats.teacher_stats?.global_presence_rate || 0 }
  ];

  // Élèves en difficulté: union of students flagged by absences, retards or baisses de notes
  const strugglingIds = new Set();
  (stats.student_alerts?.top_absences || []).forEach(a => strugglingIds.add(a.student_id));
  (stats.student_alerts?.top_lates || []).forEach(a => strugglingIds.add(a.student_id));
  (stats.student_alerts?.grade_drops || []).forEach(n => { if (n.student_id) strugglingIds.add(n.student_id); });

  const absenceRate = stats.attendance_rate !== undefined ? Math.max(0, 100 - stats.attendance_rate) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Class Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setClassFilter('Toutes')}
          className={classFilter === 'Toutes' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Toutes les classes
        </button>
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => setClassFilter(c.name)}
            className={classFilter === c.name ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Top area: compact charts on the left, KPI cards stacked on the right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(230px, 1fr)', gap: '1.25rem', alignItems: 'start' }}>

        {/* Charts (left side, smaller so they don't eat all the space) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <ChartCard title="Évolution des moyennes par trimestre">
            <ResponsiveContainer>
              <LineChart data={termSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F6" />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} width={28} />
                <Tooltip cursor={{ stroke: PALETTE.violetBg, strokeWidth: 12 }} />
                <Line type="monotone" dataKey="Moyenne" stroke={PALETTE.violet} strokeWidth={2.5} dot={{ r: 3, fill: PALETTE.violet }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={`Performances par matière ${classFilter !== 'Toutes' ? `(${classFilter})` : ''}`}>
            {chartData.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>Aucune note disponible.</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F6" />
                  <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} width={28} />
                  <Tooltip cursor={{ fill: PALETTE.violetBg }} />
                  <Bar dataKey="Moyenne" fill={PALETTE.blue} radius={[5, 5, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Répartition garçons / filles">
            {genderData.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>Aucun élève.</p>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3}>
                    {genderData.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_SLICE_COLORS[i % CHART_SLICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Taux de présence — élèves vs professeurs">
            <ResponsiveContainer>
              <BarChart data={attendanceCompareData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F6" />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} width={28} />
                <Tooltip cursor={{ fill: PALETTE.pinkBg }} />
                <Bar dataKey="Présence" fill={PALETTE.pink} radius={[5, 5, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Distribution des performances">
            {distData.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>Aucune note disponible.</p>
            ) : (
              <ResponsiveContainer>
                <BarChart data={distData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F6" />
                  <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 10 }} width={24} />
                  <Tooltip cursor={{ fill: PALETTE.violetBg }} />
                  <Bar dataKey="Nombre d'élèves" fill={PALETTE.violet} radius={[5, 5, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* KPI cards (right side) — Notifications card removed as requested */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', alignContent: 'start' }}>
          <KpiCard icon={Users} label="Total élèves" value={stats.total_students}
            sub={classFilter === 'Toutes' ? 'Toutes classes confondues' : classFilter} tone="violet" />
          <KpiCard icon={UserCog} label="Professeurs" value={user?.role === 'Administrateur' ? teachers.length : '—'}
            sub="Corps enseignant" tone="blue" />
          <KpiCard icon={Layers} label="Classes" value={classes.length} sub="Niveaux actifs" tone="pink" />
          <KpiCard icon={CheckCircle} label="Taux de présence" value={`${stats.attendance_rate}%`}
            sub="Élèves, séances enregistrées" tone="blue" />
          <KpiCard icon={UserX} label="Taux d'absence" value={`${absenceRate.toFixed(1)}%`}
            sub="Élèves, séances enregistrées" tone="pink" />
          <KpiCard icon={TrendingUp} label="Moyenne générale" value={`${stats.class_average.toFixed(2)}/100`}
            sub="Moyennes pondérées des élèves" tone="violet" />
          <KpiCard icon={AlertTriangle} label="Élèves en difficulté" value={strugglingIds.size}
            sub="Absences, retards ou baisses de notes" tone="pink" />
        </div>
      </div>

      {/* Student alerts (absences, retards, baisses de notes) */}
      {stats.student_alerts && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Élèves les plus absents</h3>
            {stats.student_alerts.top_absences.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Aucune absence signalée.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.student_alerts.top_absences.map((a) => (
                  <li key={a.student_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>{a.name}</span>
                    <strong style={{ color: PALETTE.pink }}>{a.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Élèves les plus en retard</h3>
            {stats.student_alerts.top_lates.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Aucun retard signalé.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.student_alerts.top_lates.map((a) => (
                  <li key={a.student_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>{a.name}</span>
                    <strong style={{ color: PALETTE.blue }}>{a.count}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Baisses de notes récentes</h3>
            {stats.student_alerts.grade_drops.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Aucune baisse de note significative.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.student_alerts.grade_drops.map((n) => (
                  <li key={n.id} style={{ fontSize: '0.85rem', color: n.level === 'Critique' ? PALETTE.pink : PALETTE.blue }}>
                    {n.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Student Grid */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--slate-200)', boxShadow: '0 1px 2px rgba(30, 34, 51, 0.04)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
          Élèves {classFilter === 'Toutes' ? '' : `de ${classFilter}`} <span style={{ color: 'var(--slate-700)', fontWeight: 400, fontSize: '0.9rem' }}>(cliquer pour voir la fiche)</span>
        </h3>
        {filteredStudents.length === 0 ? (
          <p style={{ color: 'var(--slate-700)', padding: '2rem', textAlign: 'center' }}>Aucun élève dans cette classe.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => setProfileStudent(s)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  padding: '1rem', borderRadius: '14px', border: '1px solid var(--slate-200)',
                  backgroundColor: 'white', cursor: 'pointer', textAlign: 'center'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', backgroundColor: PALETTE.violetBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.photo_url ? (
                      <img src={`http://127.0.0.1:5000${s.photo_url}`} alt={s.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: PALETTE.violet, fontWeight: 'bold' }}>{s.first_name[0]}{s.last_name[0]}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{s.first_name} {s.last_name}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--slate-700)' }}>{s.class_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {profileStudent && (
        <StudentProfileModal
          token={token} user={user} term={term} academicYear={academicYear}
          student={profileStudent} onClose={() => setProfileStudent(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// VIEW: STUDENTS (CRUD)
// ==========================================
function StudentsView({ token, user, students, classes, term, academicYear, fetchStudents, showNotification }) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [classFilter, setClassFilter] = useState('Toutes');

  // Read-only profile view: which student's profile modal is open (fetching is handled by StudentProfileModal itself)
  const [profileStudent, setProfileStudent] = useState(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Masculin');
  const [country, setCountry] = useState('France');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [classId, setClassId] = useState('');
  const [photo, setPhoto] = useState(null);

  const openAddModal = () => {
    setEditingStudent(null);
    setFirstName('');
    setLastName('');
    setDob('');
    setGender('Masculin');
    setCountry('France');
    setAddress('');
    setPhone('');
    setEmail('');
    setClassId(classes[0] ? String(classes[0].id) : '');
    setPhoto(null);
    setModalOpen(true);
  };

  const openEditModal = (std) => {
    setEditingStudent(std);
    setFirstName(std.first_name);
    setLastName(std.last_name);
    setDob(std.date_of_birth);
    setGender(std.gender);
    setCountry(std.country);
    setAddress(std.address);
    setPhone(std.phone_number);
    setEmail(std.email);
    setClassId(std.class_id ? String(std.class_id) : '');
    setPhoto(null);
    setModalOpen(true);
  };

  const openProfile = (student) => {
    setProfileStudent(student);
  };

  const closeProfile = () => {
    setProfileStudent(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Server-side will validate, but we validate strictly client side too!
    if (!firstName || !lastName || !dob || !address || !phone || !email || !classId) {
      showNotification("Veuillez remplir tous les champs obligatoires, y compris la classe.", false);
      return;
    }

    const formData = new FormData();
    formData.append('first_name', firstName);
    formData.append('last_name', lastName);
    formData.append('date_of_birth', dob);
    formData.append('gender', gender);
    formData.append('country', country);
    formData.append('address', address);
    formData.append('phone_number', phone);
    formData.append('email', email);
    formData.append('class_id', classId);
    if (photo) {
      formData.append('photo', photo);
    }

    const url = editingStudent 
      ? `${API_BASE}/students/${editingStudent.id}`
      : `${API_BASE}/students`;
      
    const method = editingStudent ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(editingStudent ? "Étudiant modifié avec succès." : "Étudiant ajouté avec succès.");
        setModalOpen(false);
        fetchStudents();
      } else {
        showNotification(data.message || "Erreur de sauvegarde.", false);
      }
    } catch (err) {
      showNotification("Erreur de connexion serveur.", false);
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet étudiant ? Toutes ses notes associées seront définitivement supprimées.")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Étudiant supprimé.");
        fetchStudents();
      } else {
        const data = await res.json();
        showNotification(data.message || "Erreur lors de la suppression.", false);
      }
    } catch (e) {
      showNotification("Erreur de connexion.", false);
    }
  };

  const filteredStudents = students.filter(s => 
    (
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    ) &&
    (classFilter === 'Toutes' || s.class_name === classFilter)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search and Action Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', flex: 1, maxWidth: '400px', position: 'relative' }}>
          <label htmlFor="search-student" style={{ display: 'none' }}>Rechercher un étudiant</label>
          <input 
            id="search-student"
            type="text" 
            placeholder="Rechercher par nom, prénom ou email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
        </div>

        {user?.role === 'Administrateur' && (
          <button onClick={openAddModal} className="btn-primary">
            <Plus size={18} /> Ajouter un Étudiant
          </button>
        )}
      </div>

      {/* Class Tabs (sous-classes: Seconde / Première / Terminale) */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--slate-200)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setClassFilter('Toutes')}
          className={classFilter === 'Toutes' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Toutes les classes ({students.length})
        </button>
        {classes.map((c) => (
          <button
            key={c.id}
            onClick={() => setClassFilter(c.name)}
            className={classFilter === c.name ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            Élèves de {c.name} ({students.filter(s => s.class_name === c.name).length})
          </button>
        ))}
      </div>

      {/* Grid Directory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {filteredStudents.map((s) => (
          <div key={s.id} style={{
            background: 'white', borderRadius: '12px', border: '1px solid var(--slate-200)',
            padding: '1.5rem', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: '1rem', position: 'relative'
          }}>
            {/* Photo */}
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#EFF6FF', flexShrink: 0 }}>
              {s.photo_url ? (
                <img src={`http://127.0.0.1:5000${s.photo_url}`} alt={`${s.first_name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                  {s.first_name[0]}{s.last_name[0]}
                </div>
              )}
            </div>

            {/* Info details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                onClick={() => openProfile(s)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
              >
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--primary)' }}>{s.first_name} {s.last_name}</h3>
              </button>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{s.email}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-700)' }}>Né le : {s.date_of_birth}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-700)' }}>Tél : {s.phone_number}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-700)' }}>Pays : {s.country}</span>
              {s.class_name && (
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', backgroundColor: '#EFF6FF',
                  padding: '0.15rem 0.5rem', borderRadius: '999px', width: 'fit-content', marginTop: '0.15rem'
                }}>
                  {s.class_name}
                </span>
              )}
            </div>

            {/* Admin Controls */}
            {user?.role === 'Administrateur' && (
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => openEditModal(s)} style={{ background: 'none', border: 'none', color: 'var(--primary)', padding: '0.25rem', cursor: 'pointer' }}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: '0.25rem', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL: ADD / EDIT */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ opacity: 1, transform: 'none', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
              <h3>{editingStudent ? "Modifier l'Étudiant" : "Ajouter un nouvel Étudiant"}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="student-lastname">Nom *</label>
                <input id="student-lastname" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="student-firstname">Prénom *</label>
                <input id="student-firstname" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="student-dob">Date de Naissance *</label>
                <input id="student-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="student-gender">Genre *</label>
                <select id="student-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Masculin">Masculin</option>
                  <option value="Féminin">Féminin</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div>
                <label htmlFor="student-email">Email *</label>
                <input id="student-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="student-phone">Téléphone *</label>
                <input id="student-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="student-country">Pays *</label>
                <input id="student-country" type="text" value={country} onChange={(e) => setCountry(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="student-class">Classe *</label>
                <select id="student-class" value={classId} onChange={(e) => setClassId(e.target.value)} required>
                  <option value="" disabled>Sélectionner une classe</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="student-photo">Photo d'identité</label>
                <input id="student-photo" type="file" onChange={(e) => setPhoto(e.target.files[0])} accept="image/*" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label htmlFor="student-address">Adresse Résidentielle *</label>
                <textarea id="student-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} required style={{ resize: 'none' }}></textarea>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--slate-200)', paddingTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: READ-ONLY STUDENT PROFILE (shared component) */}
      {profileStudent && (
        <StudentProfileModal
          token={token} user={user} term={term} academicYear={academicYear}
          student={profileStudent} onClose={closeProfile}
        />
      )}
    </div>
  );
}

// ==========================================
// SHARED: READ-ONLY STUDENT PROFILE MODAL
// Used from both StudentsView and DashboardView
// ==========================================
function StudentProfileModal({ token, user, term, academicYear, student, onClose }) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'analysis' | 'notes'
  const [profileData, setProfileData] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editRecordStatus, setEditRecordStatus] = useState('Présent');
  const [editRecordLate, setEditRecordLate] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const loadData = async () => {
    setProfileData(null);
    setAttendanceHistory(null);
    setLoadingProfile(true);
    try {
      const [profRes, histRes, notesRes] = await Promise.all([
        fetch(`${API_BASE}/students/${student.id}/profile?term=${term}&academic_year=${academicYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/attendance/student/${student.id}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/students/${student.id}/notes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      if (profRes.ok) setProfileData(await profRes.json());
      if (histRes.ok) setAttendanceHistory(await histRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
    } catch (e) {
      // silently fails, the modal just stays on its loading/empty state
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (student) loadData();
  }, [student?.id, term, academicYear]);

  const startEditRecord = (record) => {
    setEditingRecordId(record.id);
    setEditRecordStatus(record.status);
    setEditRecordLate(record.late === true);
  };

  const saveEditRecord = async (recordId) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: editRecordStatus, late: editRecordLate || null })
      });
      if (res.ok) {
        setEditingRecordId(null);
        const histRes = await fetch(`${API_BASE}/attendance/student/${student.id}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (histRes.ok) setAttendanceHistory(await histRes.json());
      }
    } catch (e) {
      // no-op: the row simply stays in edit mode if this fails
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`${API_BASE}/students/${student.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newNote.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setNotes(prev => [data.note, ...prev]);
        setNewNote('');
      }
    } catch (e) {
      // no-op
    } finally {
      setAddingNote(false);
    }
  };

  if (!student) return null;

  // --- Data prep for the Analysis tab (radar, evolution curve, best/worst subject) ---
  const subjectsWithGrades = profileData ? profileData.subjects.filter(s => s.average !== null && s.average !== undefined) : [];
  const radarData = subjectsWithGrades.map(s => ({ subject: s.subject_name, Moyenne: s.average }));

  // Attendance breakdown for the donut chart: Présent (on time) / Retard / Absent
  const attendanceRecords = attendanceHistory ? attendanceHistory.records : [];
  const presentOnTime = attendanceRecords.filter(r => r.status === 'Présent' && r.late !== true).length;
  const presentLate = attendanceRecords.filter(r => r.status === 'Présent' && r.late === true).length;
  const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
  const attendanceDonutData = [
    { name: 'Présent', value: presentOnTime, color: '#16A34A' },
    { name: 'Retard', value: presentLate, color: '#D97706' },
    { name: 'Absent', value: absentCount, color: '#DC2626' }
  ].filter(d => d.value > 0);

  let bestSubject = null, worstSubject = null;
  if (subjectsWithGrades.length > 0) {
    bestSubject = subjectsWithGrades.reduce((a, b) => (a.average >= b.average ? a : b));
    worstSubject = subjectsWithGrades.reduce((a, b) => (a.average <= b.average ? a : b));
  }

  const evolutionData = profileData
    ? profileData.subjects
        .flatMap(s => [
          ...s.devoirs.map(g => ({ ...g, subject_name: s.subject_name })),
          ...s.examens.map(g => ({ ...g, subject_name: s.subject_name }))
        ])
        .filter(g => g.created_at)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(g => ({
          date: g.created_at.slice(0, 10),
          mark: g.mark,
          label: `${g.subject_name} (${g.grade_type})`
        }))
    : [];

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ opacity: 1, transform: 'none', maxWidth: '850px', maxHeight: '85vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.75rem' }}>
          <h3>Profil de l'Élève</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Header: photo + info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#EFF6FF', flexShrink: 0 }}>
              {student.photo_url ? (
                <img src={`http://127.0.0.1:5000${student.photo_url}`} alt={student.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.5rem' }}>
                  {student.first_name[0]}{student.last_name[0]}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{student.first_name} {student.last_name}</h2>
              <p style={{ margin: '0.15rem 0', fontSize: '0.85rem', color: 'var(--slate-700)' }}>{student.email} · {student.phone_number}</p>
              <p style={{ margin: '0.15rem 0', fontSize: '0.85rem', color: 'var(--slate-700)' }}>{student.country} — {student.class_name}</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setTab('overview')} className={tab === 'overview' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Vue d'ensemble</button>
            <button onClick={() => setTab('analysis')} className={tab === 'analysis' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Analyse</button>
            <button onClick={() => setTab('notes')} className={tab === 'notes' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Notes ({notes.length})</button>
          </div>
        </div>

        {loadingProfile && <p style={{ color: 'var(--slate-700)', textAlign: 'center' }}>Chargement du profil...</p>}

        {/* ---------------- TAB: OVERVIEW ---------------- */}
        {!loadingProfile && profileData && tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-700)' }}>Moyenne générale</p>
                <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>{profileData.metrics.average}/100</p>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-700)' }}>Rang</p>
                <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>#{profileData.metrics.rank}</p>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-700)' }}>Mention</p>
                <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>{profileData.metrics.letter_grade}</p>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-700)' }}>Taux de présence</p>
                <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                  {attendanceHistory ? `${attendanceHistory.attendance_rate}%` : '...'}
                </p>
              </div>
            </div>

            {/* Per-subject breakdown */}
            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Points par matière ({term})</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--slate-700)' }}>
                    <th style={{ padding: '0.4rem' }}>Matière</th>
                    <th style={{ padding: '0.4rem' }}>Devoirs</th>
                    <th style={{ padding: '0.4rem' }}>Examens</th>
                    <th style={{ padding: '0.4rem' }}>Moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  {profileData.subjects.map((subj) => (
                    <tr key={subj.subject_id} style={{ borderBottom: '1px solid var(--slate-100)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '0.5rem 0.4rem', fontWeight: 600 }}>{subj.subject_name}</td>
                      <td style={{ padding: '0.5rem 0.4rem' }}>
                        {subj.devoirs.length > 0 ? subj.devoirs.map(g => g.mark).join(', ') : '—'}
                      </td>
                      <td style={{ padding: '0.5rem 0.4rem' }}>
                        {subj.examens.length > 0 ? subj.examens.map(g => g.mark).join(', ') : '—'}
                      </td>
                      <td style={{ padding: '0.5rem 0.4rem', fontWeight: 700 }}>
                        {subj.average !== null && subj.average !== undefined ? `${subj.average}/100` : 'Pas de notes'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Attendance donut: Présent / Retard / Absent */}
            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Répartition de la présence</h4>
              {attendanceRecords.length === 0 ? (
                <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Aucun enregistrement de présence pour le moment.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '160px', height: '160px' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={attendanceDonutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {attendanceDonutData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      textAlign: 'center', pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{attendanceHistory.attendance_rate}%</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--slate-700)' }}>présence</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }}></span>
                      Présent : {presentOnTime}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D97706', display: 'inline-block' }}></span>
                      Retard : {presentLate}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }}></span>
                      Absent : {absentCount}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance history, correctable by admin only */}
            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>Historique de présence</h4>
              {!attendanceHistory || attendanceHistory.records.length === 0 ? (
                <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Aucun enregistrement de présence pour le moment.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--slate-700)' }}>
                      <th style={{ padding: '0.4rem' }}>Date</th>
                      <th style={{ padding: '0.4rem' }}>Matière</th>
                      <th style={{ padding: '0.4rem' }}>Statut</th>
                      <th style={{ padding: '0.4rem' }}>Retard</th>
                      {user?.role === 'Administrateur' && <th style={{ padding: '0.4rem' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.records.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--slate-100)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '0.5rem 0.4rem' }}>{r.date}</td>
                        <td style={{ padding: '0.5rem 0.4rem' }}>{r.subject_name}</td>
                        <td style={{ padding: '0.5rem 0.4rem' }}>
                          {editingRecordId === r.id ? (
                            <select value={editRecordStatus} onChange={(e) => setEditRecordStatus(e.target.value)} style={{ fontSize: '0.8rem' }}>
                              <option value="Présent">Présent</option>
                              <option value="Absent">Absent</option>
                            </select>
                          ) : (
                            <span style={{
                              fontWeight: 700,
                              color: r.status === 'Présent' ? '#16A34A' : '#EF4444'
                            }}>
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem' }}>
                          {editingRecordId === r.id ? (
                            <input type="checkbox" checked={editRecordLate} onChange={(e) => setEditRecordLate(e.target.checked)} />
                          ) : (
                            r.late === true ? 'Oui' : '—'
                          )}
                        </td>
                        {user?.role === 'Administrateur' && (
                          <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right' }}>
                            {editingRecordId === r.id ? (
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => saveEditRecord(r.id)} style={{ background: 'none', border: 'none', color: '#16A34A', cursor: 'pointer' }}>✓</button>
                                <button onClick={() => setEditingRecordId(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => startEditRecord(r)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                                <Edit2 size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {user?.role === 'Administrateur' && (
                <p style={{ fontSize: '0.75rem', color: 'var(--slate-700)', marginTop: '0.5rem' }}>
                  En tant qu'administrateur, vous pouvez corriger un statut Présent/Absent saisi par erreur.
                </p>
              )}
            </div>
          </>
        )}

        {/* ---------------- TAB: ANALYSIS (radar, evolution, best/worst) ---------------- */}
        {!loadingProfile && profileData && tab === 'analysis' && (
          <>
            {subjectsWithGrades.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', textAlign: 'center', padding: '2rem' }}>
                Pas encore assez de notes pour analyser cet élève ce trimestre.
              </p>
            ) : (
              <>
                {/* Best / worst subject callout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#15803D', fontWeight: 700 }}>POINT FORT</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{bestSubject.subject_name}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--slate-700)' }}>{bestSubject.average}/100</p>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#B91C1C', fontWeight: 700 }}>À RENFORCER</p>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 700 }}>{worstSubject.subject_name}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--slate-700)' }}>{worstSubject.average}/100</p>
                  </div>
                </div>

                {/* Radar chart */}
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>Radar des matières</h4>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 11 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <Radar name="Moyenne" dataKey="Moyenne" stroke="#1D4ED8" fill="#1D4ED8" fillOpacity={0.35} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Evolution curve */}
                <div>
                  <h4 style={{ marginBottom: '0.5rem' }}>Évolution des notes dans le temps</h4>
                  {evolutionData.length < 2 ? (
                    <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Pas encore assez de notes datées pour tracer une courbe.</p>
                  ) : (
                    <div style={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <LineChart data={evolutionData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} />
                          <Tooltip formatter={(value, name, props) => [`${value}/100`, props.payload.label]} />
                          <Line type="monotone" dataKey="mark" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ---------------- TAB: NOTES (bloc-notes qualitatif) ---------------- */}
        {!loadingProfile && tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {user?.role === 'Administrateur' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="new-note-content">Ajouter une remarque</label>
                <textarea
                  id="new-note-content" rows={3} value={newNote} onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ex : A des difficultés familiales ce trimestre, ne pas le surcharger."
                />
                <button onClick={handleAddNote} disabled={addingNote || !newNote.trim()} className="btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1rem' }}>
                  {addingNote ? 'Ajout...' : 'Ajouter la remarque'}
                </button>
              </div>
            )}

            {notes.length === 0 ? (
              <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                Aucune remarque enregistrée pour cet élève.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notes.map((n) => (
                  <div key={n.id} style={{ padding: '0.85rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--slate-200)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{n.content}</p>
                    <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--slate-700)' }}>
                      {n.author_email || 'Auteur inconnu'} · {n.created_at ? n.created_at.slice(0, 10) : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VIEW: GRADES (ENTRY & AUTO CALCULATIONS)
// ==========================================
function GradesView({ token, user, students, subjects, fetchGlobalData, term, academicYear, showNotification }) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [mark, setMark] = useState('');
  const [gradeType, setGradeType] = useState('Devoir');
  const [studentGrades, setStudentGrades] = useState([]);
  
  // Reload single student grades when context changes
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentGrades();
    } else {
      setStudentGrades([]);
    }
  }, [selectedStudent, term, academicYear]);

  const fetchStudentGrades = async () => {
    try {
      const res = await fetch(`${API_BASE}/grades/student/${selectedStudent}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter by term/year in client view
        setStudentGrades(data.filter(g => g.term === term && g.academic_year === academicYear));
      }
    } catch (e) {
      showNotification("Erreur de récupération des notes.", false);
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedSubject || mark === '') {
      showNotification("Remplissez tous les champs pour enregistrer la note.", false);
      return;
    }

    const val = parseFloat(mark);
    if (isNaN(val) || val < 0 || val > 100) {
      showNotification("La note doit être un nombre valide entre 0 et 100.", false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/grades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: selectedStudent,
          subject_id: selectedSubject,
          mark: val,
          term,
          academic_year: academicYear,
          grade_type: gradeType
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Note enregistrée avec succès (Indicateurs recalculés).");
        setMark('');
        fetchStudentGrades();
        fetchGlobalData(); // refresh parent stats
      } else {
        showNotification(data.message || "Erreur lors de l'enregistrement.", false);
      }
    } catch (err) {
      showNotification("Erreur de connexion.", false);
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (!window.confirm("Supprimer cette note ?")) return;
    try {
      const res = await fetch(`${API_BASE}/grades/${gradeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Note supprimée.");
        fetchStudentGrades();
        fetchGlobalData();
      }
    } catch (e) {
      showNotification("Erreur.", false);
    }
  };

  const selectedStudentInfo = students.find(s => String(s.id) === String(selectedStudent));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
      {/* Entry Form */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Saisie d'une Note</h3>
        
        {user?.role !== 'Administrateur' ? (
          <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>
            <ShieldAlert size={16} style={{ color: 'var(--warning)', verticalAlign: 'middle', marginRight: '4px' }} />
            Lecture seule. La saisie est réservée aux Administrateurs.
          </p>
        ) : (
          <form onSubmit={handleAddGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="grade-student-select">Sélectionner l'Élève</label>
              <select id="grade-student-select" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required>
                <option value="">-- Choisir un élève --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>)}
              </select>
            </div>
            
            <div>
              <label htmlFor="grade-subject-select">Matière</label>
              <select id="grade-subject-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} required>
                <option value="">-- Choisir une matière --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="grade-type-select">Type de note</label>
              <select id="grade-type-select" value={gradeType} onChange={(e) => setGradeType(e.target.value)} required>
                <option value="Devoir">Devoir</option>
                <option value="Examen">Examen</option>
              </select>
            </div>

            <div>
              <label htmlFor="grade-mark-input">Note sur 100 *</label>
              <input 
                id="grade-mark-input"
                type="number" 
                min="0" 
                max="100" 
                step="0.01" 
                placeholder="Ex: 85.5" 
                value={mark} 
                onChange={(e) => setMark(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              Enregistrer
            </button>
          </form>
        )}
      </div>

      {/* Listing of Current Grades */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Notes actuelles pour la période</h3>
        
        {!selectedStudent ? (
          <p style={{ color: 'var(--slate-700)', padding: '2rem', textAlign: 'center' }}>Veuillez sélectionner un élève à gauche pour consulter ses notes.</p>
        ) : studentGrades.length === 0 ? (
          <p style={{ color: 'var(--slate-700)', padding: '2rem', textAlign: 'center' }}>Aucune note enregistrée pour cet élève ce trimestre.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', color: 'var(--slate-700)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Matière</th>
                <th style={{ padding: '0.5rem' }}>Type</th>
                <th style={{ padding: '0.5rem' }}>Date</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Note (/100)</th>
                {user?.role === 'Administrateur' && <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {studentGrades.map(g => (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{g.subject_name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{g.grade_type}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--slate-700)' }}>{g.created_at ? g.created_at.substring(0, 10) : ''}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{g.mark.toFixed(2)}</td>
                  {user?.role === 'Administrateur' && (
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteGrade(g.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', padding: 0, cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>

      {/* Selected student's info card, always visible below while a student is chosen */}
      {selectedStudentInfo && (
        <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#EFF6FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selectedStudentInfo.photo_url ? (
              <img src={`http://127.0.0.1:5000${selectedStudentInfo.photo_url}`} alt={selectedStudentInfo.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                {selectedStudentInfo.first_name[0]}{selectedStudentInfo.last_name[0]}
              </span>
            )}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{selectedStudentInfo.first_name} {selectedStudentInfo.last_name}</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--slate-700)' }}>{selectedStudentInfo.email}</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--slate-700)' }}>
              {selectedStudentInfo.country} · {selectedStudentInfo.class_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: BULLETINS (GENERATE & PDF DOWNLOAD)
// ==========================================
function BulletinsView({ token, students, classes, term, academicYear, showNotification }) {
  const [classFilter, setClassFilter] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [editingGradeId, setEditingGradeId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [newSubjectId, setNewSubjectId] = useState('');
  const [newGradeType, setNewGradeType] = useState('Devoir');
  const [newMark, setNewMark] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const [bulletin, setBulletin] = useState(null);
  const [loadingGen, setLoadingGen] = useState(false);

  const selectedStudentInfo = students.find(s => String(s.id) === String(selectedStudentId));

  const filteredStudents = students.filter(s =>
    (classFilter === 'Toutes' || s.class_name === classFilter) &&
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const loadProfile = async (studentId) => {
    setLoadingProfile(true);
    setProfileData(null);
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/profile?term=${term}&academic_year=${academicYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setProfileData(await res.json());
    } catch (e) {
      showNotification("Erreur lors du chargement des notes de l'élève.", false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudentId(String(student.id));
    setBulletin(null);
    loadProfile(student.id);
  };

  const startEditGrade = (gradeId, currentMark) => {
    setEditingGradeId(gradeId);
    setEditValue(String(currentMark));
  };

  const cancelEditGrade = () => {
    setEditingGradeId(null);
    setEditValue('');
  };

  const saveEditGrade = async (gradeId) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0 || val > 100) {
      showNotification("La note doit être un nombre valide entre 0 et 100.", false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/grades/${gradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mark: val })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        setEditingGradeId(null);
        loadProfile(selectedStudentId);
      } else {
        showNotification(data.message, false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la modification.", false);
    }
  };

  const handleDeleteGradeEntry = async (gradeId) => {
    if (!window.confirm("Supprimer définitivement cette note ?")) return;
    try {
      const res = await fetch(`${API_BASE}/grades/${gradeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        loadProfile(selectedStudentId);
      } else {
        showNotification(data.message, false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la suppression.", false);
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    if (!newSubjectId || newMark === '') {
      showNotification("Choisissez une matière et une note.", false);
      return;
    }
    const val = parseFloat(newMark);
    if (isNaN(val) || val < 0 || val > 100) {
      showNotification("La note doit être un nombre valide entre 0 et 100.", false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          student_id: selectedStudentId,
          subject_id: newSubjectId,
          mark: val,
          term, academic_year: academicYear,
          grade_type: newGradeType,
          date: newDate
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        setNewMark('');
        loadProfile(selectedStudentId);
      } else {
        showNotification(data.message, false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de l'enregistrement de la note.", false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedStudentId) return;
    setLoadingGen(true);
    setBulletin(null);
    try {
      const res = await fetch(`${API_BASE}/bulletins/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: selectedStudentId,
          term,
          academic_year: academicYear,
          force_regenerate: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBulletin(data);
        showNotification("Bulletin généré avec succès !");
      } else {
        showNotification(data.message || "Erreur de génération du bulletin.", false);
      }
    } catch (e) {
      showNotification("Erreur de connexion serveur.", false);
    } finally {
      setLoadingGen(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!bulletin) return;
    try {
      // Trigger native download
      const res = await fetch(`${API_BASE}/bulletins/${bulletin.bulletin_id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulletin_${bulletin.student_info.last_name}_${term}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showNotification("Téléchargement du PDF démarré.");
      } else {
        showNotification("Erreur lors de la récupération du PDF.", false);
      }
    } catch (e) {
      showNotification("Erreur de téléchargement.", false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Class tabs + search + student list */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setClassFilter('Toutes')}
              className={classFilter === 'Toutes' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Toutes les classes
            </button>
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setClassFilter(c.name)}
                className={classFilter === c.name ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-700)' }} />
            <input
              type="text" placeholder="Chercher un élève par son nom..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--slate-100)' }}>
          {filteredStudents.length === 0 ? (
            <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Aucun élève ne correspond à cette recherche.</p>
          ) : (
            filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectStudent(s)}
                style={{
                  padding: '0.5rem 0.9rem', borderRadius: '999px', fontSize: '0.85rem', cursor: 'pointer',
                  border: String(s.id) === String(selectedStudentId) ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                  backgroundColor: String(s.id) === String(selectedStudentId) ? '#EFF6FF' : 'white',
                  color: String(s.id) === String(selectedStudentId) ? 'var(--primary)' : 'var(--slate-800)',
                  fontWeight: String(s.id) === String(selectedStudentId) ? 700 : 400
                }}
              >
                {s.first_name} {s.last_name} <span style={{ color: 'var(--slate-700)', fontWeight: 400 }}>· {s.class_name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Selected student's editable notes */}
      {selectedStudentInfo && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#EFF6FF', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedStudentInfo.photo_url ? (
                  <img src={`http://127.0.0.1:5000${selectedStudentInfo.photo_url}`} alt={selectedStudentInfo.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{selectedStudentInfo.first_name[0]}{selectedStudentInfo.last_name[0]}</span>
                )}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>{selectedStudentInfo.first_name} {selectedStudentInfo.last_name}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--slate-700)' }}>{selectedStudentInfo.class_name} · {term}</p>
              </div>
            </div>
            <button onClick={handleGenerate} className="btn-primary" disabled={loadingGen}>
              {loadingGen ? "Calculs & IA..." : "Générer le Bulletin"}
            </button>
          </div>

          {loadingProfile && <p style={{ color: 'var(--slate-700)' }}>Chargement des notes...</p>}

          {!loadingProfile && profileData && (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--slate-700)' }}>
                    <th style={{ padding: '0.4rem' }}>Matière</th>
                    <th style={{ padding: '0.4rem' }}>Devoirs</th>
                    <th style={{ padding: '0.4rem' }}>Examens</th>
                    <th style={{ padding: '0.4rem' }}>Moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  {profileData.subjects.map((subj) => (
                    <tr key={subj.subject_id} style={{ borderBottom: '1px solid var(--slate-100)', fontSize: '0.85rem' }}>
                      <td style={{ padding: '0.5rem 0.4rem', fontWeight: 600 }}>{subj.subject_name}</td>
                      <td style={{ padding: '0.5rem 0.4rem' }}>
                        {subj.devoirs.length === 0 ? '—' : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {subj.devoirs.map((g) => (
                              <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#EFF6FF', color: '#1E3A8A', borderRadius: '999px', padding: '0.15rem 0.45rem', fontSize: '0.75rem' }}>
                                {editingGradeId === g.id ? (
                                  <>
                                    <input type="number" min="0" max="100" step="0.5" value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ width: '50px', fontSize: '0.75rem' }} />
                                    <button onClick={() => saveEditGrade(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A' }}>✓</button>
                                    <button onClick={cancelEditGrade} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>✕</button>
                                  </>
                                ) : (
                                  <>
                                    <span>{g.mark}</span>
                                    <button onClick={() => startEditGrade(g.id, g.mark)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E3A8A' }}><Edit2 size={11} /></button>
                                    <button onClick={() => handleDeleteGradeEntry(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={11} /></button>
                                  </>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem 0.4rem' }}>
                        {subj.examens.length === 0 ? '—' : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {subj.examens.map((g) => (
                              <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '999px', padding: '0.15rem 0.45rem', fontSize: '0.75rem' }}>
                                {editingGradeId === g.id ? (
                                  <>
                                    <input type="number" min="0" max="100" step="0.5" value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ width: '50px', fontSize: '0.75rem' }} />
                                    <button onClick={() => saveEditGrade(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A' }}>✓</button>
                                    <button onClick={cancelEditGrade} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>✕</button>
                                  </>
                                ) : (
                                  <>
                                    <span>{g.mark}</span>
                                    <button onClick={() => startEditGrade(g.id, g.mark)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E' }}><Edit2 size={11} /></button>
                                    <button onClick={() => handleDeleteGradeEntry(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={11} /></button>
                                  </>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem 0.4rem', fontWeight: 700 }}>
                        {subj.average !== null && subj.average !== undefined ? `${subj.average}/100` : 'Pas de notes'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Quick add a new grade */}
              <form onSubmit={handleAddGrade} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--slate-100)', paddingTop: '1rem' }}>
                <div>
                  <label htmlFor="bulletin-new-subject">Matière</label>
                  <select id="bulletin-new-subject" value={newSubjectId} onChange={(e) => setNewSubjectId(e.target.value)} required>
                    <option value="" disabled>Choisir...</option>
                    {profileData.subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="bulletin-new-type">Type</label>
                  <select id="bulletin-new-type" value={newGradeType} onChange={(e) => setNewGradeType(e.target.value)}>
                    <option value="Devoir">Devoir</option>
                    <option value="Examen">Examen</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="bulletin-new-mark">Note (/100)</label>
                  <input id="bulletin-new-mark" type="number" min="0" max="100" step="0.5" value={newMark} onChange={(e) => setNewMark(e.target.value)} style={{ width: '90px' }} required />
                </div>
                <div>
                  <label htmlFor="bulletin-new-date">Date</label>
                  <input id="bulletin-new-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                  <Plus size={16} /> Ajouter
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Generated Bulletin Display */}
      {bulletin && (
        <div style={{
          background: 'white', padding: '2.5rem', borderRadius: '16px', border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '2rem'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--slate-200)', paddingBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--slate-100)' }}>
                {bulletin.student_info.photo_url ? (
                  <img src={`http://127.0.0.1:5000${bulletin.student_info.photo_url}`} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {bulletin.student_info.first_name[0]}{bulletin.student_info.last_name[0]}
                  </div>
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{bulletin.student_info.first_name.toUpperCase()} {bulletin.student_info.last_name.toUpperCase()}</h2>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Email : {bulletin.student_info.email}</span>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-700)', marginTop: '0.25rem' }}>
                  Genre : {bulletin.student_info.gender} | Origine : {bulletin.student_info.country}
                  {bulletin.student_info.class_name && ` | Classe : ${bulletin.student_info.class_name}`}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{bulletin.academic_year}</span>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.25rem 0' }}>{bulletin.term}</div>
              <button onClick={handleDownloadPDF} className="btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                <FileDown size={16} /> Télécharger PDF
              </button>
            </div>
          </div>

          {!bulletin.has_grades && (
            <div style={{ padding: '0.9rem 1.1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#B91C1C', fontSize: '0.9rem' }}>
              Aucune note n'a été attribuée à cet élève pour ce trimestre.
            </div>
          )}

          {/* Grades grid list -- one row per subject, never duplicated */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              Résultats détaillés
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--slate-200)', color: 'var(--slate-700)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Matière</th>
                  <th style={{ padding: '0.5rem' }}>Devoirs</th>
                  <th style={{ padding: '0.5rem' }}>Examens</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Moyenne</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Moyenne Classe</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Mention</th>
                </tr>
              </thead>
              <tbody>
                {bulletin.grades.map((g, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{g.subject}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{g.devoirs.length > 0 ? g.devoirs.join(', ') : '—'}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{g.examens.length > 0 ? g.examens.join(', ') : '—'}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }}>
                      {g.average !== null && g.average !== undefined ? `${g.average.toFixed(2)} / 100` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#64748B' }}>
                      {g.class_average !== null && g.class_average !== undefined ? `${g.class_average.toFixed(2)} / 100` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: g.letter_grade === 'A' || g.letter_grade === 'B' ? '#DCFCE7' : g.letter_grade === 'N/A' ? '#F1F5F9' : '#FEE2E2',
                        color: g.letter_grade === 'A' || g.letter_grade === 'B' ? '#15803D' : g.letter_grade === 'N/A' ? '#64748B' : '#B91C1C'
                      }}>
                        {g.letter_grade} ({g.status_label})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculations / Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', borderTop: '2px solid var(--slate-200)', paddingTop: '1.5rem' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--slate-100)' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>MOYENNE GÉNÉRALE</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{bulletin.calculations.average.toFixed(2)} / 100</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--slate-100)' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>MOYENNE CLASSE</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-700)' }}>{bulletin.calculations.class_average.toFixed(2)} / 100</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--slate-100)' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>CLASSEMENT DE L'ÉLÈVE</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{bulletin.calculations.rank}<sup>e</sup></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>MENTION GLOBALE</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>{bulletin.calculations.status_label}</div>
            </div>
          </div>

          {/* Appreciation conseil de classe */}
          <div style={{ border: '1px solid var(--slate-200)', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#F8FAFC' }}>
            <h4 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>Appréciation du Conseil de Classe :</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-700)', fontStyle: 'italic' }}>{bulletin.appreciation}</p>
          </div>

          {/* Smart AI recommendation */}
          <div style={{ border: '1px dashed var(--primary)', borderRadius: '12px', padding: '1.5rem', backgroundColor: '#F0F9FF' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <TrendingUp size={20} /> Conseil d'Orientation Personnalisé (Généré par IA)
            </h4>
            <p style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--slate-800)' }}>{bulletin.ai_recommendation.recommendation}</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748B' }}>
              <span>Source : {bulletin.ai_recommendation.source}</span>
              <span>Généré automatiquement à la demande</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: CONFIGURATION (SCALES & SUBJECTS)
// ==========================================
function ConfigView({ token, user, subjects, scales, classes, academicYear, fetchGlobalData, showNotification }) {
  const [newSubj, setNewSubj] = useState('');
  
  // Scale Form fields
  const [minS, setMinS] = useState('');
  const [maxS, setMaxS] = useState('');
  const [letter, setLetter] = useState('');
  const [status, setStatus] = useState('');

  // --- Emploi du temps (schedule builder) ---
  const DAY_OPTIONS = [
    { value: 0, label: 'Lundi' }, { value: 1, label: 'Mardi' }, { value: 2, label: 'Mercredi' },
    { value: 3, label: 'Jeudi' }, { value: 4, label: 'Vendredi' }, { value: 5, label: 'Samedi' }
  ];
  const [schedClassId, setSchedClassId] = useState('');
  const [schedDay, setSchedDay] = useState('0');
  const [schedStart, setSchedStart] = useState('08:00');
  const [schedEnd, setSchedEnd] = useState('10:00');
  const [schedSubjectId, setSchedSubjectId] = useState('');
  const [schedSlots, setSchedSlots] = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);

  const loadClassSchedule = async (classId) => {
    if (!classId) { setSchedSlots([]); return; }
    setSchedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/schedule/class/${classId}?academic_year=${academicYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchedSlots(data.slots || []);
      }
    } catch (e) {
      showNotification("Erreur lors du chargement de l'emploi du temps.", false);
    } finally {
      setSchedLoading(false);
    }
  };

  useEffect(() => {
    if (schedClassId) loadClassSchedule(schedClassId);
  }, [schedClassId, academicYear]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!schedClassId || !schedSubjectId) {
      showNotification("Sélectionnez une classe et une matière.", false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/schedule/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          class_id: parseInt(schedClassId, 10),
          day_of_week: parseInt(schedDay, 10),
          academic_year: academicYear,
          start_time: schedStart,
          end_time: schedEnd,
          subject_id: parseInt(schedSubjectId, 10)
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        loadClassSchedule(schedClassId);
      } else {
        showNotification(data.message || "Erreur lors de la création du créneau.", false);
      }
    } catch (e) {
      showNotification("Erreur réseau.", false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Supprimer ce créneau de l'emploi du temps ?")) return;
    try {
      const res = await fetch(`${API_BASE}/schedule/slots/${slotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Créneau supprimé.", true);
        loadClassSchedule(schedClassId);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la suppression.", false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubj) return;
    try {
      const res = await fetch(`${API_BASE}/grades/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newSubj })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Matière ajoutée au référentiel.");
        setNewSubj('');
        fetchGlobalData();
      } else {
        showNotification(data.message || "Erreur.", false);
      }
    } catch (e) {
      showNotification("Erreur de connexion.", false);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm("Supprimer cette matière ? Les notes associées seront verrouillées ou supprimées.")) return;
    try {
      const res = await fetch(`${API_BASE}/grades/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Matière retirée.");
        fetchGlobalData();
      }
    } catch (e) {
      showNotification("Erreur.", false);
    }
  };

  const handleAddScale = async (e) => {
    e.preventDefault();
    if (!minS || !maxS || !letter || !status) return;
    try {
      const res = await fetch(`${API_BASE}/grades/scale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          min_score: parseFloat(minS),
          max_score: parseFloat(maxS),
          letter_grade: letter,
          status_label: status
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("Règle de conversion ajoutée.");
        setMinS(''); setMaxS(''); setLetter(''); setStatus('');
        fetchGlobalData();
      } else {
        showNotification(data.message || "Erreur.", false);
      }
    } catch (e) {
      showNotification("Erreur.", false);
    }
  };

  const handleDeleteScale = async (id) => {
    if (!window.confirm("Supprimer cette règle de conversion ?")) return;
    try {
      const res = await fetch(`${API_BASE}/grades/scale/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Règle supprimée.");
        fetchGlobalData();
      }
    } catch (e) {
      showNotification("Erreur.", false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      {/* 1. Subjects Configuration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Matières du Référentiel</h3>
          
          {user?.role === 'Administrateur' && (
            <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label htmlFor="config-new-subject" style={{ display: 'none' }}>Nouvelle matière</label>
              <input 
                id="config-new-subject"
                type="text" 
                placeholder="Ex: Physique-Chimie" 
                value={newSubj} 
                onChange={(e) => setNewSubj(e.target.value)} 
                required 
              />
              <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>Ajouter</button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {subjects.map(s => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0.8rem', backgroundColor: 'var(--slate-50)', borderRadius: '6px', border: '1px solid var(--slate-100)'
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</span>
                {user?.role === 'Administrateur' && (
                  <button onClick={() => handleDeleteSubject(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Scale Configuration */}
      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Barème de Conversion (Notes ➔ Lettres)</h3>
        
        {user?.role === 'Administrateur' && (
          <form onSubmit={handleAddScale} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label htmlFor="scale-min-score">Score Min</label>
              <input id="scale-min-score" type="number" min="0" max="100" placeholder="0" value={minS} onChange={(e) => setMinS(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="scale-max-score">Score Max</label>
              <input id="scale-max-score" type="number" min="0" max="100" placeholder="59.99" value={maxS} onChange={(e) => setMaxS(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="scale-letter-grade">Lettre</label>
              <input id="scale-letter-grade" type="text" placeholder="E" value={letter} onChange={(e) => setLetter(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="scale-status-label">Mention / Status</label>
              <input id="scale-status-label" type="text" placeholder="Insuffisant" value={status} onChange={(e) => setStatus(e.target.value)} required />
            </div>

            <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', justifyContent: 'center', marginTop: '0.5rem' }}>
              Ajouter Règle
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {scales.map(s => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.6rem 0.8rem', backgroundColor: 'var(--slate-50)', borderRadius: '6px', border: '1px solid var(--slate-100)', fontSize: '0.85rem'
            }}>
              <div>
                <span>De <strong>{s.min_score}</strong> à <strong>{s.max_score}</strong> ➔ </span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{s.letter_grade} ({s.status_label})</span>
              </div>
              {user?.role === 'Administrateur' && (
                <button onClick={() => handleDeleteScale(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Emploi du temps (Administrateur only) */}
      {user?.role === 'Administrateur' && (
        <div style={{ gridColumn: 'span 2', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Emploi du Temps de l'Établissement</h3>
          <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Construisez le calendrier hebdomadaire : sélectionnez un jour, une plage horaire, une matière et une classe. Le professeur sera attribué ensuite depuis la rubrique Professeurs.
          </p>

          <form onSubmit={handleAddSlot} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '0.75rem', alignItems: 'end', marginBottom: '1.5rem' }}>
            <div>
              <label htmlFor="sched-class">Classe</label>
              <select id="sched-class" value={schedClassId} onChange={(e) => setSchedClassId(e.target.value)} required>
                <option value="">Sélectionner...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sched-day">Jour</label>
              <select id="sched-day" value={schedDay} onChange={(e) => setSchedDay(e.target.value)}>
                {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sched-start">Heure début</label>
              <input id="sched-start" type="time" value={schedStart} onChange={(e) => setSchedStart(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="sched-end">Heure fin</label>
              <input id="sched-end" type="time" value={schedEnd} onChange={(e) => setSchedEnd(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="sched-subject">Matière</label>
              <select id="sched-subject" value={schedSubjectId} onChange={(e) => setSchedSubjectId(e.target.value)} required>
                <option value="">Sélectionner...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ height: 'fit-content' }}>Enregistrer</button>
          </form>

          {!schedClassId ? (
            <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Sélectionnez une classe pour afficher son emploi du temps.</p>
          ) : schedLoading ? (
            <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Chargement...</p>
          ) : schedSlots.length === 0 ? (
            <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem' }}>Aucun créneau configuré pour cette classe.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Jour</th>
                  <th style={{ padding: '0.5rem' }}>Heure</th>
                  <th style={{ padding: '0.5rem' }}>Matière</th>
                  <th style={{ padding: '0.5rem' }}>Professeur</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedSlots.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{s.day_label}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{s.start_time} – {s.end_time}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{s.subject_name || '—'}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{s.teacher_email || <span style={{ color: '#D97706' }}>Non attribué</span>}</td>
                    <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteSlot(s.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: AUDIT LOGS (ADMIN ONLY)
// ==========================================
function LogsView({ logs }) {
  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Journal d'Audit des Connexions</h3>
      <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Suivi en temps réel des accès de sécurité (protection brute-force et détection des anomalies).
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--slate-200)', color: 'var(--slate-700)', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Date & Heure (UTC)</th>
            <th style={{ padding: '0.5rem' }}>Compte visé</th>
            <th style={{ padding: '0.5rem' }}>Adresse IP</th>
            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Résultat</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
              <td style={{ padding: '0.75rem 0.5rem', color: '#64748B' }}>
                {log.timestamp.replace('T', ' ').substring(0, 19)}
              </td>
              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{log.email}</td>
              <td style={{ padding: '0.75rem 0.5rem', color: '#64748B' }}>{log.ip_address}</td>
              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                <span style={{
                  padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem',
                  backgroundColor: log.success ? '#DCFCE7' : '#FEE2E2',
                  color: log.success ? '#15803D' : '#B91C1C'
                }}>
                  {log.success ? "Succès" : "Échec"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================
// VIEW: TEACHERS ADMIN (Administrateur only)
// ==========================================
function TeachersAdminView({ token, teachers, assignments, classes, subjects, academicYear, fetchGlobalData, showNotification, onViewTeacher }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState(null);
  const [creating, setCreating] = useState(false);

  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignClassId, setAssignClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // --- Attribution des cours (liée au calendrier déjà configuré) ---
  const [courseClassId, setCourseClassId] = useState('');
  const [courseSlots, setCourseSlots] = useState([]);
  const [courseSlotTeacher, setCourseSlotTeacher] = useState({}); // slot_id -> teacher_id picked in the dropdown
  const [loadingCourseSlots, setLoadingCourseSlots] = useState(false);

  const loadCourseSlots = async (classId) => {
    if (!classId) { setCourseSlots([]); return; }
    setLoadingCourseSlots(true);
    try {
      const res = await fetch(`${API_BASE}/schedule/class/${classId}?academic_year=${academicYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourseSlots(data.slots || []);
      }
    } catch (e) {
      showNotification("Erreur lors du chargement du calendrier de la classe.", false);
    } finally {
      setLoadingCourseSlots(false);
    }
  };

  useEffect(() => {
    if (courseClassId) loadCourseSlots(courseClassId);
  }, [courseClassId, academicYear]);

  const handleAssignSlotTeacher = async (slotId) => {
    const teacherId = courseSlotTeacher[slotId];
    if (!teacherId) {
      showNotification("Sélectionnez d'abord un professeur pour ce créneau.", false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/schedule/slots/${slotId}/assign-teacher`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ teacher_id: parseInt(teacherId, 10) })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        loadCourseSlots(courseClassId);
        fetchGlobalData();
      } else {
        showNotification(data.message || "Erreur lors de l'attribution.", false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de l'attribution.", false);
    }
  };

  const handleUnassignSlotTeacher = async (slotId) => {
    if (!window.confirm("Retirer le professeur de ce créneau ?")) return;
    try {
      const res = await fetch(`${API_BASE}/schedule/slots/${slotId}/unassign-teacher`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        loadCourseSlots(courseClassId);
        fetchGlobalData();
      } else {
        showNotification(data.message || "Erreur.", false);
      }
    } catch (e) {
      showNotification("Erreur réseau.", false);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showNotification("Email et mot de passe sont requis.", false);
      return;
    }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phone_number', phoneNumber);
      formData.append('address', address);
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await fetch(`${API_BASE}/teachers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        setEmail('');
        setPassword('');
        setPhoneNumber('');
        setAddress('');
        setPhoto(null);
        fetchGlobalData();
      } else {
        showNotification(data.message, false);
      }
    } catch (err) {
      showNotification("Erreur réseau lors de la création du professeur.", false);
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignTeacherId || !assignSubjectId || !assignClassId) {
      showNotification("Sélectionnez un professeur, une matière et une classe.", false);
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`${API_BASE}/teachers/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          teacher_id: parseInt(assignTeacherId),
          subject_id: parseInt(assignSubjectId),
          class_id: parseInt(assignClassId)
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        setAssignTeacherId('');
        setAssignSubjectId('');
        setAssignClassId('');
        fetchGlobalData();
      } else {
        showNotification(data.message, false);
      }
    } catch (err) {
      showNotification("Erreur réseau lors de l'assignation.", false);
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm("Retirer cette assignation ?")) return;
    try {
      const res = await fetch(`${API_BASE}/teachers/assignments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        fetchGlobalData();
      } else {
        showNotification(data.message, false);
      }
    } catch (err) {
      showNotification("Erreur réseau lors de la suppression.", false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Create Teacher */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Créer un compte Professeur</h3>
          <form onSubmit={handleCreateTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label htmlFor="teacher-email">Email</label>
              <input id="teacher-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="teacher-password">Mot de passe</label>
              <input id="teacher-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="teacher-phone">Numéro de téléphone</label>
              <input id="teacher-phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+33 6 12 34 56 78" />
            </div>
            <div>
              <label htmlFor="teacher-address">Adresse</label>
              <input id="teacher-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ville, adresse..." />
            </div>
            <div>
              <label htmlFor="teacher-photo">Photo</label>
              <input id="teacher-photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
            </div>
            <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '0.5rem' }}>
              <Plus size={16} /> {creating ? 'Création...' : 'Créer le professeur'}
            </button>
          </form>
        </div>

        {/* Assign Teacher to Class/Subject */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Assigner un Professeur</h3>
          <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label htmlFor="assign-teacher">Professeur</label>
              <select id="assign-teacher" value={assignTeacherId} onChange={(e) => setAssignTeacherId(e.target.value)} required>
                <option value="" disabled>Sélectionner un professeur</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assign-subject">Matière</label>
              <select id="assign-subject" value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value)} required>
                <option value="" disabled>Sélectionner une matière</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assign-class">Classe</label>
              <select id="assign-class" value={assignClassId} onChange={(e) => setAssignClassId(e.target.value)} required>
                <option value="" disabled>Sélectionner une classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={assigning} style={{ marginTop: '0.5rem' }}>
              <Plus size={16} /> {assigning ? 'Assignation...' : 'Assigner'}
            </button>
          </form>
        </div>
      </div>

      {/* Teachers List */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Liste des Professeurs</h3>
        {teachers.length === 0 ? (
          <p style={{ color: 'var(--slate-700)' }}>Aucun professeur enregistré pour le moment.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}></th>
                <th style={{ padding: '0.5rem' }}>Email</th>
                <th style={{ padding: '0.5rem' }}>Téléphone</th>
                <th style={{ padding: '0.5rem' }}>Adresse</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Fiche détaillée</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t.photo_url ? (
                        <img src={`http://127.0.0.1:5000${t.photo_url}`} alt={t.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.8rem' }}>{t.email[0].toUpperCase()}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{t.email}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{t.phone_number || '—'}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{t.address || '—'}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <button onClick={() => onViewTeacher(t.id)} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                      Voir la fiche
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Assignments Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Assignations actuelles</h3>
        {assignments.length === 0 ? (
          <p style={{ color: 'var(--slate-700)' }}>Aucune assignation pour le moment.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Professeur</th>
                <th style={{ padding: '0.5rem' }}>Matière</th>
                <th style={{ padding: '0.5rem' }}>Classe</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{a.teacher_email}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{a.subject_name}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{a.class_name}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <button onClick={() => handleDeleteAssignment(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Attribution des cours (liée au calendrier déjà configuré) */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Attribution des Cours (Emploi du Temps)</h3>
        <p style={{ color: 'var(--slate-700)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Sélectionnez une classe pour voir son emploi du temps déjà configuré, puis attribuez un professeur à
          chaque créneau. Un conflit d'horaire pour ce professeur est automatiquement refusé.
        </p>

        <div style={{ maxWidth: '320px', marginBottom: '1rem' }}>
          <label htmlFor="course-class">Classe</label>
          <select id="course-class" value={courseClassId} onChange={(e) => setCourseClassId(e.target.value)}>
            <option value="">Sélectionner une classe...</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {!courseClassId ? (
          <p style={{ color: 'var(--slate-700)' }}>Sélectionnez une classe pour afficher son emploi du temps.</p>
        ) : loadingCourseSlots ? (
          <p style={{ color: 'var(--slate-700)' }}>Chargement...</p>
        ) : courseSlots.length === 0 ? (
          <p style={{ color: 'var(--slate-700)' }}>
            Aucun créneau configuré pour cette classe. Créez d'abord l'emploi du temps dans Configuration.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Jour</th>
                <th style={{ padding: '0.5rem' }}>Heure</th>
                <th style={{ padding: '0.5rem' }}>Matière</th>
                <th style={{ padding: '0.5rem' }}>Professeur attribué</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {courseSlots.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{s.day_label}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{s.start_time} – {s.end_time}</td>
                  <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{s.subject_name || '—'}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    {s.teacher_email ? (
                      <span style={{ color: '#16A34A', fontWeight: 600 }}>{s.teacher_email}</span>
                    ) : (
                      <span style={{ color: '#D97706' }}>Non attribué</span>
                    )}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
                    {s.teacher_email ? (
                      <button
                        onClick={() => handleUnassignSlotTeacher(s.id)}
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                      >
                        Retirer
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <label htmlFor={`course-slot-teacher-${s.id}`} style={{ display: 'none' }}>Professeur</label>
                        <select
                          id={`course-slot-teacher-${s.id}`}
                          value={courseSlotTeacher[s.id] || ''}
                          onChange={(e) => setCourseSlotTeacher({ ...courseSlotTeacher, [s.id]: e.target.value })}
                          style={{ fontSize: '0.8rem' }}
                        >
                          <option value="">Professeur...</option>
                          {teachers.map((t) => <option key={t.id} value={t.id}>{t.email}</option>)}
                        </select>
                        <button
                          onClick={() => handleAssignSlotTeacher(s.id)}
                          className="btn-primary"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                        >
                          Attribuer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VIEW: TEACHER SPACE (Professeur only)
// Présence + Notes (Devoir/Examen) + fiche élève
// ==========================================
function TeacherSpaceView({ token, myAssignments, term, academicYear, showNotification }) {
  const [selectedKey, setSelectedKey] = useState('');
  const [tab, setTab] = useState('presence'); // 'presence' | 'notes'
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState({}); // student_id -> { status, late }
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Grades state
  const [markInputs, setMarkInputs] = useState({}); // student_id -> { mark, grade_type }
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [resultsMap, setResultsMap] = useState({}); // student_id -> { devoirs, examens, average }
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const selectedAssignment = myAssignments.find(a => `${a.subject_id}-${a.class_id}` === selectedKey);

  const loadStudents = async (classId) => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClassStudents(data.students || []);
      }
    } catch (e) {
      showNotification("Erreur lors du chargement des élèves.", false);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadAttendanceSession = async () => {
    if (!selectedAssignment) return;
    try {
      const res = await fetch(
        `${API_BASE}/attendance?class_id=${selectedAssignment.class_id}&subject_id=${selectedAssignment.subject_id}&date=${attendanceDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const map = {};
        if (data.session) {
          data.session.records.forEach(r => {
            map[r.student_id] = { status: r.status, late: r.late };
          });
        }
        setAttendanceMap(map);
      }
    } catch (e) {
      // silently ignore, teacher can still fill it from scratch
    }
  };

  useEffect(() => {
    if (selectedAssignment) {
      loadStudents(selectedAssignment.class_id);
      setSelectedStudent(null);
      setStudentProfile(null);
    }
  }, [selectedKey]);

  useEffect(() => {
    if (selectedAssignment && tab === 'presence') {
      loadAttendanceSession();
    }
  }, [attendanceDate, selectedKey, tab]);

  const loadAllResults = async () => {
    if (!selectedAssignment || classStudents.length === 0) return;
    try {
      const entries = await Promise.all(classStudents.map(async (s) => {
        const res = await fetch(
          `${API_BASE}/grades/student/${s.id}/subject/${selectedAssignment.subject_id}/average?term=${term}&academic_year=${academicYear}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = res.ok ? await res.json() : { devoirs: [], examens: [], average: null };
        return [s.id, data];
      }));
      setResultsMap(Object.fromEntries(entries));
    } catch (e) {
      // silent: the "Résultat" column simply stays empty if this fails
    }
  };

  useEffect(() => {
    if (selectedAssignment && tab === 'notes' && classStudents.length > 0) {
      loadAllResults();
    }
  }, [selectedKey, tab, classStudents]);

  const setAttendanceStatus = (studentId, status) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));
  };

  const setAttendanceLate = (studentId, late) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], late } }));
  };

  const handleSaveAttendance = async () => {
    const records = classStudents
      .filter(s => attendanceMap[s.id]?.status)
      .map(s => ({
        student_id: s.id,
        status: attendanceMap[s.id].status,
        late: attendanceMap[s.id].late ?? null
      }));

    if (records.length === 0) {
      showNotification("Sélectionnez au moins un statut Présent/Absent avant d'enregistrer.", false);
      return;
    }

    setSavingAttendance(true);
    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          class_id: selectedAssignment.class_id,
          subject_id: selectedAssignment.subject_id,
          date: attendanceDate,
          term, academic_year: academicYear,
          records
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
      } else {
        showNotification(data.message, false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de l'enregistrement de la présence.", false);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleMarkInputChange = (studentId, field, value) => {
    setMarkInputs(prev => ({
      ...prev,
      [studentId]: { mark: '', grade_type: 'Devoir', ...prev[studentId], [field]: value }
    }));
  };

  const handleAddGrade = async (studentId) => {
    const input = markInputs[studentId];
    if (!input || input.mark === '' || input.mark === undefined) {
      showNotification("Saisissez une note avant d'enregistrer.", false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          student_id: studentId,
          subject_id: selectedAssignment.subject_id,
          mark: parseFloat(input.mark),
          term, academic_year: academicYear,
          grade_type: input.grade_type || 'Devoir',
          date: noteDate
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        setMarkInputs(prev => ({ ...prev, [studentId]: { mark: '', grade_type: input.grade_type || 'Devoir' } }));
        loadAllResults();
        if (selectedStudent?.id === studentId) {
          loadStudentProfile(studentId);
        }
      } else {
        showNotification(data.message, false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de l'enregistrement de la note.", false);
    }
  };

  const startEditGrade = (gradeId, currentMark) => {
    setEditingGradeId(gradeId);
    setEditValue(String(currentMark));
  };

  const cancelEditGrade = () => {
    setEditingGradeId(null);
    setEditValue('');
  };

  const saveEditGrade = async (gradeId, studentId) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0 || val > 100) {
      showNotification("La note doit être un nombre valide entre 0 et 100.", false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/grades/${gradeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ mark: val })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        setEditingGradeId(null);
        setEditValue('');
        loadAllResults();
        if (selectedStudent?.id === studentId) {
          loadStudentProfile(studentId);
        }
      } else {
        showNotification(data.message, false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la modification de la note.", false);
    }
  };

  const handleDeleteGradeEntry = async (gradeId, studentId) => {
    if (!window.confirm("Supprimer définitivement cette note ?")) return;
    try {
      const res = await fetch(`${API_BASE}/grades/${gradeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        loadAllResults();
        if (selectedStudent?.id === studentId) {
          loadStudentProfile(studentId);
        }
      } else {
        showNotification(data.message, false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la suppression de la note.", false);
    }
  };

  const loadStudentProfile = async (studentId) => {
    setLoadingProfile(true);
    try {
      const [avgRes, rateRes] = await Promise.all([
        fetch(`${API_BASE}/grades/student/${studentId}/subject/${selectedAssignment.subject_id}/average?term=${term}&academic_year=${academicYear}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/attendance/student/${studentId}/rate`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      const avgData = avgRes.ok ? await avgRes.json() : null;
      const rateData = rateRes.ok ? await rateRes.json() : null;
      setStudentProfile({ ...avgData, attendance_rate: rateData?.attendance_rate ?? null });
    } catch (e) {
      showNotification("Erreur lors du chargement de la fiche élève.", false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    loadStudentProfile(student.id);
  };

  if (myAssignments.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-700)' }}>
        Vous n'avez pas encore été assigné à une classe/matière. Contactez l'administration.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Assignment selector */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="assignment-select">Ma classe / matière</label>
          <select id="assignment-select" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} style={{ minWidth: '260px' }}>
            <option value="" disabled>Sélectionner...</option>
            {myAssignments.map((a) => (
              <option key={a.id} value={`${a.subject_id}-${a.class_id}`}>
                {a.subject_name} — {a.class_name}
              </option>
            ))}
          </select>
        </div>

        {selectedAssignment && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setTab('presence')}
              className={tab === 'presence' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              Présence
            </button>
            <button
              onClick={() => setTab('notes')}
              className={tab === 'notes' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
            >
              Notes
            </button>
          </div>
        )}
      </div>

      {!selectedAssignment && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-700)' }}>
          Choisissez une classe/matière ci-dessus pour commencer.
        </div>
      )}

      {selectedAssignment && loadingStudents && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-700)' }}>Chargement des élèves...</div>
      )}

      {/* --- PRÉSENCE TAB --- */}
      {selectedAssignment && !loadingStudents && tab === 'presence' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="attendance-date">Date</label>
              <input id="attendance-date" type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>
            <button onClick={handleSaveAttendance} className="btn-primary" disabled={savingAttendance}>
              {savingAttendance ? 'Enregistrement...' : 'Enregistrer la présence'}
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Élève</th>
                <th style={{ padding: '0.5rem' }}>Présent</th>
                <th style={{ padding: '0.5rem' }}>Absent</th>
                <th style={{ padding: '0.5rem' }}>En retard (facultatif)</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((s) => {
                const current = attendanceMap[s.id] || {};
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input
                        type="radio"
                        name={`att-${s.id}`}
                        checked={current.status === 'Présent'}
                        onChange={() => setAttendanceStatus(s.id, 'Présent')}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input
                        type="radio"
                        name={`att-${s.id}`}
                        checked={current.status === 'Absent'}
                        onChange={() => setAttendanceStatus(s.id, 'Absent')}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={current.late === true}
                        onChange={(e) => setAttendanceLate(s.id, e.target.checked ? true : null)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- NOTES TAB --- */}
      {selectedAssignment && !loadingStudents && tab === 'notes' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '1.7fr 1fr' : '1fr', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="note-date">Date du devoir / examen</label>
              <input
                id="note-date" type="date" value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                style={{ maxWidth: '200px' }}
              />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Élève</th>
                  <th style={{ padding: '0.5rem' }}>Type</th>
                  <th style={{ padding: '0.5rem' }}>Note (/100)</th>
                  <th style={{ padding: '0.5rem' }}></th>
                  <th style={{ padding: '0.5rem' }}>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((s) => {
                  const input = markInputs[s.id] || { mark: '', grade_type: 'Devoir' };
                  const result = resultsMap[s.id];
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                        <button
                          onClick={() => handleSelectStudent(s)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--primary)', textAlign: 'left' }}
                        >
                          {s.first_name} {s.last_name}
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                        <select value={input.grade_type} onChange={(e) => handleMarkInputChange(s.id, 'grade_type', e.target.value)}>
                          <option value="Devoir">Devoir</option>
                          <option value="Examen">Examen</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                        <input
                          type="number" min="0" max="100" step="0.5" value={input.mark}
                          onChange={(e) => handleMarkInputChange(s.id, 'mark', e.target.value)}
                          style={{ width: '90px' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                        <button onClick={() => handleAddGrade(s.id)} className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                          Ajouter
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top', minWidth: '220px' }}>
                        {!result ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--slate-700)' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {result.devoirs.map((g) => (
                                <span key={g.id} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                  backgroundColor: '#EFF6FF', color: '#1E3A8A', borderRadius: '999px',
                                  padding: '0.2rem 0.5rem', fontSize: '0.75rem'
                                }}>
                                  D
                                  {editingGradeId === g.id ? (
                                    <>
                                      <input
                                        type="number" min="0" max="100" step="0.5" value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        style={{ width: '55px', fontSize: '0.75rem' }}
                                      />
                                      <button onClick={() => saveEditGrade(g.id, s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A' }}>✓</button>
                                      <button onClick={cancelEditGrade} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>✕</button>
                                    </>
                                  ) : (
                                    <>
                                      <span>{g.mark}</span>
                                      <button onClick={() => startEditGrade(g.id, g.mark)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E3A8A' }}><Edit2 size={12} /></button>
                                      <button onClick={() => handleDeleteGradeEntry(g.id, s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={12} /></button>
                                    </>
                                  )}
                                </span>
                              ))}
                              {result.examens.map((g) => (
                                <span key={g.id} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                  backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '999px',
                                  padding: '0.2rem 0.5rem', fontSize: '0.75rem'
                                }}>
                                  E
                                  {editingGradeId === g.id ? (
                                    <>
                                      <input
                                        type="number" min="0" max="100" step="0.5" value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        style={{ width: '55px', fontSize: '0.75rem' }}
                                      />
                                      <button onClick={() => saveEditGrade(g.id, s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A' }}>✓</button>
                                      <button onClick={cancelEditGrade} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>✕</button>
                                    </>
                                  ) : (
                                    <>
                                      <span>{g.mark}</span>
                                      <button onClick={() => startEditGrade(g.id, g.mark)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E' }}><Edit2 size={12} /></button>
                                      <button onClick={() => handleDeleteGradeEntry(g.id, s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={12} /></button>
                                    </>
                                  )}
                                </span>
                              ))}
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                              Moyenne : {result.average !== null && result.average !== undefined ? `${result.average}/100` : 'Pas de notes'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Student profile card, shown alongside grade entry */}
          {selectedStudent && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ marginTop: 0 }}>Fiche Élève</h3>
                <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#E2E8F0', flexShrink: 0 }}>
                  {selectedStudent.photo_url ? (
                    <img src={`http://127.0.0.1:5000${selectedStudent.photo_url}`} alt={selectedStudent.first_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--slate-700)' }}>{selectedStudent.email}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--slate-700)' }}>{selectedStudent.phone_number}</p>
                </div>
              </div>

              {loadingProfile && <p style={{ color: 'var(--slate-700)' }}>Chargement...</p>}

              {!loadingProfile && studentProfile && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--slate-700)' }}>Taux de présence</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                      {studentProfile.attendance_rate !== null ? `${studentProfile.attendance_rate}%` : 'N/A'}
                    </p>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--slate-700)' }}>
                      Moyenne {selectedAssignment.subject_name} ({term})
                    </p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                      {studentProfile.average !== null && studentProfile.average !== undefined ? `${studentProfile.average}/100` : 'Pas de notes'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-700)' }}>
                      {studentProfile.devoirs?.length || 0} devoir(s) · {studentProfile.examens?.length || 0} examen(s)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: NOTIFICATION CENTER (Administrateur only)
// ==========================================
function NotificationsView({ token, showNotification, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filterRead, setFilterRead] = useState('all'); // 'all' | 'unread' | 'read'
  const [filterLevel, setFilterLevel] = useState('Toutes');
  const [filterType, setFilterType] = useState('Tous');

  const TYPE_LABELS = {
    teacher_absence: 'Professeur absent',
    teacher_late: 'Retard professeur',
    student_grade_drop: 'Baisse de note',
    student_absences: 'Absences élèves',
    student_late: 'Retards élèves'
  };

  const loadNotifications = async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (filterRead !== 'all') params.set('is_read', filterRead === 'read' ? 'true' : 'false');
      if (filterLevel !== 'Toutes') params.set('level', filterLevel);
      if (filterType !== 'Tous') params.set('type', filterType);

      const res = await fetch(`${API_BASE}/notifications?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setNotifications(await res.json());
    } catch (e) {
      showNotification("Erreur lors du chargement des notifications.", false);
    } finally {
      setLoadingList(false);
    }
  };

  const refreshUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        onUnreadCountChange(data.unread_count);
      }
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filterRead, filterLevel, filterType]);

  const handleMarkRead = async (id, isRead) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_read: isRead })
      });
      if (res.ok) {
        loadNotifications();
        refreshUnreadCount();
      }
    } catch (e) {
      showNotification("Erreur réseau.", false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette notification ?")) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification("Notification supprimée.", true);
        loadNotifications();
        refreshUnreadCount();
      }
    } catch (e) {
      showNotification("Erreur réseau lors de la suppression.", false);
    }
  };

  const levelColor = (level) => {
    if (level === 'Critique') return { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' };
    if (level === 'Avertissement') return { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' };
    return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A8A' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={18} style={{ color: 'var(--slate-700)' }} />
        <div>
          <label htmlFor="filter-read" style={{ display: 'none' }}>Statut</label>
          <select id="filter-read" value={filterRead} onChange={(e) => setFilterRead(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="all">Toutes</option>
            <option value="unread">Non lues</option>
            <option value="read">Lues</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-level" style={{ display: 'none' }}>Priorité</label>
          <select id="filter-level" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="Toutes">Toutes priorités</option>
            <option value="Information">Information</option>
            <option value="Avertissement">Avertissement</option>
            <option value="Critique">Critique</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-type" style={{ display: 'none' }}>Type</label>
          <select id="filter-type" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="Tous">Tous types</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loadingList ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-700)' }}>Chargement des notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-700)' }}>
          Aucune notification pour ces filtres.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((n) => {
            const colors = levelColor(n.level);
            return (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: '1rem 1.5rem', borderLeft: `4px solid ${colors.border}`,
                  backgroundColor: n.is_read ? 'white' : colors.bg,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{n.title}</span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, color: colors.text, backgroundColor: colors.bg,
                      border: `1px solid ${colors.border}`, borderRadius: '999px', padding: '0.1rem 0.5rem'
                    }}>
                      {n.level}
                    </span>
                    {!n.is_read && (
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6', display: 'inline-block' }} />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--slate-900)' }}>{n.message}</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: 'var(--slate-700)' }}>
                    {TYPE_LABELS[n.notif_type] || n.notif_type} · {new Date(n.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleMarkRead(n.id, !n.is_read)}
                    className="btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    {n.is_read ? 'Marquer non lue' : 'Marquer lue'}
                  </button>
                  <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: TEACHER CALENDAR (Administrateur only)
// Shows every scheduled class for a day, with live presence status
// ==========================================
function TeacherCalendarView({ token, academicYear, showNotification, onViewTeacher }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const loadCalendar = async () => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`${API_BASE}/teacher-attendance/calendar?date=${date}&academic_year=${academicYear}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch (e) {
      showNotification("Erreur lors du chargement du calendrier.", false);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [date, academicYear]);

  const statusStyle = (status) => {
    if (status === 'Présent') return { bg: '#ECFDF5', text: '#065F46', label: 'Présent' };
    if (status === 'Retard') return { bg: '#FFFBEB', text: '#92400E', label: 'Retard' };
    if (status === 'Absent') return { bg: '#FEF2F2', text: '#991B1B', label: 'Absent' };
    return { bg: '#F1F5F9', text: '#475569', label: 'En attente' };
  };

  const handleMark = async (slotId, status) => {
    try {
      const res = await fetch(`${API_BASE}/teacher-attendance/slots/${slotId}/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ date, status })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message, true);
        loadCalendar();
      } else {
        showNotification(data.message || "Erreur lors du marquage.", false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors du marquage.", false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label htmlFor="calendar-date" style={{ margin: 0 }}>Date</label>
        <input id="calendar-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={loadCalendar} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Rafraîchir
        </button>
      </div>

      {loadingSlots ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-700)' }}>Chargement du calendrier...</div>
      ) : slots.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-700)' }}>
          Aucun cours planifié ce jour-là.
        </div>
      ) : (
        <div className="card" style={{ padding: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Heure</th>
                <th style={{ padding: '0.5rem' }}>Matière</th>
                <th style={{ padding: '0.5rem' }}>Professeur</th>
                <th style={{ padding: '0.5rem' }}>Classe</th>
                <th style={{ padding: '0.5rem' }}>Statut</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s) => {
                const st = statusStyle(s.attendance_status);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{s.start_time} – {s.end_time}</td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{s.subject_name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{s.teacher_email}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{s.class_name}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{
                        backgroundColor: st.bg, color: st.text, borderRadius: '999px',
                        padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleMark(s.id, 'Présent')}
                          title="Marquer présent"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #16A34A', color: '#16A34A', background: 'white', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Présent
                        </button>
                        <button
                          onClick={() => handleMark(s.id, 'Retard')}
                          title="Marquer en retard"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #D97706', color: '#D97706', background: 'white', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Retard
                        </button>
                        <button
                          onClick={() => handleMark(s.id, 'Absent')}
                          title="Marquer absent"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #DC2626', color: '#DC2626', background: 'white', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => onViewTeacher(s.teacher_id)}
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                        >
                          Fiche
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// ==========================================
// VIEW: TEACHER DETAIL (Administrateur only)
// Photo, coordonnées, classes attribuées, statistiques de présence
// ==========================================
function TeacherDetailView({ token, teacherId, showNotification, onBack }) {
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  const loadProfile = async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`${API_BASE}/teacher-attendance/teacher/${teacherId}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        showNotification("Impossible de charger la fiche du professeur.", false);
      }
    } catch (e) {
      showNotification("Erreur réseau lors du chargement de la fiche.", false);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (teacherId) loadProfile();
  }, [teacherId]);

  if (loadingData) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-700)' }}>Chargement de la fiche...</div>;
  if (!data) return null;

  const { teacher, assignments, stats } = data;
  const monthlyChartData = stats.monthly_stats.map(m => ({
    name: m.month,
    Présent: m.Présent,
    Retard: m.Retard,
    Absent: m.Absent
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <button onClick={onBack} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={16} /> Retour aux professeurs
      </button>

      {/* Identity card */}
      <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {teacher.photo_url ? (
            <img src={`http://127.0.0.1:5000${teacher.photo_url}`} alt={teacher.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.5rem' }}>{teacher.email[0].toUpperCase()}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{teacher.email}</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--slate-700)', fontSize: '0.85rem' }}>{teacher.phone_number || 'Téléphone non renseigné'}</p>
          <p style={{ margin: 0, color: 'var(--slate-700)', fontSize: '0.85rem' }}>{teacher.address || 'Adresse non renseignée'}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxWidth: '320px' }}>
          {assignments.length === 0 ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--slate-700)' }}>Aucune classe attribuée.</span>
          ) : (
            assignments.map(a => (
              <span key={a.id} style={{
                backgroundColor: '#EFF6FF', color: 'var(--primary)', borderRadius: '999px',
                padding: '0.25rem 0.7rem', fontSize: '0.75rem', fontWeight: 600
              }}>
                {a.subject_name} · {a.class_name}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Presence KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>TAUX DE PRÉSENCE</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#16A34A' }}>{stats.presence_rate}%</h2>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>TAUX D'ABSENCE</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#DC2626' }}>{stats.absence_rate}%</h2>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>NOMBRE DE RETARDS</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: '#D97706' }}>{stats.late_count}</h2>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>SÉANCES SUIVIES</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0', color: 'var(--slate-900)' }}>{stats.total_sessions}</h2>
        </div>
      </div>

      {/* Monthly chart */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Statistiques mensuelles</h3>
        {monthlyChartData.length === 0 ? (
          <p style={{ color: 'var(--slate-700)', textAlign: 'center', padding: '2rem' }}>Pas encore de données de présence.</p>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} />
                <Legend />
                <Bar dataKey="Présent" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Retard" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Absent" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* History table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Historique des présences</h3>
        {stats.history.length === 0 ? (
          <p style={{ color: 'var(--slate-700)', textAlign: 'center', padding: '1rem' }}>Aucun historique disponible.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Date</th>
                <th style={{ padding: '0.5rem' }}>Matière</th>
                <th style={{ padding: '0.5rem' }}>Classe</th>
                <th style={{ padding: '0.5rem' }}>Créneau</th>
                <th style={{ padding: '0.5rem' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {stats.history.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{r.date}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{r.subject_name}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{r.class_name}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>{r.start_time} – {r.end_time}</td>
                  <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
