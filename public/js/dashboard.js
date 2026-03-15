/* ============================================
   VyDrive Cloud - Dashboard JavaScript (Redesigned)
   Smooth sidebar, overlay, micro-interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add('active');
    if (backdrop) {
      backdrop.classList.add('active');
      backdrop.style.display = 'block';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('active');
    if (backdrop) {
      backdrop.classList.remove('active');
      setTimeout(function () {
        if (!backdrop.classList.contains('active')) {
          backdrop.style.display = 'none';
        }
      }, 300);
    }
    document.body.style.overflow = '';
  }

  function isMobile() {
    return window.innerWidth < 1024;
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      if (sidebar.classList.contains('active')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }

  // Close on resize to desktop
  window.addEventListener('resize', function () {
    if (!isMobile() && sidebar && sidebar.classList.contains('active')) {
      closeSidebar();
    }
  });

  // Close on ESC key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
      closeSidebar();
    }
  });

  // Global search debounce
  const globalSearch = document.getElementById('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('input', debounce(function () {
      const query = this.value.toLowerCase().trim();
      if (query.length < 2) return;
      // Search rows in any visible table
      const rows = document.querySelectorAll('.file-table tbody tr');
      rows.forEach(function (row) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
      // Search file cards
      const cards = document.querySelectorAll('.file-card');
      cards.forEach(function (card) {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
      });
    }, 250));

    // Clear search on empty
    globalSearch.addEventListener('input', function () {
      if (this.value === '') {
        document.querySelectorAll('.file-table tbody tr, .file-card').forEach(function (el) {
          el.style.display = '';
        });
      }
    });
  }

  // Docs navigation
  if (document.querySelector('.docs-sidebar')) {
    document.querySelectorAll('.docs-nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.docs-nav-link').forEach(function (l) {
          l.classList.remove('active');
        });
        this.classList.add('active');
        const targetId = this.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
          const offset = 90;
          const targetPosition = targetSection.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
      });
    });
  }
});

/* Debounce utility */
function debounce(fn, delay) {
  let timer;
  return function () {
    const ctx = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
  };
}
