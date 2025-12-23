import { getApiBaseUrl } from './config';

const BASE = getApiBaseUrl();

// Basic helper to parse JSON and handle non-2xx statuses
async function http(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text().catch(() => null);
  }
  if (!res.ok) {
    const message = data && data.detail ? data.detail : res.statusText;
    const error = new Error(message || 'API error');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

// PUBLIC_INTERFACE
export async function listTasks() {
  /** Fetches all tasks. Returns an array of tasks. */
  return http('GET', '/tasks');
}

// PUBLIC_INTERFACE
export async function createTask(title) {
  /** Creates a new task with given title. Returns the created task. */
  return http('POST', '/tasks', { title });
}

// PUBLIC_INTERFACE
export async function updateTask(id, updates) {
  /** Updates a task by id with provided fields. Returns the updated task. */
  return http('PUT', `/tasks/${id}`, updates);
}

// PUBLIC_INTERFACE
export async function deleteTask(id) {
  /** Deletes a task by id. Returns success acknowledgment. */
  return http('DELETE', `/tasks/${id}`);
}

// PUBLIC_INTERFACE
export async function toggleTaskComplete(id, completed) {
  /** Toggles a task's completion status. Returns the updated task. */
  return http('PATCH', `/tasks/${id}`, { completed });
}
