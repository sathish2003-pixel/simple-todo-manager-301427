import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
} from './api';

// Helpers
function byIdMap(items) {
  const map = new Map();
  items.forEach((i) => map.set(i.id, i));
  return map;
}

function cx(...args) {
  return args.filter(Boolean).join(' ');
}

// PUBLIC_INTERFACE
function App() {
  /**
   * Single-page ToDo UI:
   * - List tasks
   * - Add task
   * - Edit task title inline
   * - Delete task
   * - Toggle complete
   * - Optimistic updates with fallback on error
   * - Loading and error states
   * - Light theme with primary (#3b82f6) and success (#06b6d4) accents
   */

  const [theme] = useState('light');

  const [tasks, setTasks] = useState([]);
  const [tasksMap, setTasksMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [error, setError] = useState(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listTasks();
        if (!mounted) return;
        setTasks(data || []);
        setTasksMap(byIdMap(data || []));
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load tasks');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const hasTasks = useMemo(() => tasks && tasks.length > 0, [tasks]);

  // Optimistic add
  const handleAdd = async (e) => {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;

    setError(null);
    setLoadingAction('add');
    // optimistic task
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = { id: tempId, title, completed: false };
    setTasks((prev) => [optimisticTask, ...prev]);
    setTasksMap((prev) => {
      const m = new Map(prev);
      m.set(tempId, optimisticTask);
      return m;
    });
    setInput('');

    try {
      const created = await createTask(title);
      // swap temp with actual
      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? created : t))
      );
      setTasksMap((prev) => {
        const m = new Map(prev);
        m.delete(tempId);
        m.set(created.id, created);
        return m;
      });
    } catch (e) {
      // revert optimistic
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      setTasksMap((prev) => {
        const m = new Map(prev);
        m.delete(tempId);
        return m;
      });
      setError(e.message || 'Failed to add task');
    } finally {
      setLoadingAction(null);
    }
  };

  // Optimistic toggle
  const handleToggle = async (task) => {
    setError(null);
    const newCompleted = !task.completed;

    // optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: newCompleted } : t))
    );
    setTasksMap((prev) => {
      const m = new Map(prev);
      m.set(task.id, { ...task, completed: newCompleted });
      return m;
    });

    try {
      const updated = await toggleTaskComplete(task.id, newCompleted);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      setTasksMap((prev) => {
        const m = new Map(prev);
        m.set(task.id, updated);
        return m;
      });
    } catch (e) {
      // revert
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t))
      );
      setTasksMap((prev) => {
        const m = new Map(prev);
        m.set(task.id, task);
        return m;
      });
      setError(e.message || 'Failed to toggle task');
    }
  };

  // Optimistic edit
  const handleEditTitle = async (task, newTitle, doneCb) => {
    const title = (newTitle || '').trim();
    if (!title || title === task.title) {
      doneCb?.();
      return;
    }

    setError(null);

    // optimistic
    const prev = { ...task };
    const optimistic = { ...task, title };
    setTasks((p) => p.map((t) => (t.id === task.id ? optimistic : t)));
    setTasksMap((prevMap) => {
      const m = new Map(prevMap);
      m.set(task.id, optimistic);
      return m;
    });

    try {
      const updated = await updateTask(task.id, { title });
      setTasks((p) => p.map((t) => (t.id === task.id ? updated : t)));
      setTasksMap((prevMap) => {
        const m = new Map(prevMap);
        m.set(task.id, updated);
        return m;
      });
    } catch (e) {
      // revert
      setTasks((p) => p.map((t) => (t.id === task.id ? prev : t)));
      setTasksMap((prevMap) => {
        const m = new Map(prevMap);
        m.set(task.id, prev);
        return m;
      });
      setError(e.message || 'Failed to update task');
    } finally {
      doneCb?.();
    }
  };

  // Optimistic delete
  const handleDelete = async (task) => {
    setError(null);
    const prevTasks = tasks;
    const prevMap = tasksMap;

    // optimistic
    setTasks((p) => p.filter((t) => t.id !== task.id));
    setTasksMap((m) => {
      const next = new Map(m);
      next.delete(task.id);
      return next;
    });

    try {
      await deleteTask(task.id);
    } catch (e) {
      // revert
      setTasks(prevTasks);
      setTasksMap(prevMap);
      setError(e.message || 'Failed to delete task');
    }
  };

  return (
    <div className="App">
      <main className="todo-container">
        <header className="todo-header">
          <h1 className="title">Tasks</h1>
          <p className="subtitle">Manage your daily to-dos</p>
        </header>

        <form className="add-form" onSubmit={handleAdd} aria-label="Add new task">
          <input
            className="add-input"
            type="text"
            placeholder="What needs to be done?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Task title"
          />
          <button className="btn btn-primary" type="submit" disabled={!input.trim() || loadingAction === 'add'}>
            {loadingAction === 'add' ? 'Adding…' : 'Add'}
          </button>
        </form>

        {loading && <div className="banner info">Loading tasks…</div>}
        {error && <div className="banner error" role="alert">{error}</div>}

        {!loading && !hasTasks && (
          <div className="empty">No tasks yet. Add your first task above.</div>
        )}

        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => handleToggle(task)}
              onDelete={() => handleDelete(task)}
              onEdit={(newTitle, doneCb) => handleEditTitle(task, newTitle, doneCb)}
            />
          ))}
        </ul>
      </main>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  useEffect(() => setValue(task.title), [task.title]);

  const submitEdit = async () => {
    const done = () => setEditing(false);
    await onEdit(value, done);
  };

  return (
    <li className={cx('task-item', task.completed && 'completed')}>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={!!task.completed}
          onChange={onToggle}
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        />
        <span className="checkmark" />
      </label>

      {!editing ? (
        <div className="task-content" onDoubleClick={() => setEditing(true)} title="Double-click to edit">
          <span className="task-title">{task.title}</span>
        </div>
      ) : (
        <div className="task-edit">
          <input
            className="edit-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitEdit();
              if (e.key === 'Escape') {
                setValue(task.title);
                setEditing(false);
              }
            }}
            autoFocus
          />
          <button className="btn btn-success" onClick={submitEdit} disabled={!value.trim()}>
            Save
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setValue(task.title);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="task-actions">
        {!editing && (
          <button className="btn btn-ghost" onClick={() => setEditing(true)} aria-label="Edit task">
            Edit
          </button>
        )}
        <button className="btn btn-danger" onClick={onDelete} aria-label="Delete task">
          Delete
        </button>
      </div>
    </li>
  );
}

export default App;
