/**
 * ============================================================================
 * AGILEFLOW - APLICACIÓN CRUD ASISTIDA POR INTELIGENCIA ARTIFICIAL
 * Seminario: Gestión de Software Ágil con IA
 * ============================================================================
 * Implementación de las operaciones CRUD (Create, Read, Update, Delete)
 * utilizando Vanilla JavaScript y persistencia con Web Storage API (localStorage).
 */

// ----------------------------------------------------------------------------
// 1. ESTADO DE LA APLICACIÓN Y DATOS INICIALES
// ----------------------------------------------------------------------------
const STORAGE_KEY = 'agileflow_tasks_db';
let tasks = [];
let taskToDeleteId = null;

// Semilla de datos iniciales para demostración (Seed Data)
const INITIAL_DEMO_TASKS = [
  {
    id: 'task-1710000001',
    title: 'Diseñar arquitectura de microservicios',
    description: 'Definir contratos de API y diagramas de flujo para los servicios de autenticación y pagos.',
    assignee: 'Laura Scrum',
    priority: 'Alta',
    status: 'En Progreso',
    points: 5,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'task-1710000002',
    title: 'Crear suite de pruebas unitarias para el CRUD',
    description: 'Implementar tests para validar las funciones Create, Read, Update y Delete del módulo principal.',
    assignee: 'Santiago Dev',
    priority: 'Media',
    status: 'Completada',
    points: 3,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'task-1710000003',
    title: 'Corrección de vulnerabilidad en endpoint de login',
    description: 'Sanitizar inputs de usuario y prevenir inyecciones SQL según reporte de seguridad OWASP.',
    assignee: 'Andrés QA',
    priority: 'Crítica',
    status: 'En Revisión',
    points: 8,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'task-1710000004',
    title: 'Redactar documentación técnica y guía de prompts',
    description: 'Documentar los prompts empleados en la IA para la rúbrica de evaluación y preparar README.',
    assignee: 'Equipo Ágil',
    priority: 'Baja',
    status: 'Backlog',
    points: 2,
    createdAt: new Date().toISOString()
  }
];

// ----------------------------------------------------------------------------
// 2. REFERENCIAS AL DOM
// ----------------------------------------------------------------------------
const dom = {
  tasksContainer: document.getElementById('tasks-container'),
  emptyState: document.getElementById('empty-state'),
  searchInput: document.getElementById('search-input'),
  filterStatus: document.getElementById('filter-status'),
  filterPriority: document.getElementById('filter-priority'),
  btnNewTask: document.getElementById('btn-new-task'),
  btnSeed: document.getElementById('btn-seed'),
  btnEmptyCreate: document.getElementById('btn-empty-create'),
  // Modal Crear/Editar
  taskModal: document.getElementById('task-modal'),
  taskForm: document.getElementById('task-form'),
  modalTitle: document.getElementById('modal-title'),
  taskIdInput: document.getElementById('task-id'),
  taskTitleInput: document.getElementById('task-title'),
  taskDescInput: document.getElementById('task-desc'),
  taskAssigneeInput: document.getElementById('task-assignee'),
  taskPointsInput: document.getElementById('task-points'),
  taskStatusInput: document.getElementById('task-status'),
  taskPriorityInput: document.getElementById('task-priority'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  errorTitle: document.getElementById('error-title'),
  // Modal Eliminar
  deleteModal: document.getElementById('delete-modal'),
  btnCancelDelete: document.getElementById('btn-cancel-delete'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),
  // Métricas
  statTotal: document.getElementById('stat-total'),
  statProgress: document.getElementById('stat-progress'),
  statCompleted: document.getElementById('stat-completed'),
  statPoints: document.getElementById('stat-points'),
  // Toast
  toastContainer: document.getElementById('toast-container')
};

// ----------------------------------------------------------------------------
// 3. PERSISTENCIA EN LOCALSTORAGE
// ----------------------------------------------------------------------------
function loadTasks() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      // Si está vacío, cargamos los datos demostrativos
      tasks = [...INITIAL_DEMO_TASKS];
      saveTasks();
    } else {
      tasks = JSON.parse(rawData);
    }
  } catch (err) {
    console.error('Error al parsear localStorage:', err);
    tasks = [...INITIAL_DEMO_TASKS];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Error guardando en localStorage:', err);
    showToast('Error al persistir datos en almacenamiento local', 'error');
  }
}

// ----------------------------------------------------------------------------
// 4. OPERACIONES CRUD FUNDAMENTALES
// ----------------------------------------------------------------------------

/**
 * [CREATE] - Agregar un nuevo registro al estado y persistirlo.
 */
function createTask(taskData) {
  const newTask = {
    id: 'task-' + Date.now(),
    title: taskData.title.trim(),
    description: taskData.description.trim(),
    assignee: taskData.assignee.trim(),
    points: parseInt(taskData.points, 10) || 1,
    status: taskData.status,
    priority: taskData.priority,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask); // Añadir al inicio para visibilidad inmediata
  saveTasks();
  renderApp();
  showToast('Tarea creada exitosamente', 'success');
}

/**
 * [READ] - Obtener y filtrar registros para renderizarlos en la interfaz.
 */
function getFilteredTasks() {
  const query = dom.searchInput.value.toLowerCase().trim();
  const statusFilter = dom.filterStatus.value;
  const priorityFilter = dom.filterPriority.value;

  return tasks.filter(task => {
    // Búsqueda en texto (título, descripción, responsable)
    const matchesQuery = 
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      task.assignee.toLowerCase().includes(query);

    // Filtros de selección
    const matchesStatus = (statusFilter === 'ALL') || (task.status === statusFilter);
    const matchesPriority = (priorityFilter === 'ALL') || (task.priority === priorityFilter);

    return matchesQuery && matchesStatus && matchesPriority;
  });
}

/**
 * [UPDATE] - Modificar los datos de un registro existente por su ID.
 */
function updateTask(id, updatedFields) {
  const taskIndex = tasks.findIndex(t => t.id === id);
  if (taskIndex === -1) {
    showToast('No se encontró la tarea a actualizar', 'error');
    return;
  }

  tasks[taskIndex] = {
    ...tasks[taskIndex],
    title: updatedFields.title.trim(),
    description: updatedFields.description.trim(),
    assignee: updatedFields.assignee.trim(),
    points: parseInt(updatedFields.points, 10) || 1,
    status: updatedFields.status,
    priority: updatedFields.priority,
    updatedAt: new Date().toISOString()
  };

  saveTasks();
  renderApp();
  showToast('Tarea actualizada correctamente', 'success');
}

/**
 * [DELETE] - Eliminar un registro definitivamente por su ID.
 */
function deleteTask(id) {
  const initialLength = tasks.length;
  tasks = tasks.filter(t => t.id !== id);

  if (tasks.length < initialLength) {
    saveTasks();
    renderApp();
    showToast('Tarea eliminada con éxito', 'info');
  } else {
    showToast('No se pudo encontrar la tarea para eliminar', 'error');
  }
}

// ----------------------------------------------------------------------------
// 5. RENDERIZADO Y ACTUALIZACIÓN DE INTERFAZ (UI)
// ----------------------------------------------------------------------------
function renderApp() {
  renderMetrics();
  renderCards();
}

/**
 * Calcula y actualiza las métricas en tiempo real
 */
function renderMetrics() {
  const total = tasks.length;
  const inProgress = tasks.filter(t => t.status === 'En Progreso').length;
  const completed = tasks.filter(t => t.status === 'Completada').length;
  const points = tasks.reduce((sum, t) => sum + (Number(t.points) || 0), 0);

  dom.statTotal.textContent = total;
  dom.statProgress.textContent = inProgress;
  dom.statCompleted.textContent = completed;
  dom.statPoints.textContent = points;
}

/**
 * Construye las tarjetas de tareas en el contenedor HTML
 */
function renderCards() {
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    dom.tasksContainer.innerHTML = '';
    dom.emptyState.classList.remove('hidden');
    return;
  }

  dom.emptyState.classList.add('hidden');

  dom.tasksContainer.innerHTML = filtered.map(task => {
    // Normalizar clases para badges
    const statusClassKey = task.status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    const priorityClass = `badge-priority-${task.priority}`;
    const statusClass = `badge-status-${statusClassKey}`;

    // Formatear fecha
    const dateFormatted = new Date(task.createdAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });

    return `
      <article class="task-card bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative group" data-id="${task.id}">
        <div>
          <!-- Cabecera de la tarjeta: Badges de Estado y Prioridad -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusClass}">
              <i class="fa-regular fa-circle-dot mr-1"></i>${escapeHTML(task.status)}
            </span>
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-md ${priorityClass}">
                ${escapeHTML(task.priority)}
              </span>
              <span class="text-xs bg-slate-900 text-purple-400 font-mono font-bold px-2 py-0.5 rounded-md border border-purple-500/30" title="Story Points">
                ${task.points} pts
              </span>
            </div>
          </div>

          <!-- Título -->
          <h3 class="text-base font-bold text-white mb-2 leading-snug group-hover:text-indigo-400 transition-colors">
            ${escapeHTML(task.title)}
          </h3>

          <!-- Descripción -->
          <p class="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
            ${escapeHTML(task.description || 'Sin descripción detallada.')}
          </p>
        </div>

        <!-- Pie de Tarjeta: Responsable, Fecha y Botones de Acción -->
        <div class="pt-4 border-t border-slate-700/60 flex items-center justify-between mt-2">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow">
              ${escapeHTML(task.assignee.charAt(0).toUpperCase())}
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-medium text-slate-300 leading-tight">${escapeHTML(task.assignee)}</span>
              <span class="text-[10px] text-slate-500">${dateFormatted}</span>
            </div>
          </div>

          <!-- Acciones CRUD: Editar (U) y Eliminar (D) -->
          <div class="flex items-center gap-1">
            <button 
              onclick="handleOpenEditModal('${task.id}')" 
              class="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700/70 flex items-center justify-center transition"
              title="Editar tarea (Update)"
            >
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button 
              onclick="handleOpenDeleteModal('${task.id}')" 
              class="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/70 flex items-center justify-center transition"
              title="Eliminar tarea (Delete)"
            >
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ----------------------------------------------------------------------------
// 6. GESTIÓN DE MODALES Y FORMULARIOS
// ----------------------------------------------------------------------------

function openCreateModal() {
  dom.taskForm.reset();
  dom.taskIdInput.value = '';
  dom.modalTitle.innerHTML = `<i class="fa-solid fa-plus-circle text-indigo-400"></i><span>Nueva Tarea Ágil</span>`;
  dom.errorTitle.classList.add('hidden');
  dom.taskModal.classList.add('active');
  setTimeout(() => dom.taskTitleInput.focus(), 100);
}

function handleOpenEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  dom.taskIdInput.value = task.id;
  dom.taskTitleInput.value = task.title;
  dom.taskDescInput.value = task.description || '';
  dom.taskAssigneeInput.value = task.assignee;
  dom.taskPointsInput.value = task.points;
  dom.taskStatusInput.value = task.status;
  dom.taskPriorityInput.value = task.priority;

  dom.modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-400"></i><span>Editar Tarea</span>`;
  dom.errorTitle.classList.add('hidden');
  dom.taskModal.classList.add('active');
  setTimeout(() => dom.taskTitleInput.focus(), 100);
}

function closeModal() {
  dom.taskModal.classList.remove('active');
  dom.taskForm.reset();
  dom.taskIdInput.value = '';
}

function handleOpenDeleteModal(id) {
  taskToDeleteId = id;
  dom.deleteModal.classList.add('active');
}

function closeDeleteModal() {
  taskToDeleteId = null;
  dom.deleteModal.classList.remove('active');
}

// Exponer funciones necesarias al objeto window para invocaciones inline
window.handleOpenEditModal = handleOpenEditModal;
window.handleOpenDeleteModal = handleOpenDeleteModal;

// ----------------------------------------------------------------------------
// 7. TOAST NOTIFICATIONS & UTILIDADES
// ----------------------------------------------------------------------------

function showToast(message, type = 'info') {
  const icons = {
    success: 'fa-circle-check text-emerald-400',
    error: 'fa-circle-xmark text-rose-400',
    info: 'fa-circle-info text-sky-400'
  };

  const toast = document.createElement('div');
  toast.className = `toast-item flex items-center gap-3 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-xl text-xs`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-base"></i>
    <span>${escapeHTML(message)}</span>
  `;

  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2800);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------------------------------
// 8. EVENT LISTENERS
// ----------------------------------------------------------------------------

// Apertura y Cierre de Modal Form
dom.btnNewTask.addEventListener('click', openCreateModal);
dom.btnEmptyCreate.addEventListener('click', openCreateModal);
dom.btnCloseModal.addEventListener('click', closeModal);
dom.btnCancelModal.addEventListener('click', closeModal);

// Cierre al pulsar fuera de la tarjeta modal
dom.taskModal.addEventListener('click', (e) => {
  if (e.target === dom.taskModal) closeModal();
});
dom.deleteModal.addEventListener('click', (e) => {
  if (e.target === dom.deleteModal) closeDeleteModal();
});

// Manejo del formulario (Create o Update)
dom.taskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = dom.taskTitleInput.value.trim();
  const assignee = dom.taskAssigneeInput.value.trim();

  // Validación básica
  if (title.length < 3) {
    dom.errorTitle.classList.remove('hidden');
    dom.taskTitleInput.focus();
    return;
  }
  dom.errorTitle.classList.add('hidden');

  const formData = {
    title,
    description: dom.taskDescInput.value,
    assignee,
    points: dom.taskPointsInput.value,
    status: dom.taskStatusInput.value,
    priority: dom.taskPriorityInput.value
  };

  const editingId = dom.taskIdInput.value;

  if (editingId) {
    // [UPDATE]
    updateTask(editingId, formData);
  } else {
    // [CREATE]
    createTask(formData);
  }

  closeModal();
});

// Confirmación de eliminación (Delete)
dom.btnCancelDelete.addEventListener('click', closeDeleteModal);
dom.btnConfirmDelete.addEventListener('click', () => {
  if (taskToDeleteId) {
    deleteTask(taskToDeleteId);
    closeDeleteModal();
  }
});

// Eventos de Filtrado y Búsqueda en tiempo real
dom.searchInput.addEventListener('input', renderCards);
dom.filterStatus.addEventListener('change', renderCards);
dom.filterPriority.addEventListener('change', renderCards);

// Recargar datos semilla
dom.btnSeed.addEventListener('click', () => {
  tasks = [...INITIAL_DEMO_TASKS];
  saveTasks();
  renderApp();
  showToast('Datos de ejemplo recargados', 'success');
});

// Teclado: Escape para cerrar modales
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
  }
});

// ----------------------------------------------------------------------------
// 9. INICIALIZACIÓN
// ----------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  renderApp();
  console.log('AgileFlow CRUD inicializado con éxito.');
});
