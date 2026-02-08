document.addEventListener('DOMContentLoaded', function () {
    let currentDay = 1; // 1..6, 0
    let currentWeek = 'odd'; // 'odd' | 'even'
    let currentSemester = 1;
    let scheduleData = null;

    // Data loaded from JSON files
    let daysMap = null;
    let daysData = null;
    let teachers = null;

        let currentLang = 'ru'; // default language
    let langData = null; // language translations
    // Load configuration data
    async function loadConfig() {
        try {
            const resp = await fetch('assets/data/daysMap.json?v=' + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            daysMap = await resp.json();
        } catch (e) {
            console.error('Error loading daysMap.json', e);
            // Fallback
            daysMap = {
                1: 'monday', 2: 'tuesday', 3: 'wednesday',
                4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
            };
        }

        try {
            const resp = await fetch('assets/data/daysData.json?v=' + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const dataArray = await resp.json();
            // Convert array to object with keys 1-7 and 0
            daysData = {};
            dataArray.forEach((day, idx) => {
                daysData[idx + 1] = day;
            });
            // Move last to 0 (Sunday)
            daysData[0] = daysData[7];
            delete daysData[7];
        } catch (e) {
            console.error('Error loading daysData.json', e);
            // Fallback
            daysData = {
                1: { name: 'Понедельник', pairs: 0 },
                2: { name: 'Вторник', pairs: 0 },
                3: { name: 'Среда', pairs: 0 },
                4: { name: 'Четверг', pairs: 0 },
                5: { name: 'Пятница', pairs: 0 },
                6: { name: 'Суббота', pairs: 0 },
                0: { name: 'Воскресенье', pairs: 0 }
            };
        }
    }

    // Load teachers data
    async function loadTeachers() {
        try {
            const resp = await fetch('assets/data/teachers.json?v=' + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            teachers = await resp.json();
        } catch (e) {
            console.error('Error loading teachers.json', e);
            teachers = {};
        }
    }

        // Load language data
    async function loadLanguage(lang) {
        try {
            const resp = await fetch(`assets/data/${lang}_lang.json?v=` + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            langData = await resp.json();
            applyTranslations();
        } catch (e) {
            console.error(`Error loading ${lang}_lang.json`, e);
            if (lang !== 'ru') {
                // Fallback to Russian if English fails
                await loadLanguage('ru');
            }
        }
    }

    // Apply translations to all elements with data-i18n attribute
    function applyTranslations() {
        if (!langData) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (langData[key]) {
                el.textContent = langData[key];
            }
        });
        // Update week status separately as it's dynamic
        updateWeekStatus();
    }

    // Update week status based on current week
    function updateWeekStatus() {
        const statusEl = document.getElementById('week-status');
        if (statusEl && langData) {
            const key = currentWeek === 'odd' ? 'odd_week_status' : 'even_week_status';
            statusEl.textContent = langData[key] || statusEl.textContent;
        }
    }

    // Switch language
    function switchLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('preferredLang', lang);
        loadLanguage(lang);
        // Update button states
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    

    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const dateEl = document.getElementById('current-date');
        if (dateEl) dateEl.textContent = now.toLocaleDateString('ru-RU', options);
        const timeEl = document.getElementById('update-time');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    function normalizeSchedule(data) {
        const res = JSON.parse(JSON.stringify(data || {}));
        res.weeks = res.weeks || {};
        const odd = res.weeks.odd || {};
        const even = res.weeks.even || {};
        for (const [day, value] of Object.entries(even)) {
            if (typeof value === 'string' && value.startsWith('@same_as:odd.')) {
                const srcDay = value.split('@same_as:odd.')[1];
                even[day] = odd[srcDay] ? JSON.parse(JSON.stringify(odd[srcDay])) : [];
            } else if (!Array.isArray(value)) {
                even[day] = [];
            }
        }
        res.weeks.odd = odd;
        res.weeks.even = even;
        if (!odd.sunday) odd.sunday = [];
        if (!even.sunday) even.sunday = [];
        return res;
    }

    async function loadSchedule() {
        try {
            const resp = await fetch('assets/data/schedule-md25.json?v=' + Date.now());
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            scheduleData = normalizeSchedule(data);
            const group = scheduleData.group || '-';
            const groupNameEl = document.getElementById('group-name');
            if (groupNameEl) groupNameEl.textContent = group;
        } catch (e) {
            console.error('Ошибка загрузки JSON', e);
            // Try to load from embedded script tag as fallback
            const scriptEl = document.getElementById('schedule-json');
            if (scriptEl && scriptEl.textContent) {
                try {
                    const embeddedData = JSON.parse(scriptEl.textContent);
                    scheduleData = normalizeSchedule(embeddedData);
                    const group = scheduleData.group || '-';
                    const groupNameEl = document.getElementById('group-name');
                    if (groupNameEl) groupNameEl.textContent = group;
                } catch (parseErr) {
                    console.error('Failed to parse embedded JSON', parseErr);
                    scheduleData = normalizeSchedule({});
                }
            } else {
                scheduleData = normalizeSchedule({});
            }
        }
    }

    function renderDaySchedule(dayIndex) {
        const dayKey = daysMap[dayIndex];
        const container = document.getElementById(`day-${dayIndex}`);
        if (!container) return;
        container.innerHTML = '';
        if (!scheduleData) return;
        const weekBlock = scheduleData.weeks[currentWeek] || {};
        const lessons = weekBlock[dayKey] || [];
        if (!lessons.length) {
            container.innerHTML = `
                <div class="empty-day">
                    <h3>Занятий нет</h3>
                    <p>На этот день занятия не запланированы.</p>
                </div>
            `;
            return;
        }
        lessons.forEach((lesson, idx) => {
            const pairNumberClass = `pair-${idx % 6}`;
            const room = (lesson.room || '').toString();
            const isRemote = room.toLowerCase().includes('online') || room.toLowerCase().includes('дист') || room.toLowerCase().includes('zoom');
            const lessonCard = document.createElement('div');
            lessonCard.className = 'lesson-card' + (isRemote ? ' remote' : '');
            const teacher = (lesson.teacher || '').trim();
            const teacherProfile = teachers[teacher];
            const teacherHtml = teacherProfile ? `<a href="#teacher-${teacherProfile.id}" class="teacher-link">${teacher}</a>` : teacher;
            lessonCard.innerHTML = `
                <div class="pair-number ${pairNumberClass}">
                    ${lesson.lesson != null ? lesson.lesson : idx + 1}
                </div>
                <div class="lesson-time">${lesson.time || ''}</div>
                <h3 class="lesson-subject">${lesson.subject || ' '}</h3>
                <div class="lesson-teacher">${teacherHtml}</div>
                <div class="lesson-room">${room}</div>
            `;
            container.appendChild(lessonCard);
        });
    }

    function updatePairsCount() {
        if (!scheduleData) return;
        const dayKey = daysMap[currentDay];
        const weekBlock = scheduleData.weeks[currentWeek] || {};
        const lessons = weekBlock[dayKey] || [];
        daysData[currentDay].pairs = lessons.length;
    }

    function updateVisibleDayButtons() {
        const buttons = document.querySelectorAll('.day-btn');
        const isNarrow = window.matchMedia('(max-width: 768px)').matches;
        buttons.forEach(btn => {
            if (!isNarrow) {
                btn.style.display = '';
                return;
            }
            const day = parseInt(btn.dataset.day, 10);
            const prevDay = (currentDay - 1 + 7) % 7;
            const nextDay = (currentDay + 1) % 7;
            btn.style.display = (day === currentDay || day === prevDay || day === nextDay) ? '' : 'none';
        });
    }

    function updateScheduleDisplay() {
        updatePairsCount();
        const dayData = daysData[currentDay];
        const nameEl = document.getElementById('current-day-name');
        if (nameEl) nameEl.textContent = dayData.name;
        const countEl = document.getElementById('pair-count');
        if (countEl) countEl.textContent = dayData.pairs;
        const statusEl = document.getElementById('week-status');
        if (statusEl) statusEl.textContent = currentWeek === 'odd' ? 'Нечетная неделя' : 'Четная неделя';
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.day) === currentDay);
        });
        updateVisibleDayButtons();
        document.querySelectorAll('.day-schedule').forEach(day => day.classList.remove('active'));
        const currentDayContainer = document.getElementById(`day-${currentDay}`);
        if (currentDayContainer) {
            currentDayContainer.classList.add('active');
            renderDaySchedule(currentDay);
        }
    }

    function nextDay() {
        currentDay = (currentDay + 1) % 7;
        updateScheduleDisplay();
    }

    function prevDay() {
        currentDay = (currentDay - 1 + 7) % 7;
        updateScheduleDisplay();
    }

    function toggleWeek(weekType) {
        currentWeek = weekType;
        document.getElementById('odd-week-btn').classList.toggle('active', weekType === 'odd');
        document.getElementById('even-week-btn').classList.toggle('active', weekType === 'even');
        updateScheduleDisplay();
    }

    function showSection(section) {
        const sections = ['schedule', 'grades', 'teachers'];
        sections.forEach(s => {
            const el = document.getElementById(`${s}-section`);
            const nav = document.getElementById(`${s}-nav`);
            if (el) el.style.display = (s === section) ? 'block' : 'none';
            if (nav) nav.classList.toggle('active', s === section);
        });
    }

    function renderTeachers() {
        const container = document.getElementById('teachers-container');
        if (!container) return;
        container.innerHTML = '';
        Object.values(teachers).forEach(t => {
            const card = document.createElement('div');
            card.className = 'teacher-card';
            card.id = `teacher-${t.id}`;
            card.innerHTML = `
                <img src="${t.photo}" alt="${t.fio}" onerror="this.src='assets/images/default-teacher.jpg'">
                <h3>${t.fio}</h3>
                <p class="teacher-subjects">${t.subjects.join(', ')}</p>
                <a href="mailto:${t.email}" class="teacher-email">${t.email}</a>
            `;
            container.appendChild(card);
        });
    }

    function setupEventListeners() {
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                currentDay = parseInt(this.dataset.day, 10);
                updateScheduleDisplay();
            });
        });
        document.getElementById('prev-day').addEventListener('click', prevDay);
        document.getElementById('next-day').addEventListener('click', nextDay);
        document.getElementById('odd-week-btn').addEventListener('click', () => toggleWeek('odd'));
        document.getElementById('even-week-btn').addEventListener('click', () => toggleWeek('even'));
        
        // Language toggle buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const lang = this.dataset.lang;
                switchLanguage(lang);
            });
        });
        ['schedule', 'grades', 'teachers'].forEach(s => {
            const nav = document.getElementById(`${s}-nav`);
            if (nav) nav.addEventListener('click', (e) => {
                e.preventDefault();
                showSection(s);
            });
        });
        document.getElementById('semester-1-btn').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('semester-2-btn').classList.remove('active');
            document.getElementById('semester-1-table').classList.add('active');
            document.getElementById('semester-2-table').classList.remove('active');
        });
        document.getElementById('semester-2-btn').addEventListener('click', function() {
            this.classList.add('active');
            document.getElementById('semester-1-btn').classList.remove('active');
            document.getElementById('semester-2-table').classList.add('active');
            document.getElementById('semester-1-table').classList.remove('active');
        });
        document.addEventListener('click', function (e) {
            const link = e.target.closest('.teacher-link');
            if (!link) return;
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            showSection('teachers');
            setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        });
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                'ArrowLeft': prevDay, 'ArrowRight': nextDay,
                'o': () => toggleWeek('odd'), 'O': () => toggleWeek('odd'),
                'e': () => toggleWeek('even'), 'E': () => toggleWeek('even'),
                '1': () => showSection('schedule'), '2': () => showSection('grades'), '3': () => showSection('teachers')
            };
            if (keyMap[e.key]) { keyMap[e.key](); e.preventDefault(); }
        });
        window.addEventListener('resize', updateVisibleDayButtons);
    }

    async function init() {
        updateDateTime();
        setupEventListeners();
        
        // Load all configuration data
        await loadConfig();
        await loadTeachers();
        
        // Load language (check localStorage for saved preference)
        const savedLang = localStorage.getItem('preferredLang') || 'ru';
        currentLang = savedLang;
        await loadLanguage(currentLang);
        
        renderTeachers();

        const today = new Date().getDay();
        currentDay = today;

        await loadSchedule();
        updateScheduleDisplay();

        setInterval(updateDateTime, 60000);
    }

    init();
});
