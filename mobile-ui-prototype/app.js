/* ==========================================================================
   ATTENDX PORTAL — MAIN UNIFIED PORTAL CLIENT LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const API_BASE = 'http://localhost:5000/api';

  // ─── PWA SERVICE WORKER REGISTRATION ───────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[Service Worker] Registered successfully:', reg.scope))
        .catch(err => console.error('[Service Worker] Registration failed:', err));
    });
  }

  // ─── PWA INSTALLATION BANNER LOGIC ──────────────────────────────────────
  let deferredPrompt = null;
  const pwaInstallBtn = document.getElementById('btn-pwa-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser banner
    e.preventDefault();
    // Save the event for trigger later
    deferredPrompt = e;
    // Show the custom Install App button in our header
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = 'inline-flex';
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      // Show native install dialog
      deferredPrompt.prompt();
      // Wait for user choices
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Install choice outcome: ${outcome}`);
      // Clear the prompt event
      deferredPrompt = null;
      // Hide our custom Install App button
      pwaInstallBtn.style.display = 'none';
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] AttendX was successfully installed as an app!');
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = 'none';
    }
  });

  // ─── STATE MANAGEMENT ───────────────────────────────────────────────────
  let token = localStorage.getItem('token') || null;
  let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
  let activeTab = 'emp-home';
  let activeLocations = [];
  let selectedLocation = null;
  let webcamStream = null;
  let capturedFaceImage = null;
  let fingerprintEnrolled = true;
  let isCheckedIn = false;

  // Real-time telemetry coordinates
  let userCoords = { latitude: 0, longitude: 0 };

  // ─── INITIALIZATION ─────────────────────────────────────────────────────
  initSession();

  function initSession() {
    if (token && currentUser) {
      document.getElementById('auth-section').style.display = 'none';
      document.getElementById('header-user-menu').style.display = 'flex';
      
      const avatarBtn = document.getElementById('btn-user-profile-menu');
      if (currentUser.profileImage) {
        avatarBtn.innerHTML = `<img src="${currentUser.profileImage}" alt="Face" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" id="user-initials">`;
      } else {
        avatarBtn.innerHTML = `<span id="user-initials">${getInitials(currentUser.name)}</span>`;
      }
      
      document.getElementById('header-role-badge').textContent = currentUser.role === 'admin' ? 'Manager' : 'Employee';

      if (currentUser.role === 'admin') {
        document.getElementById('employee-portal').style.display = 'none';
        document.getElementById('manager-portal').style.display = 'flex';
        switchTab('mgr-home');
        loadManagerDashboard();
      } else {
        document.getElementById('manager-portal').style.display = 'none';
        document.getElementById('employee-portal').style.display = 'flex';
        switchTab('emp-home');
        loadEmployeeDashboard();
      }
    } else {
      showAuthCard('login');
      document.getElementById('employee-portal').style.display = 'none';
      document.getElementById('manager-portal').style.display = 'none';
      document.getElementById('header-user-menu').style.display = 'none';
    }
  }

  // Helper helper helpers
  function getInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  function showAuthCard(type) {
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('login-card').classList.remove('active');
    document.getElementById('register-card').classList.remove('active');
    if (type === 'login') {
      document.getElementById('login-card').classList.add('active');
    } else {
      document.getElementById('register-card').classList.add('active');
      switchRegisterStep(1);
    }
  }

  // ─── AUTHENTICATION API LOGIC ───────────────────────────────────────────

  // Login Submit
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      // Determine if admin or user based on credentials
      // Let's call the backend auth endpoint
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        token = data.data.token;
        currentUser = data.data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        alert(`Sign In Successful! Welcome ${currentUser.name}`);
        initSession();
      } else {
        // Fallback for special admin account registration check
        // Or if backend fails, check role. Let's try admin login if normal fails
        const adminResponse = await fetch(`${API_BASE}/auth/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const adminData = await adminResponse.json();

        if (adminData.success) {
          token = adminData.data.token;
          currentUser = adminData.data.user;
          localStorage.setItem('token', token);
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
          alert(`Sign In Successful as Manager!`);
          initSession();
        } else {
          alert(data.message || adminData.message || 'Invalid Credentials');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend API server. Make sure backend is running.');
    }
  });

  // Logout Trigger
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    token = null;
    currentUser = null;
    stopWebcam(webcamStream);
    initSession();
  });

  // Profile Logout Trigger
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-profile-logout') {
      document.getElementById('btn-logout').click();
    }
  });

  // Switch Auth Card Links
  document.getElementById('link-show-register').addEventListener('click', (e) => {
    e.preventDefault();
    showAuthCard('register');
  });
  document.getElementById('link-show-login').addEventListener('click', (e) => {
    e.preventDefault();
    showAuthCard('login');
  });

  // ─── STEPPED REGISTRATION LOGIC ──────────────────────────────────────────
  let regDetails = {};

  // Step 1 Details form submit
  document.getElementById('form-register-details').addEventListener('submit', (e) => {
    e.preventDefault();
    regDetails = {
      name: document.getElementById('reg-name').value,
      employeeId: document.getElementById('reg-emp-id').value,
      email: document.getElementById('reg-email').value,
      department: document.getElementById('reg-dept').value,
      role: document.getElementById('reg-role').value,
      phone: document.getElementById('reg-phone').value,
      password: document.getElementById('reg-password').value
    };
    switchRegisterStep(2);
    startWebcam('reg-camera-stream');
  });

  // Step 2 Face Biometric Capture
  document.getElementById('btn-capture-face').addEventListener('click', () => {
    const video = document.getElementById('reg-camera-stream');
    const canvas = document.getElementById('reg-camera-canvas');
    const preview = document.getElementById('face-captured-preview');
    const img = document.getElementById('captured-avatar-img');
    const submitBtn = document.getElementById('btn-submit-register');

    if (video && canvas) {
      const context = canvas.getContext('2d');
      
      // Fallback if camera stream is blocked or inactive
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        canvas.width = 200;
        canvas.height = 200;
        context.fillStyle = '#ea580c'; // Brand primary color
        context.beginPath();
        context.arc(100, 100, 100, 0, 2 * Math.PI);
        context.fill();
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 80px Inter';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const initials = getInitials(document.getElementById('reg-name').value);
        context.fillText(initials, 100, 100);
      } else {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      try {
        capturedFaceImage = canvas.toDataURL('image/jpeg');
        img.src = capturedFaceImage;
        preview.style.display = 'flex';
        video.parentNode.style.display = 'none'; // hide live feed
        submitBtn.removeAttribute('disabled');
      } catch (err) {
        console.error(err);
      }
    }
  });

  // Registration is submitted directly from Step 2 when the Complete Registration button is clicked.

  // Submit complete registration
  document.getElementById('btn-submit-register').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regDetails,
          profileImage: capturedFaceImage
        })
      });
      const data = await response.json();

      if (data.success) {
        alert('Registration Successful! Please Sign In.');
        showAuthCard('login');
      } else {
        alert(data.message || 'Registration Failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error registering user.');
    }
  });

  function switchRegisterStep(step) {
    document.querySelectorAll('.register-step-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.register-progress-bar .progress-step').forEach(el => el.classList.remove('active'));

    document.getElementById(`register-step-${step}`).classList.add('active');
    
    // Highlight steps
    for (let i = 1; i <= step; i++) {
      const el = document.querySelector(`.progress-step[data-step="${i}"]`);
      if (el) el.classList.add('active');
    }
  }

  // ─── WEBCAM HANDLERS ────────────────────────────────────────────────────
  function startWebcam(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;

    // Reset camera preview display
    video.parentNode.style.display = 'block';
    const preview = document.getElementById('face-captured-preview');
    if (preview) preview.style.display = 'none';

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          webcamStream = stream;
          video.srcObject = stream;
        })
        .catch(err => {
          console.warn('Camera blocked or unavailable. Visual fallbacks enabled.', err);
        });
    }
  }

  function stopWebcam(stream) {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      webcamStream = null;
    }
  }

  // ─── TAB NAVIGATION ─────────────────────────────────────────────────────
  document.querySelectorAll('.portal-layout').forEach(portal => {
    portal.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  });

  function switchTab(tabId) {
    activeTab = tabId;
    
    // Select correct portal (Employee or Manager)
    const portal = currentUser.role === 'admin' ? 'manager-portal' : 'employee-portal';
    const container = document.getElementById(portal);

    // Update active navigation class
    container.querySelectorAll('.nav-item').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update active tab-view class
    container.querySelectorAll('.tab-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = container.querySelector(`#view-${tabId}`);
    if (targetView) targetView.classList.add('active');

    // Handle tab-specific initializations
    if (tabId === 'emp-home') {
      loadEmployeeDashboard();
    } else if (tabId === 'emp-history') {
      loadEmployeeHistory();
    } else if (tabId === 'emp-analytics') {
      loadEmployeeAnalytics();
    } else if (tabId === 'emp-leaves') {
      loadLeavesTab();
    } else if (tabId === 'emp-profile') {
      loadEmployeeProfile();
    } else if (tabId === 'mgr-home') {
      loadManagerDashboard();
    } else if (tabId === 'mgr-boundaries') {
      loadManagerBoundaries();
    } else if (tabId === 'mgr-roster') {
      loadManagerRoster();
    } else if (tabId === 'mgr-logs') {
      loadManagerLogs();
    }
  }

  // ─── EMPLOYEE PORTAL TAB LOGIC ──────────────────────────────────────────

  // 1. Home Dashboard Setup
  async function loadEmployeeDashboard() {
    document.getElementById('emp-profile-name').textContent = currentUser.name;
    document.getElementById('emp-profile-id').textContent = currentUser.employeeId || '#EMP001';

    // Fetch Today's Attendance status from API
    try {
      const response = await fetch(`${API_BASE}/attendance/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      const kpiTime = document.getElementById('kpi-today-checkin');
      const kpiStatus = document.getElementById('kpi-today-status');
      const sumCheckIn = document.getElementById('today-checkin-time');
      const sumCheckOut = document.getElementById('today-checkout-time');
      const sumHours = document.getElementById('today-working-hours');

      if (data.success && data.data.attendance) {
        const att = data.data.attendance;
        isCheckedIn = true;
        
        const checkInFormatted = formatTimeString(att.checkInTime);
        kpiTime.textContent = checkInFormatted;
        sumCheckIn.textContent = checkInFormatted;

        if (att.checkOutTime) {
          isCheckedIn = false;
          const checkOutFormatted = formatTimeString(att.checkOutTime);
          kpiTime.textContent = 'Completed';
          kpiStatus.textContent = 'Shift Completed';
          sumCheckOut.textContent = checkOutFormatted;
          sumHours.textContent = `${att.workingHours || 0.0} hrs`;
        } else {
          kpiStatus.textContent = 'Checked In';
          sumCheckOut.textContent = '-- : --';
          sumHours.textContent = 'Active shift';
        }
      } else {
        isCheckedIn = false;
        kpiTime.textContent = '-- : --';
        kpiStatus.textContent = 'Not Checked In Yet';
        sumCheckIn.textContent = '-- : --';
        sumCheckOut.textContent = '-- : --';
        sumHours.textContent = '0.0 hrs';
      }
    } catch (err) {
      console.error(err);
    }

    // Load active geofence boundaries for selection dropdown
    loadBoundariesDropdown();

    // Fetch employee history summaries to compute attendance percentage
    try {
      const response = await fetch(`${API_BASE}/attendance/history/${currentUser._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data.summary) {
        document.getElementById('kpi-attendance-pct').textContent = data.data.summary.attendancePercentage || '0.0%';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Load locations list into check-in dropdown select
  async function loadBoundariesDropdown() {
    try {
      const response = await fetch(`${API_BASE}/admin/locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      const select = document.getElementById('attendance-location-select');
      select.innerHTML = '<option value="">-- Choose Office Location --</option>';

      if (data.success && data.data.locations) {
        activeLocations = data.data.locations;
        activeLocations.forEach(loc => {
          const option = document.createElement('option');
          option.value = loc._id;
          option.textContent = `${loc.locationName} (Radius: ${loc.radius}m)`;
          select.appendChild(option);
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle selected office boundary change (radar update)
  document.getElementById('attendance-location-select').addEventListener('change', (e) => {
    const locId = e.target.value;
    selectedLocation = activeLocations.find(l => l._id === locId) || null;

    // Reset verification states
    resetVerificationStages();

    if (selectedLocation) {
      // Setup initial map layout labels
      document.getElementById('stage-gps').querySelector('.subtitle').textContent = `Tracking geofence boundary coordinates for ${selectedLocation.locationName}`;
    }
  });

  function resetVerificationStages() {
    switchWorkflowStage('gps');
    
    // GPS reset
    document.getElementById('gps-distance-text').textContent = '-- m';
    document.getElementById('gps-coords-text').textContent = '-- , --';
    
    const banner = document.getElementById('gps-status-banner');
    banner.className = 'status-banner';
    banner.querySelector('.status-banner-icon').textContent = '🔄';
    banner.querySelector('strong').textContent = 'Pending Verification';
    banner.querySelector('p').textContent = 'Awaiting location trigger...';
    
    const map = document.getElementById('stage-gps').querySelector('.mock-map-view');
    map.className = 'mock-map-view';
    const userMarker = document.getElementById('map-user-marker');
    userMarker.className = 'marker marker-user animate-ping';
    
    // Webcam/Face reset
    document.getElementById('face-match-confidence').textContent = '0%';
    document.getElementById('face-confidence-fill').style.width = '0%';
    
    const fBanner = document.getElementById('face-status-banner');
    fBanner.className = 'status-banner';
    fBanner.querySelector('.status-banner-icon').textContent = '🔄';
    fBanner.querySelector('strong').textContent = 'Biometric Scanner Ready';
    fBanner.querySelector('p').textContent = 'Awaiting activation...';
  }

  // Stage 1: Verify GPS boundaries click
  document.getElementById('btn-verify-gps').addEventListener('click', () => {
    if (!selectedLocation) {
      alert('Please select an office location boundary first!');
      return;
    }

    const banner = document.getElementById('gps-status-banner');
    banner.className = 'status-banner verifying';
    banner.querySelector('.status-banner-icon').textContent = '🔄';
    banner.querySelector('strong').textContent = 'Reading Telemetry...';
    banner.querySelector('p').textContent = 'Requesting browser satellite coordinates...';

    const isSimulate = document.getElementById('gps-simulate-checkbox').checked;

    if (isSimulate) {
      // Force mock coordinates inside the selected location boundary
      userCoords.latitude = selectedLocation.latitude + (Math.random() * 0.0002 - 0.0001);
      userCoords.longitude = selectedLocation.longitude + (Math.random() * 0.0002 - 0.0001);
      setTimeout(() => {
        verifyGeofencingBounds();
      }, 800);
    } else {
      // Call HTML5 geolocation API for real coordinates
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
          userCoords.latitude = position.coords.latitude;
          userCoords.longitude = position.coords.longitude;
          verifyGeofencingBounds();
        }, err => {
          alert('GPS Access Denied or Timed Out. Please enable GPS permissions or check Simulation Mode.');
          banner.className = 'status-banner';
          banner.querySelector('.status-banner-icon').textContent = '🔄';
          banner.querySelector('strong').textContent = 'Verification Failed';
          banner.querySelector('p').textContent = 'Unable to fetch physical coordinates.';
        });
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    }
  });

  function verifyGeofencingBounds() {
    document.getElementById('gps-coords-text').textContent = `${userCoords.latitude.toFixed(4)}° N, ${userCoords.longitude.toFixed(4)}° E`;

    // Haversine formula to compute distance in meters
    const dist = calculateHaversine(
      userCoords.latitude, userCoords.longitude,
      selectedLocation.latitude, selectedLocation.longitude
    );

    document.getElementById('gps-distance-text').textContent = `${Math.round(dist)} m`;

    const banner = document.getElementById('gps-status-banner');
    const userMarker = document.getElementById('map-user-marker');
    const map = document.getElementById('stage-gps').querySelector('.mock-map-view');

    // Update map marker positions visually
    userMarker.classList.remove('outside');

    if (dist <= selectedLocation.radius) {
      // Within Geofence
      banner.className = 'status-banner verified';
      banner.querySelector('.status-banner-icon').textContent = '🟢';
      banner.querySelector('strong').textContent = 'Location Verified';
      banner.querySelector('p').textContent = `Coordinates verified within authorized range of ${selectedLocation.locationName}.`;
      
      map.classList.remove('state-rejected');

      // Proceed to Face Verification stage after 1.5 seconds
      setTimeout(() => {
        switchWorkflowStage('face');
        startWebcam('attendance-video-feed');
      }, 1500);
    } else {
      // Outside Geofence
      banner.className = 'status-banner rejected';
      banner.querySelector('.status-banner-icon').textContent = '❌';
      banner.querySelector('strong').textContent = 'Geofence Boundary Rejection';
      banner.querySelector('p').textContent = `Out of range: you are ${Math.round(dist)}m away. Allowed radius is ${selectedLocation.radius}m.`;
      
      map.classList.add('state-rejected');
      userMarker.classList.add('outside');
    }
  }

  // Calculate distance using Haversine formula
  function calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  }

  // Stage 2: Verify Face biometrics click
  document.getElementById('btn-verify-face').addEventListener('click', () => {
    const fBanner = document.getElementById('face-status-banner');
    fBanner.className = 'status-banner verifying';
    fBanner.querySelector('.status-banner-icon').textContent = '🔄';
    fBanner.querySelector('strong').textContent = 'Authenticating Biometrics...';
    fBanner.querySelector('p').textContent = 'Running facial coordinates extraction...';

    let confidence = 0;
    const interval = setInterval(() => {
      confidence += Math.floor(Math.random() * 20) + 15;
      if (confidence >= 95) {
        confidence = 98.6;
        clearInterval(interval);

        // Verification successful
        fBanner.className = 'status-banner verified';
        fBanner.querySelector('.status-banner-icon').textContent = '🟢';
        fBanner.querySelector('strong').textContent = 'Identity Approved';
        fBanner.querySelector('p').textContent = 'Facial landmarks match registered profile credentials.';

        // Capture verification photo
        const video = document.getElementById('attendance-video-feed');
        const canvas = document.createElement('canvas');
        if (video) {
          const context = canvas.getContext('2d');
          
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            canvas.width = 200;
            canvas.height = 200;
            context.fillStyle = '#ea580c'; // Brand primary color
            context.beginPath();
            context.arc(100, 100, 100, 0, 2 * Math.PI);
            context.fill();
            
            context.fillStyle = '#ffffff';
            context.font = 'bold 80px Inter';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            const initials = getInitials(currentUser.name);
            context.fillText(initials, 100, 100);
          } else {
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          
          try {
            const sumSelfie = document.getElementById('sum-captured-selfie');
            sumSelfie.src = canvas.toDataURL('image/jpeg');
            sumSelfie.style.display = 'block';
          } catch(e) {
            console.error('Check-in face capture failed', e);
          }
        }

        stopWebcam(webcamStream);

        // Go directly to final Log Confirmation stage
        setTimeout(() => {
          switchWorkflowStage('log');
          setupFinalLogScreen();
        }, 1500);
      }
      document.getElementById('face-match-confidence').textContent = `${confidence.toFixed(1)}%`;
      document.getElementById('face-confidence-fill').style.width = `${confidence}%`;
    }, 150);
  });

  function setupFinalLogScreen() {
    document.getElementById('sum-location-name').textContent = selectedLocation.locationName;
    document.getElementById('sum-time-stamp').textContent = formatTimeString(new Date());

    const inBtn = document.getElementById('btn-submit-checkin');
    const outBtn = document.getElementById('btn-submit-checkout');

    if (isCheckedIn) {
      inBtn.style.display = 'none';
      outBtn.style.display = 'block';
    } else {
      inBtn.style.display = 'block';
      outBtn.style.display = 'none';
    }
  }

  // Submit checkin trigger
  document.getElementById('btn-submit-checkin').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_BASE}/attendance/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          locationId: selectedLocation._id
        })
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        switchTab('emp-home');
      } else {
        alert(data.message || 'Checkin Failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error marking check-in.');
    }
  });

  // Submit checkout trigger
  document.getElementById('btn-submit-checkout').addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_BASE}/attendance/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: userCoords.latitude,
          longitude: userCoords.longitude
        })
      });
      const data = await response.json();

      if (data.success) {
        alert(data.message);
        switchTab('emp-home');
      } else {
        alert(data.message || 'Checkout Failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error marking check-out.');
    }
  });

  function switchWorkflowStage(stageName) {
    document.querySelectorAll('.verification-workflow-container .workflow-stage').forEach(el => el.classList.remove('active'));
    document.getElementById(`stage-${stageName}`).classList.add('active');
  }

  // 2. Attendance History Logs
  async function loadEmployeeHistory() {
    try {
      const response = await fetch(`${API_BASE}/attendance/history/${currentUser._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      const tbody = document.getElementById('emp-history-tbody');
      tbody.innerHTML = '';

      if (data.success && data.data.records && data.data.records.length > 0) {
        data.data.records.forEach(r => {
          const tr = document.createElement('tr');
          
          const inTime = r.checkInTime ? formatTimeString(r.checkInTime) : '-- : --';
          const outTime = r.checkOutTime ? formatTimeString(r.checkOutTime) : '-- : --';
          const hrs = r.workingHours ? `${r.workingHours.toFixed(1)}h` : '--';
          const office = r.locationId?.locationName || '--';
          
          let statusBadgeClass = 'badge-success';
          if (r.status === 'late') statusBadgeClass = 'badge-warning';
          if (r.status === 'half-day') statusBadgeClass = 'badge-info';
          if (r.status === 'absent') statusBadgeClass = 'badge-danger';

          tr.innerHTML = `
            <td><strong>${r.date}</strong></td>
            <td>${inTime}</td>
            <td>${outTime}</td>
            <td>${hrs}</td>
            <td>${office}</td>
            <td><span class="badge ${statusBadgeClass}">${r.status.toUpperCase()}</span></td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No attendance logs found.</td></tr>';
      }
    } catch (err) {
      console.error(err);
      document.getElementById('emp-history-tbody').innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading logs from backend.</td></tr>';
    }
  }

  // 3. Employee Analytics Page Setup
  async function loadEmployeeAnalytics() {
    try {
      const response = await fetch(`${API_BASE}/attendance/history/${currentUser._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.data.records) {
        const records = data.data.records;
        
        const presentCount = records.filter(r => r.status === 'present').length;
        const lateCount = records.filter(r => r.status === 'late').length;
        const halfCount = records.filter(r => r.status === 'half-day').length;

        document.getElementById('analytics-days-present').textContent = presentCount;
        document.getElementById('analytics-days-late').textContent = lateCount;
        document.getElementById('analytics-days-half').textContent = halfCount;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 4. Leave Application Form
  function loadLeavesTab() {
    // Reset leave reason inputs
    document.getElementById('leave-reason').value = '';
    document.getElementById('leave-start').value = '';
    document.getElementById('leave-end').value = '';
    document.getElementById('leave-halfday').checked = false;
    document.getElementById('halfday-session-box').style.display = 'none';
  }

  document.getElementById('leave-halfday').addEventListener('change', (e) => {
    const box = document.getElementById('halfday-session-box');
    box.style.display = e.target.checked ? 'block' : 'none';
  });

  document.getElementById('form-apply-leave').addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Leave Application submitted to manager successfully!');
    loadLeavesTab();
  });

  // 5. Change Password Form
  document.getElementById('form-change-password').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    try {
      const response = await fetch(`${API_BASE}/user/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();

      if (data.success) {
        alert('Password Changed successfully!');
        document.getElementById('form-change-password').reset();
      } else {
        alert(data.message || 'Password update failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating password.');
    }
  });

  function loadEmployeeProfile() {
    document.getElementById('profile-full-name').textContent = currentUser.name;
    document.getElementById('profile-email').textContent = currentUser.email;
    
    const avatarInitials = document.getElementById('profile-avatar-initials');
    if (currentUser.profileImage) {
      avatarInitials.innerHTML = `<img src="${currentUser.profileImage}" alt="Face" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      avatarInitials.innerHTML = `<span>${getInitials(currentUser.name)}</span>`;
    }
  }

  // ─── MANAGER PORTAL TAB LOGIC ───────────────────────────────────────────

  // 1. Dashboard Analytics Summary
  async function loadManagerDashboard() {
    try {
      const response = await fetch(`${API_BASE}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success && data.data) {
        const stats = data.data;
        document.getElementById('mgr-kpi-total-users').textContent = stats.totalUsers || 0;
        document.getElementById('mgr-kpi-total-locations').textContent = stats.totalLocations || 0;
        document.getElementById('mgr-kpi-today-logs').textContent = stats.todayAttendance || 0;

        // Breakdown stats
        let pCount = 0;
        let lCount = 0;
        let aCount = stats.totalUsers - stats.todayAttendance;

        stats.statusBreakdown.forEach(st => {
          if (st._id === 'present') pCount = st.count;
          if (st._id === 'late') lCount = st.count;
        });

        document.getElementById('mgr-stat-present').textContent = pCount;
        document.getElementById('mgr-stat-late').textContent = lCount;
        document.getElementById('mgr-stat-absent').textContent = Math.max(0, aCount);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 2. Boundaries Setup Page
  async function loadManagerBoundaries() {
    // Reset bound creation inputs
    document.getElementById('loc-name').value = '';
    document.getElementById('loc-lat').value = '';
    document.getElementById('loc-lng').value = '';
    document.getElementById('loc-radius').value = 150;
    document.getElementById('loc-desc').value = '';

    // Fetch existing bounds list from API
    try {
      const response = await fetch(`${API_BASE}/admin/locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      const tbody = document.getElementById('mgr-locations-tbody');
      tbody.innerHTML = '';

      if (data.success && data.data.locations && data.data.locations.length > 0) {
        data.data.locations.forEach(loc => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${loc.locationName}</strong></td>
            <td>${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</td>
            <td>${loc.radius}m</td>
            <td>
              <button class="btn btn-secondary btn-delete-loc" data-id="${loc._id}" style="padding: 4px 8px; font-size:11px; color:var(--danger); border-color:var(--danger-glow);">🗑 Delete</button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.btn-delete-loc').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const locId = btn.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this geofence boundary location?')) {
              try {
                const response = await fetch(`${API_BASE}/admin/location/${locId}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const delData = await response.json();
                if (delData.success) {
                  loadManagerBoundaries();
                } else {
                  alert(delData.message);
                }
              } catch (err) {
                console.error(err);
              }
            }
          });
        });

      } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No active boundaries configured.</td></tr>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Create Location Boundaries Submit handler
  document.getElementById('form-create-location').addEventListener('submit', async (e) => {
    e.preventDefault();
    const locationName = document.getElementById('loc-name').value;
    const latitude = parseFloat(document.getElementById('loc-lat').value);
    const longitude = parseFloat(document.getElementById('loc-lng').value);
    const radius = parseInt(document.getElementById('loc-radius').value);
    const description = document.getElementById('loc-desc').value;

    try {
      const response = await fetch(`${API_BASE}/admin/location/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ locationName, latitude, longitude, radius, description })
      });
      const data = await response.json();

      if (data.success) {
        alert('Geofence boundary location created successfully!');
        loadManagerBoundaries();
      } else {
        alert(data.message || 'Failed to create boundary.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating boundary location.');
    }
  });

  // 3. Employee Roster Management
  async function loadManagerRoster() {
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      const tbody = document.getElementById('mgr-roster-tbody');
      tbody.innerHTML = '';

      if (data.success && data.data.users && data.data.users.length > 0) {
        data.data.users.forEach(user => {
          const tr = document.createElement('tr');
          const initials = getInitials(user.name);
          const activeStatus = user.isActive ? 'badge-success' : 'badge-danger';
          const activeStatusLabel = user.isActive ? 'ACTIVE' : 'DEACTIVATED';
          
          tr.innerHTML = `
            <td><strong>#${user.employeeId || 'EMP'}</strong></td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:24px; height:24px; border-radius:50%; background-color:var(--primary-light); color:var(--primary); font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center;">${initials}</div>
                <span>${user.name}</span>
              </div>
            </td>
            <td>${user.email}</td>
            <td>${user.department || '--'}</td>
            <td>🟢 Verified (Face + Print)</td>
            <td><span class="badge ${activeStatus}">${activeStatusLabel}</span></td>
            <td>
              <button class="btn btn-secondary btn-toggle-user" data-id="${user._id}" style="padding: 4px 8px; font-size:11px;">
                ${user.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // Add toggle action
        document.querySelectorAll('.btn-toggle-user').forEach(btn => {
          btn.addEventListener('click', async () => {
            const userId = btn.getAttribute('data-id');
            try {
              const response = await fetch(`${API_BASE}/admin/users/${userId}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const toggleData = await response.json();
              if (toggleData.success) {
                loadManagerRoster();
              }
            } catch (err) {
              console.error(err);
            }
          });
        });

      } else {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No employees registered yet.</td></tr>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 4. Attendance Daily Logs List
  async function loadManagerLogs() {
    const dateInput = document.getElementById('mgr-logs-date-filter');
    if (!dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    fetchFilteredManagerLogs(dateInput.value);
  }

  document.getElementById('mgr-logs-date-filter').addEventListener('change', (e) => {
    fetchFilteredManagerLogs(e.target.value);
  });

  async function fetchFilteredManagerLogs(dateStr) {
    try {
      const response = await fetch(`${API_BASE}/admin/attendance/all?date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      const tbody = document.getElementById('mgr-logs-tbody');
      tbody.innerHTML = '';

      if (data.success && data.data.records && data.data.records.length > 0) {
        data.data.records.forEach(r => {
          const tr = document.createElement('tr');
          const checkIn = r.checkInTime ? formatTimeString(r.checkInTime) : '--';
          const checkOut = r.checkOutTime ? formatTimeString(r.checkOutTime) : '--';
          const hrs = r.workingHours ? `${r.workingHours.toFixed(1)}h` : '--';
          
          let badgeClass = 'badge-success';
          if (r.status === 'late') badgeClass = 'badge-warning';
          if (r.status === 'half-day') badgeClass = 'badge-info';
          if (r.status === 'absent') badgeClass = 'badge-danger';

          tr.innerHTML = `
            <td><strong>${r.date}</strong></td>
            <td>#${r.userId?.employeeId || 'EMP'}</td>
            <td>${r.userId?.name || 'Unknown'}</td>
            <td>${checkIn}</td>
            <td>${checkOut}</td>
            <td>${r.locationId?.locationName || '--'}</td>
            <td>${hrs}</td>
            <td><span class="badge ${badgeClass}">${r.status.toUpperCase()}</span></td>
          `;
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No attendance logs recorded for this date.</td></tr>';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Export Daily Logs
  document.getElementById('btn-export-logs').addEventListener('click', () => {
    const dateStr = document.getElementById('mgr-logs-date-filter').value;
    window.open(`${API_BASE}/admin/reports/export?format=xlsx&year=${dateStr.split('-')[0]}&month=${dateStr.split('-')[1]}`, '_blank');
  });

  // ─── HELPER UTILITIES ───────────────────────────────────────────────────
  function formatTimeString(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    let hrs = date.getHours();
    let mins = date.getMinutes();
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    mins = mins < 10 ? '0' + mins : mins;
    return `${hrs}:${mins} ${ampm}`;
  }

});
