import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activePage, onNavigate }) {
  const { logout } = useAuth();

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <span className="nav-icon">
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L3 11H6V20C6 20.55 6.45 21 7 21H17C17.55 21 18 20.55 18 20V11H21L12 3Z" fill="#ea580c"/>
              <rect x="8.5" y="12" width="3" height="3" rx="0.5" fill="white"/>
              <rect x="12.5" y="14" width="3" height="7" rx="0.5" fill="white"/>
              <rect x="15.5" y="5" width="1.5" height="4" fill="white"/>
            </svg>
          </span>
          <span className="nav-label">Home</span>
        </button>

        <button
          className={`nav-item ${activePage === 'attendance' ? 'active' : ''}`}
          onClick={() => onNavigate('attendance')}
        >
          <span className="nav-icon">
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="11" fill="#ea580c"/>
              <path d="M9.5 12.5L11 14L14.5 10.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <span className="nav-label">Attendance</span>
        </button>

        <button
          className={`nav-item ${activePage === 'locations' ? 'active' : ''}`}
          onClick={() => onNavigate('locations')}
        >
          <span className="nav-icon">
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#ea580c"/>
              <circle cx="12" cy="9" r="3" fill="white"/>
            </svg>
          </span>
          <span className="nav-label">Locations</span>
        </button>

        <button
          className={`nav-item ${activePage === 'users' ? 'active' : ''}`}
          onClick={() => onNavigate('users')}
        >
          <span className="nav-icon">
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="11" fill="#ea580c"/>
              <circle cx="12" cy="8.5" r="3.5" fill="white"/>
              <path d="M12 13C8.5 13 5.5 15 5 18.5C5.8 19.5 7 20 12 20C17 20 18.2 19.5 19 18.5C18.5 15 15.5 13 12 13Z" fill="white"/>
            </svg>
          </span>
          <span className="nav-label">Users</span>
        </button>

        <button
          className={`nav-item ${activePage === 'reports' ? 'active' : ''}`}
          onClick={() => onNavigate('reports')}
        >
          <span className="nav-icon">
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="2" width="18" height="20" rx="3" fill="#ea580c"/>
              <rect x="7" y="6" width="10" height="2" rx="0.5" fill="white"/>
              <rect x="7" y="10" width="10" height="2" rx="0.5" fill="white"/>
              <rect x="7" y="14" width="6" height="2" rx="0.5" fill="white"/>
            </svg>
          </span>
          <span className="nav-label">Reports</span>
        </button>

        <button className="nav-item" onClick={logout}>
          <span className="nav-icon">
            <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="11" fill="#ea580c"/>
              <path d="M7 17V7C7 5.9 7.9 5 9 5H13V7H9V17H13V19H9C7.9 19 7 18.1 7 17Z" fill="white"/>
              <path d="M16.5 12L13.5 9V11H10V13H13.5V15L16.5 12Z" fill="white"/>
            </svg>
          </span>
          <span className="nav-label">Logout</span>
        </button>
      </nav>
    </aside>
  );
}
