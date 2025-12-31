import React, { useState, useEffect } from 'react';
import { Plus, X, CheckCircle, Circle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

export default function TodoApp() {
  const [groups, setGroups] = useState(() => {
    try {
      const saved = window.localStorage.getItem('todoGroups');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [standaloneTasks, setStandaloneTasks] = useState(() => {
    try {
      const saved = window.localStorage.getItem('standaloneTasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [sortByDeadline, setSortByDeadline] = useState(false);
  const [swipeState, setSwipeState] = useState({});

  const handleTouchStart = (taskId, e) => {
    setSwipeState(prev => ({
      ...prev,
      [taskId]: {
        startX: e.touches[0].clientX,
        currentX: e.touches[0].clientX,
        isSwiping: false
      }
    }));
  };

  const handleTouchMove = (taskId, e) => {
    const state = swipeState[taskId];
    if (!state) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - state.startX;

    setSwipeState(prev => ({
      ...prev,
      [taskId]: {
        ...state,
        currentX: currentX,
        isSwiping: Math.abs(diff) > 10
      }
    }));
  };

  const handleTouchEnd = (taskId, isStandalone, groupId) => {
    const state = swipeState[taskId];
    if (!state) return;

    const diff = state.currentX - state.startX;

    // 右方向に50px以上スワイプしたら完了
    if (diff > 150) {
      if (isStandalone) {
        toggleStandaloneTask(taskId);
      } else {
        toggleTask(groupId, taskId);
      }
    }

    // スワイプ状態をリセット
    setSwipeState(prev => {
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
  };

  const getSwipeTransform = (taskId) => {
    const state = swipeState[taskId];
    if (!state) return 'translateX(0)';
    
    const diff = state.currentX - state.startX;
    // 右方向のスワイプのみ許可
    const translateX = Math.max(0, Math.min(diff, 150));
    return `translateX(${translateX}px)`;
  };

  useEffect(() => {
    try {
      window.localStorage.setItem('todoGroups', JSON.stringify(groups));
    } catch (e) {
      console.error('保存エラー:', e);
    }
  }, [groups]);

  useEffect(() => {
    try {
      window.localStorage.setItem('standaloneTasks', JSON.stringify(standaloneTasks));
    } catch (e) {
      console.error('保存エラー:', e);
    }
  }, [standaloneTasks]);

  const addGroup = () => {
    if (!groupName.trim()) {
      alert('グループ名を入力してください');
      return;
    }
    const newGroup = {
      id: Date.now(),
      name: groupName,
      tasks: []
    };
    setGroups([...groups, newGroup]);
    setGroupName('');
    setShowGroupModal(false);
  };

  const deleteGroup = (groupId) => {
    if (window.confirm('このグループを削除しますか？')) {
      setGroups(groups.filter(g => g.id !== groupId));
    }
  };

  const addTask = () => {
    if (!taskName.trim()) {
      alert('タスク名を入力してください');
      return;
    }
    
    // 期限が入力されていない場合は今日の日付を設定
    const finalDeadline = taskDeadline || new Date().toISOString().split('T')[0];
    
    const newTask = {
      id: Date.now(),
      name: taskName,
      deadline: finalDeadline,
      completed: false,
      completedAt: null
    };

    if (selectedGroupId === null) {
      // 単独タスクとして追加
      setStandaloneTasks([...standaloneTasks, newTask]);
    } else {
      // グループ内タスクとして追加
      setGroups(groups.map(g => 
        g.id === selectedGroupId 
          ? { ...g, tasks: [...g.tasks, newTask] }
          : g
      ));
    }
    
    setTaskName('');
    setTaskDeadline('');
    setShowTaskModal(false);
  };

  const toggleTask = (groupId, taskId) => {
    const group = groups.find(g => g.id === groupId);
    const task = group.tasks.find(t => t.id === taskId);
    
    // タスクを完了状態に更新（完了時刻を記録）
    const updatedGroups = groups.map(g => 
      g.id === groupId
        ? {
            ...g,
            tasks: g.tasks.map(t =>
              t.id === taskId 
                ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null }
                : t
            )
          }
        : g
    );
    
    setGroups(updatedGroups);
    
    // グループ内の全タスクが完了したかチェック
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup.tasks.length > 0 && updatedGroup.tasks.every(t => t.completed)) {
      // 全タスク完了したらグループに完了時刻を設定
      setGroups(prevGroups => prevGroups.map(g =>
        g.id === groupId ? { ...g, completedAt: new Date().toISOString() } : g
      ));
    }
  };

  const deleteTask = (groupId, taskId) => {
    if (window.confirm('このタスクを削除しますか？')) {
      if (groupId === null) {
        // 単独タスクの削除
        setStandaloneTasks(standaloneTasks.filter(t => t.id !== taskId));
      } else {
        // グループ内タスクの削除
        setGroups(groups.map(g =>
          g.id === groupId
            ? { ...g, tasks: g.tasks.filter(t => t.id !== taskId) }
            : g
        ));
      }
    }
  };

  const toggleStandaloneTask = (taskId) => {
    const task = standaloneTasks.find(t => t.id === taskId);
    
    if (!task.completed) {
      // 未完了→完了の場合、完了時刻を記録
      setStandaloneTasks(standaloneTasks.map(t =>
        t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
      ));
    } else {
      // 完了→未完了の場合
      setStandaloneTasks(standaloneTasks.map(t =>
        t.id === taskId ? { ...t, completed: false, completedAt: null } : t
      ));
    }
  };

  const isGroupCompleted = (group) => {
    return group.tasks.length > 0 && group.tasks.every(t => t.completed);
  };

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getSortedTasks = (tasks) => {
    if (!sortByDeadline) return tasks;
    return [...tasks].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dateString);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffTime = taskDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    if (diffDays === -1) return '昨日';
    if (diffDays < 0) return `${Math.abs(diffDays)}日前`;
    if (diffDays <= 7) return `${diffDays}日後`;
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDeadlineColor = (deadline) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(deadline);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-gray-400';
    if (diffDays === 0) return 'text-red-600 font-bold';
    if (diffDays <= 3) return 'text-orange-600';
    return 'text-blue-600';
  };

  const getGroupEarliestDeadline = (group) => {
    if (group.tasks.length === 0) return null;
    const deadlines = group.tasks.map(t => new Date(t.deadline));
    return new Date(Math.min(...deadlines)).toISOString().split('T')[0];
  };

  const canDeleteCompleted = (completedAt) => {
    if (!completedAt) return false;
    const completed = new Date(completedAt);
    const now = new Date();
    const diffDays = (now - completed) / (1000 * 60 * 60 * 24);
    return diffDays >= 2;
  };

  // 完了から2日経過したタスクを自動削除
  useEffect(() => {
    const interval = setInterval(() => {
      // 単独タスクの削除
      setStandaloneTasks(prev => 
        prev.filter(t => !t.completed || !canDeleteCompleted(t.completedAt))
      );
      
      // グループの削除
      setGroups(prev =>
        prev.filter(g => !g.completedAt || !canDeleteCompleted(g.completedAt))
      );
    }, 60000); // 1分ごとにチェック

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">ToDoリスト</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedGroupId(null);
                setShowTaskModal(true);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              タスク追加
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              グループ追加
            </button>
          </div>
        </div>

        <div className="mb-4 bg-white rounded-lg p-3 shadow">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sortByDeadline}
              onChange={(e) => setSortByDeadline(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="text-sm font-medium">期限の短い順に並べる</span>
          </label>
        </div>

        <div className="space-y-4">
          {standaloneTasks.length === 0 && groups.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-400">
              タスクまたはグループを追加して管理しましょう
            </div>
          )}

          {standaloneTasks.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">単独タスク</h2>
                    <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                      {standaloneTasks.filter(t => t.completed).length} / {standaloneTasks.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {getSortedTasks(standaloneTasks).map(task => (
                    <div
                      key={task.id}
                      className="relative overflow-hidden rounded-lg"
                    >
                      <div className="absolute inset-0 bg-green-500 flex items-center px-4">
                        <CheckCircle size={24} className="text-white" />
                        <span className="text-white font-bold ml-2">完了</span>
                      </div>
                      <div
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 relative ${
                          task.completed
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-blue-200'
                        }`}
                        style={{
                          transform: getSwipeTransform(task.id),
                          transition: swipeState[task.id]?.isSwiping ? 'none' : 'transform 0.3s ease'
                        }}
                        onTouchStart={(e) => handleTouchStart(task.id, e)}
                        onTouchMove={(e) => handleTouchMove(task.id, e)}
                        onTouchEnd={() => handleTouchEnd(task.id, true, null)}
                      >
                        <button
                          onClick={() => toggleStandaloneTask(task.id)}
                          className="flex-shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle size={24} className="text-green-500" />
                          ) : (
                            <Circle size={24} className="text-gray-400 hover:text-blue-500" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium ${
                              task.completed ? 'line-through text-gray-400' : ''
                            }`}
                          >
                            {task.name}
                          </div>
                          <div className={`text-sm ${getDeadlineColor(task.deadline)}`}>
                            期限: {formatDate(task.deadline)} ({task.deadline})
                          </div>
                        </div>

                        <button
                          onClick={() => deleteTask(null, task.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg flex-shrink-0"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {groups.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-400">
              グループを追加してタスクを管理しましょう
            </div>
          )}

          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleGroupExpand(group.id)}
                      className="hover:bg-white hover:bg-opacity-20 rounded p-1"
                    >
                      {expandedGroups[group.id] ? (
                        <ChevronDown size={24} />
                      ) : (
                        <ChevronRight size={24} />
                      )}
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {isGroupCompleted(group) ? (
                        <CheckCircle size={24} className="text-yellow-300" />
                      ) : (
                        <Circle size={24} />
                      )}
                      <h2 className="text-xl font-bold">{group.name}</h2>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                        {group.tasks.filter(t => t.completed).length} / {group.tasks.length}
                      </span>
                      {getGroupEarliestDeadline(group) && (
                        <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                          期限: {formatDate(getGroupEarliestDeadline(group))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setShowTaskModal(true);
                      }}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-2 rounded-lg flex items-center gap-1"
                    >
                      <Plus size={18} />
                      <span className="text-sm">タスク</span>
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {expandedGroups[group.id] && (
                <div className="p-4">
                  {group.tasks.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">タスクがありません</p>
                  ) : (
                    <div className="space-y-2">
                      {getSortedTasks(group.tasks).map(task => (
                        <div
                          key={task.id}
                          className="relative overflow-hidden rounded-lg"
                        >
                          <div className="absolute inset-0 bg-green-500 flex items-center px-4">
                            <CheckCircle size={24} className="text-white" />
                            <span className="text-white font-bold ml-2">完了</span>
                          </div>
                          <div
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 relative ${
                              task.completed
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-white border-purple-200'
                            }`}
                            style={{
                              transform: getSwipeTransform(task.id),
                              transition: swipeState[task.id]?.isSwiping ? 'none' : 'transform 0.3s ease'
                            }}
                            onTouchStart={(e) => handleTouchStart(task.id, e)}
                            onTouchMove={(e) => handleTouchMove(task.id, e)}
                            onTouchEnd={() => handleTouchEnd(task.id, false, group.id)}
                          >
                            <button
                              onClick={() => toggleTask(group.id, task.id)}
                              className="flex-shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle size={24} className="text-green-500" />
                              ) : (
                                <Circle size={24} className="text-gray-400 hover:text-purple-500" />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div
                                className={`font-medium ${
                                  task.completed ? 'line-through text-gray-400' : ''
                                }`}
                              >
                                {task.name}
                              </div>
                              <div className={`text-sm ${getDeadlineColor(task.deadline)}`}>
                                期限: {formatDate(task.deadline)} ({task.deadline})
                              </div>
                            </div>

                            <button
                              onClick={() => deleteTask(group.id, task.id)}
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg flex-shrink-0"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {showGroupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">新しいグループ</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  グループ名
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="例: 仕事、プライベート"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addGroup}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-semibold"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setShowGroupModal(false);
                    setGroupName('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">新しいタスク</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タスク名
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="例: 資料作成"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  期限（未入力の場合は今日）
                </label>
                <input
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addTask}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-semibold"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setTaskName('');
                    setTaskDeadline('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-semibold"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
