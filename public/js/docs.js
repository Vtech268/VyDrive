/* ============================================
   VyDrive - API Docs JavaScript
   Copy buttons, tabs, sidebar, API tester
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ============================================
     1. COPY BUTTONS
     ============================================ */
  function initCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      if (btn.classList.contains('copy-tab-content') || btn.id === 'testerCopyBtn') return;

      btn.addEventListener('click', function () {
        var text = this.dataset.copy;
        if (!text) return;
        copyText(text, this);
      });
    });
  }

  function copyText(text, btn) {
    var original = btn.innerHTML;
    navigator.clipboard.writeText(text).then(function () {
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      btn.classList.add('copy-btn-success');
      setTimeout(function () {
        btn.innerHTML = original;
        btn.classList.remove('copy-btn-success');
      }, 2000);
    }).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      btn.classList.add('copy-btn-success');
      setTimeout(function () {
        btn.innerHTML = original;
        btn.classList.remove('copy-btn-success');
      }, 2000);
    });
  }

  initCopyButtons();

  /* ============================================
     2. CODE TABS (Language switcher)
     ============================================ */
  var tabBtns = document.querySelectorAll('.code-tab');
  var tabContents = document.querySelectorAll('.code-tab-content');

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = this.dataset.tab;
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      tabContents.forEach(function (c) { c.classList.remove('active'); });
      this.classList.add('active');
      var content = document.querySelector('[data-content="' + target + '"]');
      if (content) content.classList.add('active');
    });
  });

  // Tab copy button — copies the visible code block
  document.querySelectorAll('.copy-tab-content').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrapper = this.closest('.code-block-wrapper');
      var code = wrapper ? wrapper.querySelector('code') : null;
      if (code) copyText(code.textContent, this);
    });
  });

  /* ============================================
     3. MOBILE SIDEBAR TOGGLE
     ============================================ */
  var mobileToggle = document.getElementById('docsMobileToggle');
  var sidebar = document.getElementById('docsSidebar');

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', function () {
      var isOpen = sidebar.classList.toggle('docs-sidebar-open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
      mobileToggle.classList.toggle('active', isOpen);
    });

    // Close sidebar when a link is clicked on mobile
    sidebar.querySelectorAll('.docs-nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth < 1024) {
          sidebar.classList.remove('docs-sidebar-open');
          mobileToggle.classList.remove('active');
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  /* ============================================
     4. STICKY SIDEBAR SCROLL SPY
     ============================================ */
  var navLinks = document.querySelectorAll('.docs-nav-link[data-section]');
  var sections = [];

  navLinks.forEach(function (link) {
    var id = link.dataset.section;
    var el = document.getElementById(id);
    if (el) sections.push({ id: id, el: el, link: link });
  });

  function updateActiveNav() {
    var scrollY = window.scrollY + 120;
    var current = null;

    sections.forEach(function (s) {
      if (s.el.offsetTop <= scrollY) current = s;
    });

    navLinks.forEach(function (l) { l.classList.remove('active'); });
    if (current) current.link.classList.add('active');
  }

  if (sections.length > 0) {
    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();
  }

  /* ============================================
     5. SMOOTH SCROLL FOR NAV LINKS
     ============================================ */
  document.querySelectorAll('.docs-nav-link, a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var offset = 90;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ============================================
     6. API TESTER
     ============================================ */
  var testerMethod = document.getElementById('testerMethod');
  var testerApiKey = document.getElementById('testerApiKey');
  var testerBody = document.getElementById('testerBody');
  var testerBodyField = document.getElementById('testerBodyField');
  var testerSendBtn = document.getElementById('testerSendBtn');
  var testerResponse = document.getElementById('testerResponse');
  var testerResponseBody = document.getElementById('testerResponseBody');
  var testerStatusLabel = document.getElementById('testerStatusLabel');
  var testerTimeLabel = document.getElementById('testerTimeLabel');
  var testerCopyBtn = document.getElementById('testerCopyBtn');
  var testerFormatBtn = document.getElementById('testerFormatBtn');
  var baseUrlInput = document.querySelector('.tester-input-readonly');

  // Method labels
  var methodLabels = {
    'POST': { label: 'POST /insert', path: '/insert', showBody: true },
    'GET':  { label: 'GET /get',     path: '/get',    showBody: false },
    'PATCH':{ label: 'PATCH /update',path: '/update', showBody: true },
    'DELETE':{ label: 'DELETE /delete', path: '/delete', showBody: true }
  };

  // Default body templates
  var bodyTemplates = {
    POST:   '{\n  "data": {\n    "name": "John Doe",\n    "email": "john@example.com"\n  }\n}',
    PATCH:  '{\n  "id": "1234567890",\n  "data": {\n    "name": "John Updated"\n  }\n}',
    DELETE: '{\n  "id": "1234567890"\n}',
    GET:    ''
  };

  function updateTesterUI() {
    var m = testerMethod.value;
    var cfg = methodLabels[m];
    if (!cfg) return;

    // Show/hide body
    if (testerBodyField) {
      testerBodyField.style.display = cfg.showBody ? 'flex' : 'none';
    }

    // Pre-fill template if body is empty
    if (cfg.showBody && testerBody && !testerBody.value.trim()) {
      testerBody.value = bodyTemplates[m] || '';
    }
  }

  if (testerMethod) {
    testerMethod.addEventListener('change', updateTesterUI);
    updateTesterUI();
  }

  // Format JSON button
  if (testerFormatBtn && testerBody) {
    testerFormatBtn.addEventListener('click', function () {
      try {
        var parsed = JSON.parse(testerBody.value);
        testerBody.value = JSON.stringify(parsed, null, 2);
      } catch (e) {
        testerBody.style.borderColor = '#ef4444';
        setTimeout(function () { testerBody.style.borderColor = ''; }, 1000);
      }
    });
  }

  // Send request
  if (testerSendBtn) {
    testerSendBtn.addEventListener('click', function () {
      var method = testerMethod ? testerMethod.value : 'POST';
      var apiKey = testerApiKey ? testerApiKey.value.trim() : '';
      var baseUrl = baseUrlInput ? baseUrlInput.value.trim() : '';
      var cfg = methodLabels[method];
      var endpoint = baseUrl + cfg.path;

      if (!apiKey) {
        testerApiKey.style.borderColor = '#ef4444';
        testerApiKey.focus();
        setTimeout(function () { testerApiKey.style.borderColor = ''; }, 1500);
        return;
      }

      // Build request options
      var options = {
        method: method,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      };

      if (cfg.showBody && testerBody && testerBody.value.trim()) {
        try {
          JSON.parse(testerBody.value);
          options.body = testerBody.value.trim();
        } catch (e) {
          testerBody.style.borderColor = '#ef4444';
          setTimeout(function () { testerBody.style.borderColor = ''; }, 1500);
          return;
        }
      }

      // Loading state
      testerSendBtn.disabled = true;
      testerSendBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';
      if (testerResponse) testerResponse.style.display = 'none';

      var startTime = Date.now();

      fetch(endpoint, options)
        .then(function (res) {
          var elapsed = Date.now() - startTime;
          var status = res.status;
          return res.json().then(function (data) {
            showTesterResponse(data, status, elapsed);
          });
        })
        .catch(function (err) {
          var elapsed = Date.now() - startTime;
          showTesterResponse({ error: err.message || 'Network error' }, 0, elapsed);
        })
        .finally(function () {
          testerSendBtn.disabled = false;
          testerSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
        });
    });
  }

  function showTesterResponse(data, status, elapsed) {
    if (!testerResponse) return;
    testerResponse.style.display = 'block';

    var json = JSON.stringify(data, null, 2);
    testerResponseBody.textContent = json;

    // Status label
    if (testerStatusLabel) {
      var cls = status >= 200 && status < 300 ? 'status-200' : status >= 400 ? 'status-' + (status >= 500 ? '500' : '400') : '';
      testerStatusLabel.textContent = status ? status + ' ' + (statusText(status)) : 'Error';
      testerStatusLabel.className = 'tester-status-label status-badge ' + cls;
    }

    if (testerTimeLabel) {
      testerTimeLabel.textContent = elapsed + ' ms';
    }

    testerResponse.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function statusText(code) {
    var map = { 200: 'OK', 201: 'Created', 400: 'Bad Request', 401: 'Unauthorized', 404: 'Not Found', 500: 'Server Error' };
    return map[code] || '';
  }

  // Copy response
  if (testerCopyBtn && testerResponseBody) {
    testerCopyBtn.addEventListener('click', function () {
      copyText(testerResponseBody.textContent, this);
    });
  }

});
