(function () {
  const API_BASE =
    window.location.protocol === 'file:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4000'
      : window.location.origin;
  const API = `${API_BASE}/api/auth`;
  const REDIRECT_TO = 'dashboard.html';

  const TOKEN_KEY = 'rf_token';
  const REFRESH_KEY = 'rf_refreshToken';
  const USER_KEY = 'rf_user';

  let lastRegisteredEmail = '';
  let pendingVerification = {
    email: '',
    password: ''
  };

  function setSession(data) {
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  function toast(msg, type = 'info', duration = 4000) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;

    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      info: 'fa-circle-info'
    };

    const el = document.createElement('div');
    el.className = `toast-rf ${type}`;

    const icon = document.createElement('i');
    icon.className = `fa-solid ${icons[type] || icons.info}`;

    const text = document.createElement('span');
    text.textContent = msg;

    el.append(icon, text);
    stack.appendChild(el);

    setTimeout(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 320);
    }, duration);
  }

  function switchTab(tab) {
    document.getElementById('pane-login').classList.toggle('active', tab === 'login');
    document.getElementById('pane-register').classList.toggle('active', tab === 'register');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    clearErrors();
  }

  function togglePwd(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) icon.className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
  }

  function checkStrength(val) {
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;

    const segs = [
      document.getElementById('seg-1'),
      document.getElementById('seg-2'),
      document.getElementById('seg-3'),
      document.getElementById('seg-4')
    ];
    const label = document.getElementById('strength-label');
    const levels = ['filled-weak', 'filled-mid', 'filled-mid', 'filled-strong'];
    const texts = {
      0: '— escribe tu contraseña',
      1: 'DEBIL',
      2: 'MODERADA',
      3: 'BUENA',
      4: 'FUERTE'
    };
    const colors = {
      0: 'var(--text-ghost)',
      1: 'var(--ember)',
      2: 'var(--gold)',
      3: 'var(--gold)',
      4: 'var(--acid)'
    };

    segs.forEach((seg, index) => {
      if (!seg) return;
      seg.className = 'strength-seg';
      if (index < score) seg.classList.add(levels[index]);
    });

    if (label) {
      label.textContent = texts[score];
      label.style.color = colors[score];
    }
  }

  function showError(id, errId) {
    const field = document.getElementById(id);
    if (field) field.classList.add('is-error');
    const err = document.getElementById(errId);
    if (err) err.classList.add('visible');
  }

  function clearErrors() {
    document.querySelectorAll('.form-control-rf').forEach(input => input.classList.remove('is-error'));
    document.querySelectorAll('.field-error').forEach(err => err.classList.remove('visible'));
  }

  function setLoading(loaderId, btnEl, loading) {
    const loader = document.getElementById(loaderId);
    if (!btnEl || !loader) return;

    const arrow = btnEl.querySelector('.btn-arrow');
    const text = btnEl.querySelector('.btn-text');

    loader.style.display = loading ? 'block' : 'none';
    if (arrow) arrow.style.display = loading ? 'none' : 'inline';
    if (text) text.style.opacity = loading ? '0.5' : '1';
    btnEl.disabled = loading;
  }

  function getVerificationEmail() {
    return (
      pendingVerification.email ||
      document.getElementById('verify-email-display')?.textContent?.trim() ||
      ''
    );
  }

  function connectionErrorMessage(action) {
    return `No se pudo conectar con el servidor. Verifica que el backend este corriendo y que ${action} este disponible.`;
  }

  async function requestJson(path, options = {}) {
    const init = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    if (options.body && typeof options.body !== 'string') {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API}${path}`, init);
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { response, data };
  }

  async function doLogin() {
    clearErrors();

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;
    let valid = true;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('login-email', 'err-login-email');
      valid = false;
    }
    if (!pass) {
      showError('login-pass', 'err-login-pass');
      valid = false;
    }
    if (!valid) return;

    const btn = document.querySelector('#pane-login .btn-launch');
    setLoading('loader-login', btn, true);

    try {
      const { response, data } = await requestJson('/login', {
        method: 'POST',
        body: { email, password: pass }
      });

      if (!response.ok) {
        toast(data?.debug || data?.message || 'Credenciales incorrectas.', 'error');
        if (response.status === 401) showError('login-pass', 'err-login-pass');
        if (response.status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
          toast('Tu cuenta aun no esta verificada.', 'error');
        }
        return;
      }

      setSession(data);
      toast(`Bienvenido, ${data.user?.username || 'usuario'}. Redirigiendo...`, 'success');

      setTimeout(() => {
        window.location.href = REDIRECT_TO;
      }, 900);
    } catch (err) {
      console.error('[RootFinder] Login error:', err);
      toast(connectionErrorMessage('el login'), 'error');
    } finally {
      setLoading('loader-login', btn, false);
    }
  }

  async function doRegister() {
    clearErrors();

    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value;
    const confirm = document.getElementById('reg-confirm').value;
    const terms = document.getElementById('reg-terms').checked;
    let valid = true;

    if (!username || username.length < 3 || /\s/.test(username)) {
      showError('reg-username', 'err-reg-username');
      valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('reg-email', 'err-reg-email');
      valid = false;
    }
    if (!pass || pass.length < 8) {
      showError('reg-pass', 'err-reg-pass');
      valid = false;
    }
    if (pass !== confirm) {
      showError('reg-confirm', 'err-reg-confirm');
      valid = false;
    }
    if (!terms) {
      toast('Debes aceptar los terminos de uso para continuar.', 'error');
      valid = false;
    }
    if (!valid) return;

    const btn = document.querySelector('#pane-register .btn-launch');
    setLoading('loader-register', btn, true);

    try {
      const { response, data } = await requestJson('/register', {
        method: 'POST',
        body: { username, email, password: pass }
      });

      if (!response.ok) {
        toast(data?.debug || data?.message || 'Error al crear la cuenta.', 'error');
        if (response.status === 409) showError('reg-email', 'err-reg-email');
        return;
      }

      lastRegisteredEmail = email;
      pendingVerification = { email, password: pass };
      document.getElementById('verify-email-display').textContent = email;
      const codeInput = document.getElementById('verify-code');
      if (codeInput) codeInput.value = '';
      document.getElementById('register-form-view').style.display = 'none';
      document.getElementById('verify-screen').style.display = 'block';
      if (codeInput) setTimeout(() => codeInput.focus(), 0);
      toast('Cuenta creada. Revisa tu correo para verificarla.', 'success');
    } catch (err) {
      console.error('[RootFinder] Register error:', err);
      toast(connectionErrorMessage('el registro'), 'error');
    } finally {
      setLoading('loader-register', btn, false);
    }
  }

  async function verifyEmailCode() {
    clearErrors();

    const email = getVerificationEmail();
    const codeInput = document.getElementById('verify-code');
    const code = codeInput?.value.trim();

    if (!email) {
      toast('No se encontro el correo para verificar.', 'error');
      return;
    }

    if (!code || code.length < 6) {
      toast('Ingresa el codigo de verificacion completo.', 'error');
      if (codeInput) codeInput.focus();
      return;
    }

    const btn = document.querySelector('#verify-screen .btn-launch');
    setLoading('loader-verify', btn, true);

    try {
      const { response, data } = await requestJson('/verify-email', {
        method: 'POST',
        body: { email, code }
      });

      if (!response.ok) {
        toast(data?.debug || data?.message || 'No se pudo verificar la cuenta.', 'error');
        if (codeInput) codeInput.focus();
        return;
      }

      toast('Cuenta verificada correctamente. Entrando...', 'success');

      if (pendingVerification.password) {
        const loginResult = await requestJson('/login', {
          method: 'POST',
          body: { email, password: pendingVerification.password }
        });

        if (loginResult.response.ok) {
          setSession(loginResult.data);
          pendingVerification = { email: '', password: '' };
          lastRegisteredEmail = '';
          setTimeout(() => {
            window.location.href = REDIRECT_TO;
          }, 900);
          return;
        }

        toast(loginResult.data?.message || 'La cuenta ya se verifico. Ahora puedes iniciar sesion.', 'info');
      }

      pendingVerification = { email: '', password: '' };
      lastRegisteredEmail = '';
      document.getElementById('verify-screen').style.display = 'none';
      document.getElementById('register-form-view').style.display = 'block';
      switchTab('login');
    } catch (err) {
      console.error('[RootFinder] Verification error:', err);
      toast(connectionErrorMessage('la verificacion de correo'), 'error');
    } finally {
      setLoading('loader-verify', btn, false);
    }
  }

  async function resendVerification() {
    const email = getVerificationEmail() || lastRegisteredEmail;

    if (!email) {
      toast('No se encontro el correo. Intenta registrarte de nuevo.', 'error');
      return;
    }

    try {
      const { response, data } = await requestJson('/resend-verification', {
        method: 'POST',
        body: { email }
      });

      if (!response.ok) {
        toast(data?.debug || data?.message || 'No se pudo reenviar el correo.', 'error');
        return;
      }

      toast('Correo de verificacion reenviado.', 'success');
    } catch (err) {
      toast(connectionErrorMessage('el reenvio del correo'), 'error');
    }
  }

  async function showForgot() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('login-email', 'err-login-email');
      toast('Ingresa un correo valido primero.', 'error');
      return;
    }

    try {
      const { response, data } = await requestJson('/forgot-password', {
        method: 'POST',
        body: { email }
      });

      if (!response.ok) {
        toast(data?.debug || data?.message || 'No se pudo procesar la solicitud.', 'error');
        return;
      }

      toast(data?.message || 'Si ese correo esta registrado, recibiras instrucciones de recuperacion.', 'info');
    } catch (err) {
      toast(connectionErrorMessage('la recuperacion de contrasena'), 'error');
    }
  }

  function initPage() {
    const verified = new URLSearchParams(window.location.search).get('verified');
    if (verified === 'true') {
      toast('Tu correo fue verificado correctamente.', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (localStorage.getItem(TOKEN_KEY) && localStorage.getItem(USER_KEY)) {
      window.location.href = REDIRECT_TO;
      return;
    }

    const verifyScreen = document.getElementById('verify-screen');
    const registerView = document.getElementById('register-form-view');
    if (verifyScreen && registerView) {
      verifyScreen.style.display = 'none';
      registerView.style.display = 'block';
    }

    switchTab('login');
  }

  document.addEventListener('DOMContentLoaded', initPage);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;

    const activePane = document.querySelector('.form-pane.active');
    if (!activePane) return;

    if (activePane.id === 'pane-login') {
      doLogin();
      return;
    }

    if (
      activePane.id === 'pane-register' &&
      document.getElementById('register-form-view').style.display !== 'none'
    ) {
      doRegister();
      return;
    }

    if (
      activePane.id === 'pane-register' &&
      document.getElementById('register-form-view').style.display === 'none'
    ) {
      verifyEmailCode();
    }
  });

  window.toast = toast;
  window.switchTab = switchTab;
  window.togglePwd = togglePwd;
  window.checkStrength = checkStrength;
  window.showError = showError;
  window.clearErrors = clearErrors;
  window.setLoading = setLoading;
  window.doLogin = doLogin;
  window.doRegister = doRegister;
  window.verifyEmailCode = verifyEmailCode;
  window.resendVerification = resendVerification;
  window.showForgot = showForgot;
})();
