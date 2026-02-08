document.addEventListener('DOMContentLoaded', function () {
    let currentDay = 1; // 1..6, 0
    let currentWeek = 'odd'; // 'odd' | 'even'
    let currentSemester = 1;
    let scheduleData = null;

    const daysMap = {
        1: 'monday', 2: 'tuesday', 3: 'wednesday',
        4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
    };

    const daysData = {
        1: { name: 'Понедельник', pairs: 0 },
        2: { name: 'Вторник', pairs: 0 },
        3: { name: 'Среда', pairs: 0 },
        4: { name: 'Четверг', pairs: 0 },
        5: { name: 'Пятница', pairs: 0 },
        6: { name: 'Суббота', pairs: 0 },
        0: { name: 'Воскресенье', pairs: 0 }
    };

    const teachers = {
        "Микрюкова С.М.": {
            id: "mikryukova-sm",
            fio: "Микрюкова Светлана Михайловна",
            email: "mikryukova@example.com",
            subjects: ["Средства исполнения"],
            photo: "teachers/mikryukova.jpg"
        },
        "Алиева И.И.": {
            id: "alieva-ii",
            fio: "Алиева Ирина Ивановна",
            email: "alieva@example.com",
            subjects: ["Русский язык", "Литература"],
            photo: "teachers/alieva.jpg"
        },
        "Лихачева О.А.": {
            id: "lixacheva-oa",
            fio: "Лихачева Ольга Александровна",
            email: "lixacheva@example.com",
            subjects: ["Обществознание"],
            photo: "teachers/lixacheva.jpg"
        },
        "Боброва Е.М.": {
            id: "bobrova-em",
            fio: "Боброва Елена Михайловна",
            email: "bobrova@example.com",
            subjects: ["История"],
            photo: "teachers/bobrova.jpg"
        },
        "Амбарова А.Г.": {
            id: "ambarova-ag",
            fio: "Амбарова Анна Геннадьевна",
            email: "ambarova@example.com",
            subjects: ["Дизайн-проектирование", "Типографика"],
            photo: "teachers/ambarova.jpg"
        },
        "Фролова В.А.": {
            id: "frolova-va",
            fio: "Фролова Виктория Алексеевна",
            email: "frolova@example.com",
            subjects: ["Рисунок"],
            photo: "teachers/frolova.jpg"
        },
        "Михайличенко Е.А.": {
            id: "mixaylichenko-ea",
            fio: "Михайличенко Елена Александровна",
            email: "mixaylichenko@example.com",
            subjects: ["Цветоведение"],
            photo: "teachers/mixaylichenko.jpg"
        },
        "Сироткина А.В.": {
            id: "sirotkina-av",
            fio: "Сироткина Анна Викторовна",
            email: "sirotkina@example.com",
            subjects: ["Живопись"],
            photo: "teachers/sirotkina.jpg"
        },
        "Николаева Е.В.": {
            id: "nikolaeva-ev",
            fio: "Николаева Елена Викторовна",
            email: "nikolaeva@example.com",
            subjects: ["Математика"],
            photo: "teachers/nikolaeva.jpg"
        },
        "Шляхов А.В.": {
            id: "shlyaxov-av",
            fio: "Шляхов Андрей Викторович",
            email: "shlyaxov@example.com",
            subjects: ["Информатика"],
            photo: "teachers/shlyaxov.jpg"
        },
        "Зоркова М.В.": {
            id: "zorkova-mv",
            fio: "Зоркова Марина Викторовна",
            email: "zorkova@example.com",
            subjects: ["Иностранный язык"],
            photo: "teachers/zorkova.jpg"
        }
    };

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
            const data = await resp.json();
            scheduleData = normalizeSchedule(data);
            
            const group = scheduleData.group || '-';
            const groupNameEl = document.getElementById('group-name');
            if (groupNameEl) groupNameEl.textContent = group;
        } catch (e) {
            console.error('Ошибка загрузки JSON', e);
            scheduleData = normalizeSchedule({});
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
                <div class="no-lessons">
                    <div class="no-lessons-icon">
                        <i class="fas fa-umbrella-beach"></i>
                    </div>
                    <h3>Занятий нет</h3>
                    <p>На этот день занятия не запланированы.</p>
                </div>
            `;
            return;
        }

        lessons.forEach((lesson, idx) => {
            const pairNumberClass = `pair-${idx % 6}`;
            const room = (lesson.room || '').toString();
            const isRemote = room.toLowerCase().includes('online') || 
                             room.toLowerCase().includes('дист') || 
                             room.toLowerCase().includes('zoom');
            
            const lessonCard = document.createElement('div');
            lessonCard.className = 'lesson-card' + (isRemote ? ' remote' : '');
            
            const teacher = (lesson.teacher || '').trim();
            const teacherProfile = teachers[teacher];
            const teacherHtml = teacherProfile ? 
                `<a href="#teacher-${teacherProfile.id}" class="teacher-link" style="color:#d32f2f;text-decoration:none;">${teacher}</a>` : 
                teacher;

            lessonCard.innerHTML = `
                <div class="lesson-header">
                    <span class="pair-number ${pairNumberClass}">
                        ${lesson.lesson != null ? lesson.lesson : idx + 1}
                    </span>
                    <span class="lesson-time">${lesson.time || ''}</span>
                </div>
                <div class="lesson-body">
                    <h3 class="lesson-title">${lesson.subject || '&nbsp;'}</h3>
                    <div class="lesson-details">
                        <div class="detail-item">
                            <i class="fas fa-user-tie"></i>
                            <span>${teacherHtml}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-door-open"></i>
                            <span>${room}</span>
                        </div>
                    </div>
                </div>
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

    function nextDay() { currentDay = (currentDay + 1) % 7; updateScheduleDisplay(); }
    function prevDay() { currentDay = (currentDay - 1 + 7) % 7; updateScheduleDisplay(); }

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
                <img class="teacher-photo" src="assets/img/${t.id}.jpg" onerror="this.src='https://via.placeholder.com/80?text=%3F'" alt="${t.fio}">
                <div class="teacher-info">
                    <h3>${t.fio}</h3>
                    <div class="teacher-subjects">${t.subjects.join(', ')}</div>
                    <div class="teacher-email">
                        <a href="mailto:${t.email}">${t.email}</a>
                    </div>
                </div>
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
        
        ['schedule', 'grades', 'teachers'].forEach(s => {
            const nav = document.getElementById(`${s}-nav`);
            if (nav) nav.addEventListener('click', (e) => { e.preventDefault(); showSection(s); });
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
        renderTeachers();
        
        const today = new Date().getDay();
        currentDay = today;
        
        await loadSchedule();
        updateScheduleDisplay();
        
        setInterval(updateDateTime, 60000);
    }

    init();
});
