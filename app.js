const storageKey = 'family-organizer-data';

const defaultData = {
  tasks: [
    { id: crypto.randomUUID(), title: 'Wocheneinkauf planen', due: '', member: 'Allgemein', priority: 'Normal', done: false },
    { id: crypto.randomUUID(), title: 'Kindergeburtstag organisieren', due: '', member: 'Offen', priority: 'Dringend', done: false }
  ],
  shopping: [
    { id: crypto.randomUUID(), item: 'Milch', qty: '2 Liter', category: 'Lebensmittel', done: false },
    { id: crypto.randomUUID(), item: 'Toilettenpapier', qty: '6 Rollen', category: 'Haushalt', done: false }
  ],
  events: [
    { id: crypto.randomUUID(), title: 'Arzttermin', date: '', time: '', location: 'Hausarzt', done: false },
  ],
  notes: [
    { id: crypto.randomUUID(), title: 'Wochenplan', text: 'Montag: Sport, Dienstag: Musikschule, Freitag: Kinoabend' }
  ],
  contacts: [
    { id: crypto.randomUUID(), name: 'Oma', phone: '01234 567890', note: 'Notfallkontakt' }
  ]
};

const state = JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultData;

const panels = document.querySelectorAll('.panel');
const navButtons = document.querySelectorAll('.nav-button');
const summaryTasks = document.getElementById('summary-tasks');
const summaryShopping = document.getElementById('summary-shopping');
const summaryEvents = document.getElementById('summary-events');
const summaryNotes = document.getElementById('summary-notes');
const recentActivity = document.getElementById('recent-activity');

const shoppingForm = document.getElementById('shopping-form');
const eventForm = document.getElementById('event-form');
const noteForm = document.getElementById('note-form');
const contactForm = document.getElementById('contact-form');

const taskBoard = document.getElementById('task-board');
const taskColumns = document.querySelectorAll('.instance-column');
const addTaskButtons = document.querySelectorAll('.column-add-button');
const inlineTaskForms = document.querySelectorAll('.inline-task-form');
const showCompletedCheckbox = document.getElementById('show-completed-toggle');
const shoppingList = document.getElementById('shopping-list');
const eventList = document.getElementById('event-list');
const noteList = document.getElementById('note-list');
const contactList = document.getElementById('contact-list');

const taskMembers = ['Kristin', 'Tim', 'Charlotte', 'Moritz', 'Allgemein', 'Offen'];
const completedToggleKey = 'family-organizer-showCompletedTasks';
let showCompletedTasks = JSON.parse(localStorage.getItem(completedToggleKey) || 'false');

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function cleanupCompletedTasks() {
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const previousLength = state.tasks.length;
  state.tasks = state.tasks.filter(task => {
    if (!task.done) return true;
    if (!task.completedAt) return true;
    return now - new Date(task.completedAt).getTime() <= threeDaysMs;
  });
  if (state.tasks.length !== previousLength) {
    saveState();
  }
}

function switchPanel(panelId) {
  panels.forEach(panel => panel.classList.toggle('active', panel.id === panelId));
  navButtons.forEach(button => button.classList.toggle('active', button.dataset.panel === panelId));
}

function createItemCard(item, type) {
  const li = document.createElement('li');
  li.className = 'item-card';
  li.dataset.id = item.id;

  const title = document.createElement('h4');
  title.textContent = item.title || item.item || item.name;
  if (item.done) title.classList.add('completed');
  li.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'item-meta';

  if (type === 'tasks') {
    meta.innerHTML = `<div>Fällig: ${item.due || 'keine Angabe'}</div>`;
  }
  if (type === 'shopping') {
    meta.innerHTML = `<div>Menge: ${item.qty || 'keine Angabe'}</div><div>Kategorie: ${item.category || 'keine Angabe'}</div>`;
  }
  if (type === 'events') {
    meta.innerHTML = `<div>Datum: ${item.date}</div><div>Zeit: ${item.time || 'keine Angabe'}</div><div>Ort: ${item.location || 'keine Angabe'}</div>`;
  }
  if (type === 'notes') {
    const text = document.createElement('p');
    text.textContent = item.text;
    li.appendChild(text);
  }
  if (type === 'contacts') {
    meta.innerHTML = `<div>Telefon: ${item.phone || 'keine Angabe'}</div><div>Bemerkung: ${item.note || 'keine'}</div>`;
  }

  li.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const deleteButton = document.createElement('button');
  deleteButton.innerHTML = '🗑️';
  deleteButton.className = 'delete';
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', 'Löschen');
  deleteButton.addEventListener('click', () => removeItem(type, item.id));
  actions.appendChild(deleteButton);

  if (type === 'tasks' || type === 'shopping' || type === 'events') {
    const completeButton = document.createElement('button');
    completeButton.innerHTML = item.done ? '↩️' : '✅';
    completeButton.className = 'complete';
    completeButton.type = 'button';
    completeButton.setAttribute('aria-label', item.done ? 'Als offen markieren' : 'Als erledigt markieren');
    completeButton.addEventListener('click', () => toggleDone(type, item.id));
    actions.appendChild(completeButton);
  }

  li.appendChild(actions);
  return li;
}

function createTaskCard(task) {
  const li = document.createElement('li');
  li.className = 'item-card';
  li.draggable = !task.done;
  li.dataset.id = task.id;

  const title = document.createElement('h4');
  title.textContent = task.title;
  if (task.done) title.classList.add('completed');
  li.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'item-meta';
  meta.innerHTML = `<div>Fällig: ${task.due || 'keine Angabe'}</div>`;
  if (task.due && !task.done) {
    const [year, month, day] = task.due.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      li.classList.add('overdue');
    }
  }
  li.appendChild(meta);

  const editForm = document.createElement('form');
  editForm.className = 'task-edit-form hidden';
  const editTitle = document.createElement('input');
  editTitle.type = 'text';
  editTitle.className = 'task-edit-title';
  editTitle.value = task.title;
  editTitle.required = true;
  editTitle.placeholder = 'Aufgabe';

  const editDue = document.createElement('input');
  editDue.type = 'date';
  editDue.className = 'task-edit-due';
  editDue.value = task.due;
  editDue.required = true;

  const editActions = document.createElement('div');
  editActions.className = 'task-edit-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'OK';
  saveButton.className = 'task-save-button';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = '✕';
  cancelButton.className = 'task-cancel-button';
  cancelButton.addEventListener('click', () => {
    editForm.classList.add('hidden');
    title.classList.remove('hidden');
    meta.classList.remove('hidden');
  });

  editActions.appendChild(saveButton);
  editActions.appendChild(cancelButton);
  editForm.appendChild(editTitle);
  editForm.appendChild(editDue);
  editForm.appendChild(editActions);
  li.appendChild(editForm);

  editForm.addEventListener('submit', event => {
    event.preventDefault();
    const newTitle = editTitle.value.trim();
    const newDue = editDue.value;
    if (!newTitle || !newDue) return;
    updateTask(task.id, { title: newTitle, due: newDue });
  });

  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const editButton = document.createElement('button');
  editButton.innerHTML = '✏️';
  editButton.className = 'edit';
  editButton.type = 'button';
  editButton.setAttribute('aria-label', 'Bearbeiten');
  editButton.addEventListener('click', () => {
    title.classList.add('hidden');
    meta.classList.add('hidden');
    editForm.classList.remove('hidden');
    editTitle.focus();
  });
  actions.appendChild(editButton);

  const deleteButton = document.createElement('button');
  deleteButton.innerHTML = '🗑️';
  deleteButton.className = 'delete';
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', 'Löschen');
  deleteButton.addEventListener('click', () => removeItem('tasks', task.id));
  actions.appendChild(deleteButton);

  const completeButton = document.createElement('button');
  completeButton.innerHTML = task.done ? '↩️' : '✅';
  completeButton.className = 'complete';
  completeButton.type = 'button';
  completeButton.setAttribute('aria-label', task.done ? 'Als offen markieren' : 'Als erledigt markieren');
  completeButton.addEventListener('click', () => toggleDone('tasks', task.id));
  actions.appendChild(completeButton);

  li.appendChild(actions);

  li.addEventListener('dragstart', event => {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  });

  return li;
}

function assignTaskToMember(id, member) {
  state.tasks = state.tasks.map(task => task.id === id ? { ...task, member } : task);
  saveState();
  renderAll();
}

function renderTaskBoard() {
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  taskColumns.forEach(column => {
    const list = column.querySelector('.task-list');
    const member = column.dataset.member;
    let completedSection = column.querySelector('.completed-section');

    if (!completedSection) {
      completedSection = document.createElement('div');
      completedSection.className = 'completed-section hidden';
      completedSection.innerHTML = `
        <hr />
        <div class="completed-header">
          <span>Erledigt (letzte 3 Tage)</span>
          <span class="completed-count"></span>
        </div>
        <ul class="completed-list"></ul>
      `;
      list.insertAdjacentElement('afterend', completedSection);
    }

    const openTasks = state.tasks.filter(task => {
      const taskMember = taskMembers.includes(task.member) ? task.member : 'Allgemein';
      return taskMember === member && !task.done;
    });

    const recentCompletedTasks = state.tasks.filter(task => {
      const taskMember = taskMembers.includes(task.member) ? task.member : 'Allgemein';
      if (taskMember !== member || !task.done || !task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      return now - completedDate.getTime() <= threeDaysMs;
    });

    list.innerHTML = '';
    openTasks.forEach(task => list.appendChild(createTaskCard(task)));
    column.querySelector('.column-count').textContent = `${openTasks.length} offene Aufgaben`;

    const completedList = completedSection.querySelector('.completed-list');
    const completedCount = completedSection.querySelector('.completed-count');
    completedList.innerHTML = '';
    completedCount.textContent = `${recentCompletedTasks.length} Aufgaben`;

    if (showCompletedTasks && recentCompletedTasks.length > 0) {
      completedSection.classList.remove('hidden');
      recentCompletedTasks.forEach(task => completedList.appendChild(createTaskCard(task)));
    } else {
      completedSection.classList.add('hidden');
    }
  });
}

function setupTaskBoardDragAndDrop() {
  taskColumns.forEach(column => {
    column.addEventListener('dragover', event => {
      event.preventDefault();
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', () => column.classList.remove('drag-over'));
    column.addEventListener('drop', event => {
      event.preventDefault();
      column.classList.remove('drag-over');
      const taskId = event.dataTransfer.getData('text/plain');
      if (taskId) {
        assignTaskToMember(taskId, column.dataset.member);
      }
    });
  });
}

function setupInlineTaskForms() {
  if (showCompletedCheckbox) {
    showCompletedCheckbox.checked = showCompletedTasks;
    showCompletedCheckbox.addEventListener('change', event => {
      showCompletedTasks = event.target.checked;
      localStorage.setItem(completedToggleKey, JSON.stringify(showCompletedTasks));
      renderAll();
    });
  }

  taskBoard.addEventListener('click', event => {
    const button = event.target.closest('.column-add-button');
    if (!button) return;
    const column = button.closest('.instance-column');
    const form = column.querySelector('.inline-task-form');
    inlineTaskForms.forEach(f => {
      if (f !== form) f.classList.add('hidden');
    });
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
      form.querySelector('.task-title-input').focus();
    }
  });

  inlineTaskForms.forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const title = form.querySelector('.task-title-input').value.trim();
      const due = form.querySelector('.task-due-input').value;
      if (!title || !due) return;
      const member = form.dataset.member;
      addItem('tasks', {
        id: crypto.randomUUID(),
        title,
        due,
        member,
        priority: 'Normal',
        done: false
      });
      form.reset();
      form.classList.add('hidden');
    });
  });
}

function renderList(type, container) {
  container.innerHTML = '';
  state[type].forEach(item => container.appendChild(createItemCard(item, type)));
}

function updateSummary() {
  summaryTasks.textContent = state.tasks.filter(task => !task.done).length;
  summaryShopping.textContent = state.shopping.filter(item => !item.done).length;
  summaryEvents.textContent = state.events.filter(event => !event.done).length;
  summaryNotes.textContent = state.notes.length;
  renderRecentActivity();
}

function renderRecentActivity() {
  recentActivity.innerHTML = '';
  const activity = [];
  state.tasks.slice(-2).reverse().forEach(item => activity.push(`Aufgabe: ${item.title}`));
  state.shopping.slice(-2).reverse().forEach(item => activity.push(`Einkauf: ${item.item}`));
  state.events.slice(-2).reverse().forEach(item => activity.push(`Termin: ${item.title}`));
  state.notes.slice(-2).reverse().forEach(item => activity.push(`Notiz: ${item.title}`));
  activity.slice(0, 5).forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    recentActivity.appendChild(li);
  });
  if (!activity.length) {
    const li = document.createElement('li');
    li.textContent = 'Noch keine Einträge vorhanden.';
    recentActivity.appendChild(li);
  }
}

function addItem(type, item) {
  state[type].push(item);
  saveState();
  renderAll();
}

function removeItem(type, id) {
  state[type] = state[type].filter(item => item.id !== id);
  saveState();
  renderAll();
}

function updateTask(id, changes) {
  state.tasks = state.tasks.map(task => task.id === id ? { ...task, ...changes } : task);
  saveState();
  renderAll();
}

function toggleDone(type, id) {
  state[type] = state[type].map(item => {
    if (item.id !== id) return item;
    const done = !item.done;
    if (type === 'tasks') {
      return {
        ...item,
        done,
        completedAt: done ? (item.completedAt || new Date().toISOString()) : undefined
      };
    }
    return { ...item, done };
  });
  saveState();
  renderAll();
}

function renderAll() {
  cleanupCompletedTasks();
  renderTaskBoard();
  renderList('shopping', shoppingList);
  renderList('events', eventList);
  renderList('notes', noteList);
  renderList('contacts', contactList);
  updateSummary();
}

navButtons.forEach(button => {
  button.addEventListener('click', () => switchPanel(button.dataset.panel));
});


shoppingForm.addEventListener('submit', event => {
  event.preventDefault();
  const item = document.getElementById('shopping-item').value.trim();
  if (!item) return;
  const qty = document.getElementById('shopping-qty').value.trim();
  const category = document.getElementById('shopping-category').value.trim();
  addItem('shopping', {
    id: crypto.randomUUID(),
    item,
    qty,
    category,
    done: false
  });
  shoppingForm.reset();
});

eventForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = document.getElementById('event-title').value.trim();
  const date = document.getElementById('event-date').value;
  if (!title || !date) return;
  const time = document.getElementById('event-time').value;
  const location = document.getElementById('event-location').value.trim();
  addItem('events', {
    id: crypto.randomUUID(),
    title,
    date,
    time,
    location,
    done: false
  });
  eventForm.reset();
});

noteForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = document.getElementById('note-title').value.trim();
  const text = document.getElementById('note-text').value.trim();
  if (!title || !text) return;
  addItem('notes', {
    id: crypto.randomUUID(),
    title,
    text
  });
  noteForm.reset();
});

contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('contact-name').value.trim();
  if (!name) return;
  const phone = document.getElementById('contact-phone').value.trim();
  const note = document.getElementById('contact-note').value.trim();
  addItem('contacts', {
    id: crypto.randomUUID(),
    name,
    phone,
    note
  });
  contactForm.reset();
});

setupTaskBoardDragAndDrop();
setupInlineTaskForms();
renderAll();
