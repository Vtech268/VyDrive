/* ============================================
   VyDrive Cloud - Main JavaScript (Redesigned)
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  /* ---- Mobile Nav Toggle ---- */
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      mainNav.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!menuToggle.contains(e.target) && !mainNav.contains(e.target)) {
        mainNav.classList.remove('active');
        menuToggle.classList.remove('active');
      }
    });

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        mainNav.classList.remove('active');
        menuToggle.classList.remove('active');
      }
    });
  }

  /* ---- Password Toggle ---- */
  document.querySelectorAll('.btn-toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = this.dataset.target;
      var input = document.getElementById(targetId);
      var icon = this.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  });

  /* ---- Toast Notifications ---- */
  window.showToast = function (message, type) {
    type = type || 'success';
    var container = document.getElementById('toast-container');
    if (!container) return;

    var icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    var icon = icons[type] || 'check-circle';

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML =
      '<i class="fas fa-' + icon + '"></i>' +
      '<span>' + message + '</span>';

    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(110%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function () { toast.remove(); }, 320);
    }, 3200);
  };

  /* ---- Smooth Scroll for Anchor Links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- Active Docs Nav on Scroll ---- */
  var sections = document.querySelectorAll('section[id]');
  if (sections.length > 0) {
    window.addEventListener('scroll', function () {
      var current = '';
      sections.forEach(function (section) {
        if (window.scrollY >= section.offsetTop - 200) {
          current = section.getAttribute('id');
        }
      });
      document.querySelectorAll('.docs-nav-link').forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    });
  }
});

/* ---- Copy to Clipboard ---- */
window.copyToClipboard = function (text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function () {
      window.showToast && showToast('Disalin ke clipboard!', 'success');
    }).catch(function () {
      window.showToast && showToast('Gagal menyalin', 'error');
    });
  } else {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      window.showToast && showToast('Disalin ke clipboard!', 'success');
    } catch (err) {
      window.showToast && showToast('Gagal menyalin', 'error');
    }
    document.body.removeChild(textarea);
  }
};

/* ---- Format Bytes ---- */
window.formatBytes = function (bytes, decimals) {
  decimals = decimals == null ? 2 : decimals;
  if (bytes === 0) return '0 Bytes';
  var k = 1024;
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/* ---- Debounce ---- */
window.debounce = function (func, wait) {
  var timeout;
  return function () {
    var ctx = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () { func.apply(ctx, args); }, wait);
  };
};
