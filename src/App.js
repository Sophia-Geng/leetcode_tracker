// 把这个代码复制到 src/App.js

import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [problems, setProblems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [newProblem, setNewProblem] = useState({ id: '', name: '', type: '数组', difficulty: 'Easy', notes: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importData, setImportData] = useState('');

  const types = ['数组', '哈希表', '双指针', '滑动窗口', '链表', '二叉树', 'DFS/BFS', '动态规划', '回溯', '贪心', '堆/栈', '图', '字符串', '二分查找', '其他'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  // 从localStorage加载数据
  useEffect(() => {
    const saved = localStorage.getItem('leetcode-problems');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const converted = parsed.map(p => ({
          ...p,
          reviews: p.reviews.map(r => ({ ...r, date: new Date(r.date) })),
          nextReview: p.nextReview ? new Date(p.nextReview) : null
        }));
        setProblems(converted);
      } catch (e) {
        console.error('加载数据失败', e);
      }
    }
  }, []);

  // 保存到localStorage
  useEffect(() => {
    if (problems.length > 0) {
      localStorage.setItem('leetcode-problems', JSON.stringify(problems));
    }
  }, [problems]);

  const calculateNextReview = (reviews) => {
    if (reviews.length === 0) return null;
    const lastReview = reviews[reviews.length - 1];
    const intervals = [1, 3, 7, 14, 30];
    const successCount = reviews.filter(r => r.success).length;
    const interval = intervals[Math.min(successCount, intervals.length - 1)];
    const next = new Date(lastReview.date);
    next.setDate(next.getDate() + interval);
    return next;
  };

  const getStatus = (problem) => {
    const successCount = problem.reviews.filter(r => r.success).length;
    if (successCount >= 4) return '已掌握';
    if (problem.reviews.length === 0) return '待开始';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextReview = problem.nextReview ? new Date(problem.nextReview) : null;
    if (nextReview) {
      nextReview.setHours(0, 0, 0, 0);
      if (nextReview <= today) return '需复习';
    }
    return '复习中';
  };

  const addProblem = () => {
    if (!newProblem.id || !newProblem.name) {
      alert('请填写题号和题目名称');
      return;
    }
    if (problems.find(p => p.id === parseInt(newProblem.id))) {
      alert('题目已存在！');
      return;
    }
    const problem = {
      ...newProblem,
      id: parseInt(newProblem.id),
      reviews: [],
      nextReview: null,
      createdAt: new Date()
    };
    setProblems([...problems, problem].sort((a, b) => a.id - b.id));
    setNewProblem({ id: '', name: '', type: '数组', difficulty: 'Easy', notes: '' });
    setShowAdd(false);
  };

  const recordReview = (problemId, success) => {
    setProblems(problems.map(p => {
      if (p.id === problemId) {
        if (!success) {
          return { ...p, reviews: [{ date: new Date(), success: false }], nextReview: new Date(Date.now() + 86400000) };
        }
        const newReviews = [...p.reviews, { date: new Date(), success }];
        return { ...p, reviews: newReviews, nextReview: calculateNextReview(newReviews) };
      }
      return p;
    }));
  };

  const deleteProblem = (problemId) => {
    if (window.confirm('确定删除这道题吗？')) {
      const updated = problems.filter(p => p.id !== problemId);
      setProblems(updated);
      localStorage.setItem('leetcode-problems', JSON.stringify(updated));
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(problems, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetcode-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importData);
      const converted = parsed.map(p => ({
        ...p,
        reviews: p.reviews.map(r => ({ ...r, date: new Date(r.date) })),
        nextReview: p.nextReview ? new Date(p.nextReview) : null
      }));
      setProblems(converted);
      localStorage.setItem('leetcode-problems', JSON.stringify(converted));
      setImportData('');
      setShowExport(false);
      alert('导入成功！');
    } catch (e) {
      alert('导入失败，请检查数据格式');
    }
  };

  const clearAllData = () => {
    if (window.confirm('确定清空所有数据吗？此操作不可恢复！')) {
      setProblems([]);
      localStorage.removeItem('leetcode-problems');
    }
  };

  // 统计
  const stats = {
    total: problems.length,
    mastered: problems.filter(p => getStatus(p) === '已掌握').length,
    needReview: problems.filter(p => getStatus(p) === '需复习').length,
    inProgress: problems.filter(p => getStatus(p) === '复习中').length,
    notStarted: problems.filter(p => getStatus(p) === '待开始').length,
  };

  const typeStats = types.reduce((acc, type) => {
    acc[type] = problems.filter(p => p.type === type).length;
    return acc;
  }, {});

  const filteredProblems = problems.filter(p => {
    const status = getStatus(p);
    if (filter !== 'all' && status !== filter) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    return true;
  });

  const todayProblems = problems.filter(p => getStatus(p) === '需复习');

  const getStatusStyle = (status) => {
    switch(status) {
      case '已掌握': return { background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' };
      case '需复习': return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
      case '复习中': return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
      default: return { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' };
    }
  };

  const getDifficultyColor = (diff) => {
    switch(diff) {
      case 'Easy': return '#22c55e';
      case 'Medium': return '#eab308';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '5px' }}>📚 LeetCode 复习追踪器</h1>
      <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
        基于遗忘曲线 · 间隔复习 · 本地存储
      </p>

      {/* 统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { key: 'all', label: '全部', count: stats.total, color: '#3b82f6' },
          { key: '已掌握', label: '已掌握', count: stats.mastered, color: '#22c55e' },
          { key: '需复习', label: '需复习', count: stats.needReview, color: '#ef4444' },
          { key: '复习中', label: '进行中', count: stats.inProgress, color: '#eab308' },
          { key: '待开始', label: '待开始', count: stats.notStarted, color: '#6b7280' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            style={{
              padding: '15px 10px',
              background: 'white',
              border: filter === item.key ? `3px solid ${item.color}` : '1px solid #e5e7eb',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: item.color }}>{item.count}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.label}</div>
          </button>
        ))}
      </div>

      {/* 今日任务 */}
      {todayProblems.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '15px', marginBottom: '20px' }}>
          <h3 style={{ color: '#991b1b', marginTop: 0, marginBottom: '10px' }}>🔥 今日待复习 ({todayProblems.length}题)</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {todayProblems.map(p => (
              <span key={p.id} style={{ background: '#fee2e2', padding: '4px 10px', borderRadius: '5px', fontSize: '13px' }}>
                #{p.id} {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 类型筛选 */}
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
      >
        <option value="all">所有类型</option>
        {types.map(t => (
          <option key={t} value={t}>{t} ({typeStats[t] || 0}题)</option>
        ))}
      </select>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          {showAdd ? '取消' : '+ 添加新题目'}
        </button>
        <button
          onClick={() => setShowExport(!showExport)}
          style={{ padding: '12px 20px', background: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          📦 备份/导入
        </button>
      </div>

      {/* 备份导入 */}
      {showExport && (
        <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ marginTop: 0 }}>数据备份与恢复</h4>
          <button onClick={exportData} style={{ width: '100%', padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '10px', cursor: 'pointer' }}>
            📥 导出JSON文件
          </button>
          <textarea
            placeholder="粘贴之前导出的JSON数据..."
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px', minHeight: '80px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <button onClick={handleImport} style={{ width: '100%', padding: '10px', background: '#f97316', color: 'white', border: 'none', borderRadius: '5px', marginBottom: '10px', cursor: 'pointer' }}>
            📤 导入数据
          </button>
          <button onClick={clearAllData} style={{ width: '100%', padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            🗑️ 清空所有数据
          </button>
        </div>
      )}

      {/* 添加表单 */}
      {showAdd && (
        <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
            <input
              type="number"
              placeholder="题号"
              value={newProblem.id}
              onChange={(e) => setNewProblem({...newProblem, id: e.target.value})}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px' }}
            />
            <input
              type="text"
              placeholder="题目名称 (如: Two Sum)"
              value={newProblem.name}
              onChange={(e) => setNewProblem({...newProblem, name: e.target.value})}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <select
              value={newProblem.type}
              onChange={(e) => setNewProblem({...newProblem, type: e.target.value})}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px' }}
            >
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={newProblem.difficulty}
              onChange={(e) => setNewProblem({...newProblem, difficulty: e.target.value})}
              style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px' }}
            >
              {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <input
            type="text"
            placeholder="思路笔记 (可选，如: 哈希表，O(n))"
            value={newProblem.notes}
            onChange={(e) => setNewProblem({...newProblem, notes: e.target.value})}
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '5px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <button
            onClick={addProblem}
            style={{ width: '100%', padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
          >
            添加题目
          </button>
        </div>
      )}

      {/* 筛选提示 */}
      {(filter !== 'all' || typeFilter !== 'all') && (
        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
          当前筛选: {filter !== 'all' ? filter : ''} {typeFilter !== 'all' ? typeFilter : ''} - 共 {filteredProblems.length} 题
          <button 
            onClick={() => { setFilter('all'); setTypeFilter('all'); }} 
            style={{ marginLeft: '10px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            清除筛选
          </button>
        </div>
      )}

      {/* 题目列表 */}
      <div>
        {filteredProblems.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
            {problems.length === 0 ? '还没有添加题目，点击上方"添加新题目"开始' : '没有符合条件的题目'}
          </div>
        ) : (
          filteredProblems.map(problem => {
            const status = getStatus(problem);
            const successCount = problem.reviews.filter(r => r.success).length;
            const statusStyle = getStatusStyle(status);
            return (
              <div 
                key={problem.id} 
                style={{ 
                  background: 'white', 
                  padding: '15px', 
                  borderRadius: '10px', 
                  marginBottom: '10px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${getDifficultyColor(problem.difficulty)}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>#{problem.id}</span>
                    <span style={{ marginLeft: '8px' }}>{problem.name}</span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: getDifficultyColor(problem.difficulty) }}>
                      {problem.difficulty}
                    </span>
                  </div>
                  <span style={{ ...statusStyle, padding: '3px 10px', borderRadius: '5px', fontSize: '12px' }}>
                    {status}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                  <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{problem.type}</span>
                  <span>进度: {successCount}/4 ✅</span>
                </div>

                {problem.notes && (
                  <div style={{ fontSize: '12px', color: '#4b5563', background: '#f9fafb', padding: '8px', borderRadius: '5px', marginBottom: '8px' }}>
                    💡 {problem.notes}
                  </div>
                )}

                {/* 进度条 */}
                <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '10px', height: '6px', marginBottom: '10px' }}>
                  <div style={{ width: `${(successCount/4)*100}%`, background: '#22c55e', height: '6px', borderRadius: '10px', transition: 'width 0.3s' }}></div>
                </div>

                {/* 操作按钮 */}
                {status !== '已掌握' ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => recordReview(problem.id, true)}
                      style={{ flex: 1, padding: '10px', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      ✅ 做对了
                    </button>
                    <button
                      onClick={() => recordReview(problem.id, false)}
                      style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      ❌ 做错了(重置)
                    </button>
                    <button
                      onClick={() => deleteProblem(problem.id)}
                      style={{ padding: '10px 15px', background: '#f3f4f6', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#22c55e', fontSize: '14px' }}>🎉 已掌握！</span>
                    <button
                      onClick={() => deleteProblem(problem.id)}
                      style={{ padding: '8px 15px', background: '#f3f4f6', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      🗑️ 删除
                    </button>
                  </div>
                )}

                {problem.nextReview && status !== '已掌握' && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                    下次复习: {new Date(problem.nextReview).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 使用说明 */}
      <div style={{ marginTop: '30px', background: '#eff6ff', padding: '15px', borderRadius: '10px', fontSize: '13px' }}>
        <h4 style={{ color: '#1e40af', marginTop: 0 }}>📖 使用说明</h4>
        <ul style={{ color: '#1e40af', paddingLeft: '20px', margin: 0 }}>
          <li>点击顶部数字可筛选不同状态的题目</li>
          <li>复习间隔: 1天 → 3天 → 7天 → 14天 → 掌握</li>
          <li>点"做错了"会重置进度，需要重新开始</li>
          <li>数据保存在浏览器本地，建议定期导出备份</li>
          <li>换电脑或清除浏览器数据会丢失，记得导出！</li>
        </ul>
      </div>
    </div>
  );
}

export default App;