import { FormEvent, useEffect, useRef, useState } from 'react';
import { addTodo, deleteTodo, getTodos, USER_ID } from '../api/todos';
import { Todo } from '../types/Todo';

type FilterStatus = 'all' | 'active' | 'completed';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [newTitle, setNewTitle] = useState('');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingTodoIds, setLoadingTodoIds] = useState<number[]>([]);
  const newTodoInputRef = useRef<HTMLInputElement>(null);

  const startTodoLoading = (id: number) => {
    setLoadingTodoIds(current => [...current, id]);
  };

  const stopTodoLoading = (id: number) => {
    setLoadingTodoIds(current => current.filter(todoId => todoId !== id));
  };

  const showError = (message: string) => {
    setErrorMessage(message);
  };

  const handleDeleteTodo = (id: number) => {
    setErrorMessage('');
    startTodoLoading(id);

    deleteTodo(id)
      .then(() => setTodos(current => current.filter(todo => todo.id !== id)))
      .catch(() => showError('Unable to delete a todo'))
      .finally(() => {
        stopTodoLoading(id);
        setTimeout(() => {
          newTodoInputRef.current?.focus();
        }, 0);
      });
  };

  const handleClearCompleted = () => {
    setErrorMessage('');

    const completedIds = todos
      .filter(todo => todo.completed)
      .map(todo => todo.id);

    if (!completedIds.length) {
      return;
    }

    setLoadingTodoIds(current => [...current, ...completedIds]);

    Promise.allSettled(completedIds.map(id => deleteTodo(id))).then(results => {
      const successfulIds = completedIds.filter(
        (_, index) => results[index].status === 'fulfilled',
      );
      const hasFailed = results.some(result => result.status === 'rejected');

      if (successfulIds.length) {
        setTodos(current =>
          current.filter(todo => !successfulIds.includes(todo.id)),
        );
      }

      if (hasFailed) {
        showError('Unable to delete a todo');
      }

      setLoadingTodoIds(current =>
        current.filter(id => !completedIds.includes(id)),
      );

      setTimeout(() => {
        newTodoInputRef.current?.focus();
      }, 0);
    });
  };

  const handleAddTodo = (event: FormEvent) => {
    event.preventDefault();

    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle) {
      showError('Title should not be empty');

      return;
    }

    setErrorMessage('');
    setIsAdding(true);

    const newTodoData = {
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    };

    setTempTodo({ id: 0, ...newTodoData });

    addTodo(newTodoData)
      .then(createdTodo => {
        setTodos(current => [...current, createdTodo]);
        setNewTitle('');
      })
      .catch(() => showError('Unable to add a todo'))
      .finally(() => {
        setTempTodo(null);
        setIsAdding(false);
        setTimeout(() => {
          newTodoInputRef.current?.focus();
        }, 0);
      });
  };

  const visibleTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  const closeError = () => {
    setErrorMessage('');
  };

  useEffect(() => {
    newTodoInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timerId = setTimeout(() => {
      setErrorMessage('');
    }, 3000);

    return () => clearTimeout(timerId);
  }, [errorMessage]);

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setIsLoading(false));
  }, []);

  return {
    todos,
    isLoading,
    isAdding,
    errorMessage,
    filter,
    newTitle,
    tempTodo,
    loadingTodoIds,
    newTodoInputRef,
    visibleTodos,
    setFilter,
    setNewTitle,
    closeError,
    handleAddTodo,
    handleDeleteTodo,
    handleClearCompleted,
  };
};
