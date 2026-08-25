/* ========================================
   Task Dashboard – script.js
   Todo CRUD, filters, dark mode, weather
   ======================================== */

(function () {
  'use strict';

  // ── State ──────────────────────────────
  let tasks = JSON.parse(localStorage.getItem('taskr_tasks') || '[]');
  let currentFilter = 'all';

  // ── DOM Elements ───────────────────────
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const taskPriority = document.getElementById('task-priority');
  const taskList = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const btnClearCompleted = document.getElementById('btn-clear-completed');
  const themeToggle = document.getElementById('theme-toggle');
  const statTotal = document.getElementById('stat-total');
  const statActive = document.getElementById('stat-active');
  const statDone = document.getElementById('stat-done');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // ── Utilities ──────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatDate(date) {
    const d = new Date(date);
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${hours}:${mins}`;
  }

  function saveTasks() {
    localStorage.setItem('taskr_tasks', JSON.stringify(tasks));
  }

  // ── Theme ──────────────────────────────
  function getPreferredTheme() {
    const stored = localStorage.getItem('taskr_theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('taskr_theme', theme);
  }

  applyTheme(getPreferredTheme());

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ── Task Rendering ─────────────────────
  function getFilteredTasks() {
    if (currentFilter === 'active') return tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  }

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    statTotal.textContent = total;
    statActive.textContent = total - done;
    statDone.textContent = done;
  }

  function renderTasks() {
    const filtered = getFilteredTasks();
    taskList.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.classList.add('visible');
    } else {
      emptyState.classList.remove('visible');
    }

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.completed ? ' completed' : '');

      li.innerHTML = `
        <span class="priority-dot ${task.priority}" title="${task.priority} priority"></span>
        <button class="task-checkbox" data-id="${task.id}" aria-label="Toggle task">
          ${task.completed ? '✓' : ''}
        </button>
        <span class="task-text">${escapeHTML(task.text)}</span>
        <span class="task-meta">${formatDate(task.createdAt)}</span>
        <button class="task-delete" data-id="${task.id}" aria-label="Delete task" title="Delete task">✕</button>
      `;

      taskList.appendChild(li);
    });

    updateStats();
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Task CRUD ──────────────────────────
  function addTask(text, priority) {
    tasks.unshift({
      id: generateId(),
      text: text.trim(),
      priority: priority,
      completed: false,
      createdAt: new Date().toISOString()
    });
    saveTasks();
    renderTasks();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
    }
  }

  function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
  }

  function clearCompleted() {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderTasks();
  }

  // ── Event Listeners ────────────────────
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text) return;
    addTask(text, taskPriority.value);
    taskInput.value = '';
    taskInput.focus();
  });

  taskList.addEventListener('click', (e) => {
    const checkbox = e.target.closest('.task-checkbox');
    if (checkbox) {
      toggleTask(checkbox.dataset.id);
      return;
    }
    const deleteBtn = e.target.closest('.task-delete');
    if (deleteBtn) {
      deleteTask(deleteBtn.dataset.id);
    }
  });

  btnClearCompleted.addEventListener('click', clearCompleted);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // ── Weather Widget ─────────────────────
  const weatherIconMap = {
    'Clear': '☀️',
    'Sunny': '☀️',
    'Partly cloudy': '⛅',
    'Cloudy': '☁️',
    'Overcast': '☁️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Patchy rain possible': '🌦️',
    'Light rain': '🌧️',
    'Moderate rain': '🌧️',
    'Heavy rain': '⛈️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Light snow': '🌨️',
    'Blizzard': '❄️',
    'Drizzle': '🌦️',
    'Patchy light rain': '🌦️',
    'Light drizzle': '🌦️',
    'Moderate or heavy rain shower': '🌧️',
    'Torrential rain shower': '⛈️',
  };

  function getWeatherIcon(condition) {
    return weatherIconMap[condition] || '🌡️';
  }

  async function fetchWeather() {
    const loadingEl = document.getElementById('weather-loading');
    const contentEl = document.getElementById('weather-content');
    const errorEl = document.getElementById('weather-error');

    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';
    errorEl.style.display = 'none';

    try {
      // Using wttr.in free weather API (no key needed)
      const res = await fetch('https://wttr.in/?format=j1');
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();

      const current = data.current_condition[0];
      const area = data.nearest_area[0];

      const tempC = current.temp_C;
      const feelsLike = current.FeelsLikeC;
      const humidity = current.humidity;
      const windSpeed = current.windspeedKmph;
      const condition = current.weatherDesc[0].value;
      const city = area.areaName[0].value;
      const country = area.country[0].value;

      document.getElementById('weather-icon').textContent = getWeatherIcon(condition);
      document.getElementById('weather-temp').textContent = `${tempC}°C`;
      document.getElementById('weather-desc').textContent = `${condition} · Feels like ${feelsLike}°C`;
      document.getElementById('weather-humidity').textContent = `${humidity}%`;
      document.getElementById('weather-wind').textContent = `${windSpeed} km/h`;
      document.getElementById('weather-location').textContent = `📍 ${city}, ${country}`;

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
    } catch (err) {
      console.error('Weather error:', err);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
    }
  }

  document.getElementById('weather-retry').addEventListener('click', fetchWeather);

  // ── Init ───────────────────────────────
  renderTasks();
  fetchWeather();

  // Refresh weather every 10 minutes
  setInterval(fetchWeather, 10 * 60 * 1000);
})();
