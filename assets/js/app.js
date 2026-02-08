// Основная логика электронного дневника
document.addEventListener('DOMContentLoaded', async function() {
    let scheduleData = {};
    let currentWeekOffset = 0;
    let currentDay = 'monday';

    const teachers = {
        'Микрюкова А.С.': {
            subject: 'Математика',
            contact: 'mikryukova@example.com'
        },
        'Алиева А.А.': {
            subject: 'Программирование',
            contact: 'alieva@example.com'
        },
        'Сафина М.Х.': {
            subject: 'Базы данных',
            contact: 'safina@example.com'
        }
    };

    function loadSchedule() {
        const el = document.getElementById('schedule-json');
        const src = el ? el.getAttribute('src') : null;
        if (!src) {
            scheduleData = normalizeSchedule({});
            return Promise.resolve();
        }

        return fetch(src)
            .then(resp => resp.json())
            .then(data => {
                scheduleData = normalizeSchedule(data);
                const group = scheduleData.group || '-';
                const groupNameEl = document.getElementById('group-name');
                if (groupNameEl) groupNameEl.textContent = group;
            })
            .catch(e => {
                console.error('Ошибка загрузки JSON', e);
                scheduleData = normalizeSchedule({});
            });
    }

    function normalizeSchedule(data) {
        const result = { group: data.group || 'МД-25', weeks: { odd: {}, even: {} } };
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        days.forEach(day => {
            result.weeks.odd[day] = [];
            result.weeks.even[day] = [];
        });

        if (data.weeks && data.weeks.odd) {
            Object.keys(data.weeks.odd).forEach(day => {
                if (days.includes(day)) {
                    result.weeks.odd[day] = data.weeks.odd[day] || [];
                }
            });
        }

        if (data.weeks && data.weeks.even) {
            Object.keys(data.weeks.even).forEach(day => {
                if (days.includes(day)) {
                    const val = data.weeks.even[day];
                    if (typeof val === 'string' && val.startsWith('@same_as:')) {
                        const ref = val.substring(9);
                        const parts = ref.split('.');
                        if (parts[0] === 'odd' && parts[1]) {
                            result.weeks.even[day] = result.weeks.odd[parts[1]] || [];
                        }
                    } else {
                        result.weeks.even[day] = val || [];
                    }
                }
            });
        }

        return result;
    }

    function getWeekTypeByOffset(offset) {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        const weekNumber = Math.floor(diff / oneWeek);
        return ((weekNumber + offset) % 2 === 0) ? 'even' : 'odd';
    }

    function renderDaySchedule(day, weekType) {
        const display = document.getElementById('schedule-display');
        if (!display) return;

        const lessons = scheduleData.weeks[weekType][day] || [];
        
        if (lessons.length === 0) {
            display.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">В этот день занятий нет</p>';
            return;
        }

        let html = '';
        lessons.forEach(lesson => {
            html += `<div class="lesson-card">`;
            html += `  <div class="lesson-time">${lesson.time || ''}</div>`;
            html += `  <div class="lesson-subject">${lesson.subject || ''}</div>`;
            html += `  <div class="lesson-teacher">${lesson.teacher || ''}</div>`;
            html += `  <div class="lesson-room">${lesson.room || ''}</div>`;
            html += `</div>`;
        });
        display.innerHTML = html;
    }

    function updateWeekInfo() {
        const weekType = getWeekTypeByOffset(currentWeekOffset);
        const weekTypeEl = document.getElementById('week-type');
        if (weekTypeEl) {
            weekTypeEl.textContent = weekType === 'odd' ? 'Нечётная' : 'Чётная';
        }
        renderDaySchedule(currentDay, weekType);
    }

    function renderTeachers() {
        const list = document.getElementById('teachers-list');
        if (!list) return;

        let html = '';
        Object.keys(teachers).forEach(name => {
            const t = teachers[name];
            html += `<div class="teacher-card">`;
            html += `  <div class="teacher-name">${name}</div>`;
            html += `  <div class="teacher-subject">${t.subject}</div>`;
            html += `  <div class="teacher-contact">${t.contact}</div>`;
            html += `</div>`;
        });
        list.innerHTML = html;
    }

    // Инициализация вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const content = document.getElementById(tab + '-section');
            if (content) content.classList.add('active');
            
            if (tab === 'teachers') renderTeachers();
        });
    });

    // Навигация по дням
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDay = this.getAttribute('data-day');
            updateWeekInfo();
        });
    });

    // Навигация по неделям
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentWeekOffset--;
            updateWeekInfo();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentWeekOffset++;
            updateWeekInfo();
        });
    }

    // Загрузка и инициализация
    await loadSchedule();
    
    // Установка текущего дня
    const now = new Date();
    const dayIndex = now.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    currentDay = dayNames[dayIndex] || 'monday';
    
    const currentDayBtn = document.querySelector(`.day-btn[data-day="${currentDay}"]`);
    if (currentDayBtn) currentDayBtn.classList.add('active');
    
    updateWeekInfo();
});
